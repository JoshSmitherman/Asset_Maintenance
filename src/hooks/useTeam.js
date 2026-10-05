import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Everyone with an account, for "who fixed it" and "who wiped it". Read from
 * public.team_members(), which only signed-in people can call.
 *
 * Until setup.sql has been run the function does not exist; the list then
 * falls back to just the signed-in person, so the forms still work.
 */
export function useTeam() {
  const { user } = useAuth();
  const [team, setTeam] = useState(() => (user ? [{ id: user.id, email: user.email }] : []));

  useEffect(() => {
    if (!supabase || !user) return undefined;
    let active = true;
    supabase.rpc('team_members').then(({ data, error }) => {
      if (!active) return;
      if (error || !Array.isArray(data) || data.length === 0) {
        setTeam([{ id: user.id, email: user.email }]);
      } else {
        setTeam(data);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  return team;
}
