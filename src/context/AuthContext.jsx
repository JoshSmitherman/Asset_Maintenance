import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

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
      .then(({ data }) => {
        if (active) setSession(data.session ?? null);
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

  // Admin or user, from public.user_roles. Read on every sign-in; an account
  // with no row (or a database without the table yet) is a plain user.
  const [role, setRole] = useState('user');
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) {
      setRole('user');
      return undefined;
    }
    let active = true;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setRole(data?.role === 'admin' ? 'admin' : 'user');
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  /** Changes the signed-in user's own password. The current session already
   *  proves who they are, so - unlike signing in - no current password is
   *  required; Supabase authorises the change against the active session. */
  const changePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      userEmail: session?.user?.email ?? '',
      isAdmin: role === 'admin',
      initialising,
      signIn,
      signOut,
      changePassword
    }),
    [session, role, initialising, signIn, signOut, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
