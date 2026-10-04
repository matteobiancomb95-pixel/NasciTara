import { describe, expect, it, vi } from 'vitest';
import { appendRow, parseAccount, sendMail, type Fields } from '../../supabase/functions/submit-feedback/delivery';
import { definitelyRejected, deliver, feedbackFields, parseFeedback } from '../../supabase/functions/submit-feedback/workflow';
const input = { kind: 'review', stars: 5, text: 'Ottima app', contact: false, version: '0.8.0', platform: 'desktop' };
const fields: Fields = feedbackFields(parseFeedback(input)!, {email:'qa@example.com'}, 'u_test', '2026-10-02T00:00:00Z');
const env = (k: string) => ({BREVO_API_KEY:'test-api-key',BREVO_SENDER_EMAIL:'qa@example.com'}[k]);
describe('feedback validation and privacy', () => {
  it.each([null, {}, {...input,text:'  '},{...input,text:'x'.repeat(2001)},{...input,stars:2.5},{...input,stars:'5'},{...input,stars:0},{...input,stars:6},{...input,kind:'other'},{...input,contact:'true'}])('rejects invalid payload %j', p => expect(parseFeedback(p)).toBeNull());
  it('ideas need no stars; trims whitespace without modifying the text',()=>expect(parseFeedback({...input,kind:'idea',stars:null,text:'  Idea nuova  '})).toMatchObject({stars:null,text:'Idea nuova'}));
  it('always records the author email, and whether they want to be contacted',()=>{expect(fields.email).toBe('qa@example.com');expect(fields.contact).toBe('no');expect(Object.keys(fields)).toHaveLength(9);const yes=feedbackFields(parseFeedback({...input,contact:true})!,{email:'qa@example.com'},'u_test','now');expect(yes.email).toBe('qa@example.com');expect(yes.contact).toBe('sì');});
  it.each([JSON.stringify({private_key:'a\\nb',client_email:'a'}),JSON.stringify(JSON.stringify({private_key:'a\\nb',client_email:'a'})),btoa(JSON.stringify({private_key:'a\\nb',client_email:'a'}))])('accepts supported account encoding',s=>expect(parseAccount(s).private_key).toBe('a\nb'));
  it.each(['null','[]','broken'])('rejects invalid account %s',s=>expect(()=>parseAccount(s)).toThrow());
});
describe('delivery integration: channel failures',()=>{
  it.each([['ok','ok'],['ok','sheet_403_PERMISSION_DENIED'],['brevo_401','ok']])('succeeds only when at least one channel confirms (%s, %s)',async(mail,sheet)=>{
    const release=vi.fn();expect((await deliver(fields,{mail:async()=>mail,sheet:async()=>sheet},release)).status).toBe('ok');expect(release).not.toHaveBeenCalled();
  });
  it('releases only its failed reservation when both channels reject',async()=>{const release=vi.fn();const r=await deliver(fields,{mail:async()=> 'brevo_401',sheet:async()=> 'sheet_403_PERMISSION_DENIED'},release);expect(r.status).toBe('unavailable');expect(release).toHaveBeenCalledOnce();});
  it('retains a short guard on ambiguous network failures, avoiding blind duplicate writes',async()=>{const release=vi.fn();await deliver(fields,{mail:async()=>{throw Error('network')},sheet:async()=> 'sheet_unreachable'},release);expect(release).not.toHaveBeenCalled();});
  it('one throwing channel does not hide the success of the other',async()=>expect((await deliver(fields,{mail:async()=>{throw Error('network')},sheet:async()=> 'ok'},vi.fn())).status).toBe('ok'));
  it.each(['brevo_unknown','sheet_unknown','brevo_500','google_auth_failed'])('treats %s as uncertain',x=>expect(definitelyRejected(x)).toBe(false));
});
describe('provider contracts',()=>{
  it('does not call Brevo when unconfigured',async()=>{const fetcher=vi.fn();expect(await sendMail(fields,()=>undefined,fetcher)).toBe('not_configured');expect(fetcher).not.toHaveBeenCalled();});
  it.each([[401,{},'brevo_401'],[201,{messageId:'<test>'},'ok'],[201,{},'brevo_unknown']])('checks Brevo acceptance %s',async(status,body,wanted)=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(body),{status:status as number}));expect(await sendMail(fields,env,fetcher)).toBe(wanted);
    const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.replyTo).toBeUndefined();expect(payload.textContent).toContain('Email: qa@example.com · ricontatto: no');
  });
  it('does not attempt Sheets with malformed credentials',async()=>expect(await appendRow([],()=> 'broken',vi.fn())).toBe('google_json_invalid'));
  it('handles provider network failure',async()=>expect(await sendMail(fields,env,vi.fn().mockRejectedValue(Error('offline')))).toBe('brevo_unreachable'));
});

describe('Google Sheets JWT and append contract',()=>{
  it.each([[200,{updates:{updatedRows:1}},'ok'],[403,{error:{status:'PERMISSION_DENIED'}},'sheet_403_PERMISSION_DENIED'],[200,{},'sheet_unknown']])('checks write acknowledgement %s',async(status,body,wanted)=>{
    const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
    const raw=await crypto.subtle.exportKey('pkcs8',keys.privateKey);
    const account=JSON.stringify({client_email:'qa@project.iam.gserviceaccount.com',private_key:`-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...new Uint8Array(raw)))}\n-----END PRIVATE KEY-----`});
    const e=(k:string)=>({GOOGLE_SERVICE_ACCOUNT_JSON:account,FEEDBACK_SHEET_ID:'https://docs.google.com/spreadsheets/d/example_id/edit',FEEDBACK_SHEET_RANGE:"'La tua voce'!A:I"}[k]);
    const f=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({access_token:'fake-token'}))).mockResolvedValueOnce(new Response(JSON.stringify(body),{status:status as number}));
    const row=['now','u_qa','recensione',5,'=IMPORTXML("bad")','no','','0.8','desktop'];
    expect(await appendRow(row,e,f)).toBe(wanted);
    expect(f.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
    const assertion=f.mock.calls[0][1].body.get('assertion');
    const claims=JSON.parse(atob(assertion.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    expect(claims.scope).toBe('https://www.googleapis.com/auth/spreadsheets');
    expect(f.mock.calls[1][0]).toContain('/example_id/values/');
    expect(f.mock.calls[1][0]).toContain('valueInputOption=RAW');
    expect(JSON.parse(f.mock.calls[1][1].body).values).toEqual([row]);
  });
});
