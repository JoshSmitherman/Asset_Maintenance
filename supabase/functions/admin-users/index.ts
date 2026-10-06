// admin-users: the password side of the Admin page.
//
// Who may use Orbit, their department and access level live in the
// public.members table, which admins change directly (row-level security
// lets only them). Microsoft sign-in needs nothing more. This function is
// only for the few people who sign in with an email and password instead:
// creating or resetting that password, and removing the sign-in, need
// Supabase's service-role key, which must never reach a browser.
//
// It checks, every time, that the caller is an active admin on the members
// list, and only then acts.
//
// Deploy: Supabase Dashboard -> Edge Functions -> admin-users (or "Deploy a
// new function" -> Via editor, name it "admin-users") -> paste this file ->
// Deploy. Or, with the Supabase CLI: supabase functions deploy admin-users.
//
// Every request is a POST with a JSON body { action, ... }:
//   set_password  { email, password } -> creates their sign-in if they have
//                                        none, else changes the password and
//                                        signs them out everywhere
//   remove_login  { email }           -> deletes their sign-in account (their
//                                        access is removed on the members list)

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const MIN_PASSWORD = 8;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
    return fail(500, 'Something went wrong. Try again.');
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
  if (whoError || !who?.user?.email) return fail(401, 'Sign in again.');
  const callerEmail = who.user.email.toLowerCase();

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: caller } = await admin
    .from('members')
    .select('access, active')
    .eq('email', callerEmail)
    .maybeSingle();
  if (caller?.access !== 'admin' || !caller.active) return fail(403, 'Only admins can manage sign-ins.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Send a JSON body.');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email)) return fail(400, 'Enter a valid email address.');

  // Only people already given access may have a sign-in made for them.
  const { data: member } = await admin.from('members').select('email').eq('email', email).maybeSingle();
  if (!member) return fail(404, `${email} has not been given access yet. Add them first.`);

  const existing = await findUser(admin, email);

  switch (body.action) {
    case 'set_password': {
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < MIN_PASSWORD) {
        return fail(400, `The password must be at least ${MIN_PASSWORD} characters.`);
      }
      if (!existing) {
        const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) {
          console.error(error);
          return fail(400, /company accounts|database error/i.test(error.message)
            ? 'Only company email addresses can have a sign-in.'
            : 'Could not create the sign-in. Check the address and try again.');
        }
        return reply(200, { created: true });
      }
      const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
      if (error) {
        console.error(error);
        return fail(400, 'Could not change the password. Try a longer one.');
      }
      // A reset is often because a laptop went missing: end every session.
      const { error: revokeError } = await admin.rpc('revoke_sessions', { p_user_id: existing.id });
      if (revokeError) console.error(revokeError);
      return reply(200, { created: false });
    }

    case 'remove_login': {
      if (email === callerEmail) return fail(409, 'You cannot remove your own sign-in.');
      if (!existing) return reply(200, { removed: false });
      const { error } = await admin.auth.admin.deleteUser(existing.id);
      if (error) {
        console.error(error);
        return fail(400, 'Could not remove the sign-in. Try again.');
      }
      return reply(200, { removed: true });
    }

    default:
      return fail(400, 'Unknown action.');
  }
}

/** The sign-in account for an email, if there is one. */
async function findUser(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}
