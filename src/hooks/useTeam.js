import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * The people who work on kit - members who can edit - for "cleaned by",
 * "fixed by" and "wiped by". Read from public.team_members(). Each has an
 * id once they have signed in at least once.
 *
 * If the list cannot be read, it falls back to just the signed-in person, so
 * the forms still work.
 */
export function useTeam() {
  const { user, userName } = useAuth();
  const me = user ? { id: user.id, email: user.email, full_name: userName || null } : null;
  const [team, setTeam] = useState(() => (me ? [me] : []));

  useEffect(() => {
    if (!supabase || !user) return undefined;
    let active = true;
    supabase.rpc('team_members').then(({ data, error }) => {
      if (!active) return;
      if (error || !Array.isArray(data) || data.length === 0) {
        setTeam([{ id: user.id, email: user.email, full_name: userName || null }]);
      } else {
        setTeam(data);
      }
    });
    return () => {
      active = false;
    };
  }, [user, userName]);

  return team;
}
