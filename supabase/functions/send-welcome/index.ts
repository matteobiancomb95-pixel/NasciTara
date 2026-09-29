import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { mailOutcome, welcomeMessage } from "../_shared/mail.ts";
const origins = new Set(['https://nascitara.tech','https://www.nascitara.tech','https://nascitara.vercel.app','http://localhost:5173','http://127.0.0.1:5173']);
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'https://nascitara.tech', 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods':'POST,OPTIONS', Vary:'Origin' };
  const response = (status:string, code=200) => new Response(JSON.stringify({status}),{status:code,headers});
  if (origin && !origins.has(origin)) return response('forbidden',403);
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (req.method!=='POST') return response('method_not_allowed',405);
  try {
    const bearer = req.headers.get('authorization') ?? '';
    if (!bearer.startsWith('Bearer ')) return response('unauthorized',401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const client = createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:bearer}},auth:{persistSession:false}});
    const {data:{user},error} = await client.auth.getUser();
    if (error || !user?.email || !user.email_confirmed_at || user.user_metadata?.welcome_requested!==true || !user.user_metadata?.consent_version) return response('unauthorized',401);
    const key = Deno.env.get('BREVO_API_KEY'), sender = Deno.env.get('BREVO_SENDER_EMAIL');
    if (!key || !sender) return response('not_configured',503);
    const admin = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data:reservation,error:reserveError} = await admin.rpc('reserve_account_welcome',{p_owner:user.id});
    if (reserveError) return response('unavailable',503);
    if (reservation!=='reserved') return response(reservation);
    let status: 'accepted'|'failed'|'unknown' = 'unknown';
    let providerId: string|null = null;
    try {
      const result = await fetch('https://api.brevo.com/v3/smtp/email',{
        method:'POST',headers:{'api-key':key,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
        body:JSON.stringify({sender:{name:'NasciTara',email:sender},to:[{email:user.email}],replyTo:{name:'NasciTara',email:Deno.env.get('BREVO_REPLY_TO_EMAIL') || sender},...welcomeMessage(user.user_metadata.lang)}),
      });
      const data = await result.json().catch(()=>({}));
      providerId = typeof data.messageId==='string' ? data.messageId.slice(0,250) : null;
      status = mailOutcome(result.status,providerId);
    } catch { /* Unknown acceptance: never automatically duplicate. */ }
    const {error:updateError} = await admin.from('account_welcome_deliveries').update({status,provider_id:providerId}).eq('owner_id',user.id);
    return response(updateError ? 'unknown' : status);
  } catch { return response('unavailable',503); }
});
