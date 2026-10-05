// admin-users: the Admin page's back end.
//
// Creating, removing and resetting accounts needs Supabase's service-role
// key, which must never reach a browser. This function holds it (Supabase
// provides SUPABASE_SERVICE_ROLE_KEY to every Edge Function automatically),
// checks that whoever called it is an admin in public.user_roles, and only
// then acts.
//
// Deploy: Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via editor, name it "admin-users", paste this file, Deploy. Or, with the
// Supabase CLI: supabase functions deploy admin-users. See README.md.
//
// Every request is a POST with a JSON body { action, ... }:
//   list                                   -> { users: [...] }
//   create        { email, password, role } -> { user }
//   set_role      { user_id, role }
//   reset_password { user_id, password }
//   remove        { user_id }

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const ROLES = ['admin', 'user'];
const MIN_PASSWORD = 8;

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

const fail = (status: number, error: string) => reply(status, { error });

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (caught) {
    console.error(caught);
    return fail(500, 'Something went wrong managing accounts. Try again.');
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'Use POST.');

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Who is asking: the caller's own session, checked by Supabase.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: who, error: whoError } = await asCaller.auth.getUser();
  if (whoError || !who?.user) return fail(401, 'Sign in again.');
  const callerId = who.user.id;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: callerRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .maybeSingle();
  if (callerRole?.role !== 'admin') return fail(403, 'Only admins can manage accounts.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Send a JSON body.');
  }

  const adminCount = async () => {
    const { count } = await admin
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'admin');
    return count ?? 0;
  };

  const isLastAdmin = async (userId: string) => {
    const { data } = await admin.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
    return data?.role === 'admin' && (await adminCount()) <= 1;
  };

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const userId = typeof body.user_id === 'string' && UUID.test(body.user_id) ? body.user_id : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const role = typeof body.role === 'string' ? body.role : 'user';

  switch (body.action) {
    case 'list': {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) return fail(500, error.message);
      const { data: roles } = await admin.from('user_roles').select('user_id, role');
      const roleOf = new Map((roles ?? []).map((row) => [row.user_id, row.role]));
      const users = data.users
        .map((user) => ({
          id: user.id,
          email: user.email ?? '',
          role: roleOf.get(user.id) ?? 'user',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at ?? null,
          is_you: user.id === callerId
        }))
        .sort((a, b) => a.email.localeCompare(b.email));
      return reply(200, { users });
    }

    case 'create': {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, 'Enter a valid email address.');
      if (password.length < MIN_PASSWORD) {
        return fail(400, `The password must be at least ${MIN_PASSWORD} characters.`);
      }
      if (!ROLES.includes(role)) return fail(400, 'Role must be admin or user.');

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        // Admin-made accounts are trusted: no confirmation email to wait for.
        email_confirm: true
      });
      if (error) {
        const taken = /already|registered|exists/i.test(error.message);
        return fail(taken ? 409 : 400, taken ? `${email} already has an account.` : error.message);
      }
      const { error: roleError } = await admin
        .from('user_roles')
        .upsert({ user_id: data.user.id, role }, { onConflict: 'user_id' });
      if (roleError) return fail(500, roleError.message);
      return reply(200, { user: { id: data.user.id, email, role } });
    }

    case 'set_role': {
      if (!userId) return fail(400, 'Which account?');
      if (!ROLES.includes(role)) return fail(400, 'Role must be admin or user.');
      if (role === 'user' && (await isLastAdmin(userId))) {
        return fail(409, 'There must always be at least one admin.');
      }
      const { error } = await admin
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id' });
      if (error) return fail(500, error.message);
      return reply(200, { ok: true });
    }

    case 'reset_password': {
      if (!userId) return fail(400, 'Which account?');
      if (password.length < MIN_PASSWORD) {
        return fail(400, `The password must be at least ${MIN_PASSWORD} characters.`);
      }
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return fail(400, error.message);
      return reply(200, { ok: true });
    }

    case 'remove': {
      if (!userId) return fail(400, 'Which account?');
      if (userId === callerId) return fail(409, 'You cannot remove your own account.');
      if (await isLastAdmin(userId)) return fail(409, 'There must always be at least one admin.');
      // The role row goes with the account (on delete cascade). Assets they
      // edited keep their history: updated_by is set to null, emails stay.
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return fail(400, error.message);
      return reply(200, { ok: true });
    }

    default:
      return fail(400, 'Unknown action.');
  }
}
