import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { canEditWith } from '../lib/access';
import { forgetActivity, isIdleExpired, rememberSignOutReason } from '../lib/idle';

const AuthContext = createContext(null);

/**
 * The signed-in session, and what that person may do in Orbit.
 *
 * Signing in proves who someone is; the members list (supabase/setup.sql,
 * section 4b) says whether they may use Orbit at all and at what level. A
 * company account that is not on it gets the "ask for access" page.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setInitialising(false);
      return undefined;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        let current = data.session ?? null;
        // Back after a long break (a laptop opened in the morning): the
        // session would still be valid, but nobody has used Orbit for longer
        // than the idle limit, so sign out before showing anything.
        if (current && isIdleExpired()) {
          rememberSignOutReason('idle');
          forgetActivity();
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          current = null;
        }
        if (active) setSession(current);
      })
      .finally(() => {
        if (active) setInitialising(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // { status: 'loading' | 'member' | 'none' | 'error', access, department, fullName, requested, error }
  const [membership, setMembership] = useState({ status: 'loading' });
  const email = session?.user?.email?.toLowerCase() ?? '';

  // Only the latest check may update the screen (a sign-in and a manual
  // "Check again" can overlap).
  const latestCheck = useRef(0);

  const loadMembership = useCallback(async () => {
    const ticket = latestCheck.current + 1;
    latestCheck.current = ticket;
    if (!supabase || !session) {
      setMembership({ status: 'loading' });
      return;
    }
    if (!email) {
      // A sign-in with no email address cannot be matched to anyone.
      setMembership({ status: 'none', requested: false, inactive: false });
      return;
    }
    const [member, request] = await Promise.all([
      supabase.from('members').select('access, department, full_name, active').eq('email', email).maybeSingle(),
      supabase.from('access_requests').select('requested_at').eq('email', email).maybeSingle()
    ]);
    if (ticket !== latestCheck.current) return;
    if (member.error) {
      setMembership({ status: 'error', error: member.error });
      return;
    }
    const row = member.data;
    if (!row || !row.active) {
      setMembership({ status: 'none', requested: Boolean(request.data), inactive: Boolean(row && !row.active) });
      return;
    }
    setMembership({
      status: 'member',
      access: row.access,
      department: row.department,
      fullName: row.full_name
    });
  }, [email, session]);

  useEffect(() => {
    loadMembership();
  }, [loadMembership]);

  const signIn = useCallback(async (address, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: address.trim(),
      password
    });
    if (error) throw error;
  }, []);

  /** Microsoft 365 sign-in. Leaves the page, and comes back signed in. */
  const signInWithMicrosoft = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile',
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`
      }
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  /** Signs this browser out after too long with nothing done. */
  const signOutForIdle = useCallback(async () => {
    rememberSignOutReason('idle');
    forgetActivity();
    // This browser only: someone idle here may be busy on another computer.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setSession(null);
  }, []);

  /** Changes the signed-in user's own password. The current session already
   *  proves who they are, so - unlike signing in - no current password is
   *  required; Supabase authorises the change against the active session. */
  const changePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const requestAccess = useCallback(async (fullName) => {
    const { error } = await supabase.rpc('request_access', { p_full_name: fullName ?? null });
    if (error) throw error;
    await loadMembership();
  }, [loadMembership]);

  const user = session?.user ?? null;
  // Microsoft sign-in has no password to change.
  const hasPassword = (user?.app_metadata?.providers ?? [user?.app_metadata?.provider]).includes('email');

  const value = useMemo(
    () => ({
      session,
      user,
      userEmail: user?.email ?? '',
      userName:
        membership.fullName || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
      membership,
      access: membership.access ?? null,
      department: membership.department ?? null,
      isAdmin: membership.access === 'admin',
      canEdit: canEditWith(membership.access),
      hasPassword,
      initialising,
      signIn,
      signInWithMicrosoft,
      signOut,
      signOutForIdle,
      changePassword,
      requestAccess,
      refreshMembership: loadMembership
    }),
    [session, user, membership, hasPassword, initialising, signIn, signInWithMicrosoft, signOut, signOutForIdle, changePassword, requestAccess, loadMembership]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
