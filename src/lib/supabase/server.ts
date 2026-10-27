import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { hasSupabase } from '@/lib/env';
export async function supabase() {
  if (!hasSupabase()) throw new Error('NOT_CONFIGURED');
  const store=await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
    cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
    cookies:{getAll:()=>store.getAll(),setAll:(items)=>{try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Server Components rely on proxy refresh. */}}},
  });
}
export function supabaseAdmin() {
  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('NOT_CONFIGURED');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
