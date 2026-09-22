import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc=vi.hoisted(()=>vi.fn(async()=>({error:null})));
vi.mock('../lib/supabaseClient',()=>({supabase:{rpc}}));
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
describe('usage collection',()=>{
 beforeEach(()=>{vi.resetModules();rpc.mockClear();});
 it('sends nothing without opt-in',async()=>{
  const t=await import('../lib/usageTracking');t.trackUsage('dashboard');await flush();expect(rpc).not.toHaveBeenCalled();
 });
 it('orders session creation, identification and steps; sends no clinical payload',async()=>{
  const t=await import('../lib/usageTracking');t.setUsageConsent(true);t.trackUsage('identify',' Demo@Example.com ');t.trackUsage('measurements');await flush();
  expect(rpc.mock.calls.map((c:any)=>c[1].p_action)).toEqual(['start','identify','measurements']);
  const args=(rpc.mock.calls as any)[1][1];expect(args.p_email).toBe('demo@example.com');
  expect(Object.keys(args).sort()).toEqual(['p_action','p_email','p_id','p_release','p_secret']);
 });
 it('starts a separate session if the declared email changes',async()=>{
  const t=await import('../lib/usageTracking');t.setUsageConsent(true);t.trackUsage('identify','first@example.com');await flush();
  const first=(rpc.mock.calls as any)[0][1].p_id;rpc.mockClear();
  t.trackUsage('identify','second@example.com');await flush();
  expect(rpc.mock.calls.map((c:any)=>c[1].p_action)).toEqual(['start','identify']);
  expect((rpc.mock.calls as any)[0][1].p_id).not.toBe(first);
 });
 it('stops on withdrawal and does not send queued events',async()=>{
  const t=await import('../lib/usageTracking');t.setUsageConsent(true);await flush();rpc.mockClear();t.trackUsage('pregnancy');t.setUsageConsent(false);await flush();expect(rpc).not.toHaveBeenCalled();
 });
 it('an unavailable tracker never rejects the calculation flow',async()=>{
  rpc.mockRejectedValueOnce(new Error('offline'));
  const t=await import('../lib/usageTracking');t.setUsageConsent(true);await flush();t.trackUsage('pregnancy');await flush();expect(rpc).toHaveBeenCalledTimes(2);
 });
});
