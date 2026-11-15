// Grant the admin role to the account in ADMIN_EMAIL / ADMIN_PASSWORD (.env.local), creating it
// or resetting its password to ADMIN_PASSWORD.
//   npm run admin:grant                         # account from .env.local
//   npm run admin:grant -- other@example.com    # another existing account (password from env if set)
// Uses SUPABASE_SERVICE_ROLE_KEY. The password never comes from argv, so it stays out of shell history.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());

const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Set ADMIN_EMAIL in .env.local or run: npm run admin:grant -- <email>');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}
// The env password belongs to ADMIN_EMAIL only: never reset another account's password with it.
const password =
  email === (process.env.ADMIN_EMAIL || '').trim().toLowerCase() ? process.env.ADMIN_PASSWORD : undefined;
if (password !== undefined && password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser() {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((user) => user.email?.toLowerCase() === email);
    if (hit || data.users.length < 200) return hit ?? null;
  }
  return null;
}

let user = await findUser();
if (!user) {
  if (!password) {
    console.error('No account with that email. Set ADMIN_PASSWORD to create it.');
    process.exit(1);
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email.split('@')[0] },
  });
  if (error) throw error;
  user = data.user;
  console.log('Created account', user.id);
} else if (password) {
  const { error } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
  console.log('Password updated for', user.id);
}
const { error } = await db
  .from('user_roles')
  .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' });
if (error) throw error;
console.log(`Admin role granted to ${email} (${user.id}). Sign in again to refresh the session.`);
