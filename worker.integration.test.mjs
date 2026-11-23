import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import worker from '../src/worker.js';

function setup(){
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync('migrations/0001_init.sql','utf8'));
 db.exec(readFileSync('migrations/0002_source_review.sql','utf8'));
 db.exec(readFileSync('migrations/0003_payhip_one_time.sql','utf8'));
 db.exec(readFileSync('data/seed.sql','utf8'));
 db.exec(readFileSync('data/uk_teaching_seed.sql','utf8'));
 if(existsSync('data/source_archive_seed.sql'))db.exec(readFileSync('data/source_archive_seed.sql','utf8'));
 const wrapper={
  prepare(sql){const stmt=db.prepare(sql);const params=[];const p={bind(...xs){params.splice(0,params.length,...xs);return p;},first(){return stmt.get(...params)||null;},all(){return {results:stmt.all(...params)};},run(){return stmt.run(...params);}};return p;},
  batch(commands){db.exec('BEGIN');try{const x=commands.map(c=>c.run());db.exec('COMMIT');return x;}catch(e){db.exec('ROLLBACK');throw e;}}
 };
 const env={DB:wrapper,SITE_NAME:'PaediaSprint',MONTHLY_PRICE_AED:'79',YEARLY_PRICE_AED:'499',ADMIN_EMAIL:'admin@test.example',RESEND_API_KEY:'re_test',EMAIL_FROM:'PaediaSprint <noreply@test.example>',PUBLIC_BASE_URL:'https://paediasprint.test',STRIPE_SECRET_KEY:'sk_test_mock',STRIPE_WEBHOOK_SECRET:'whsec_mock',STRIPE_PRICE_MONTHLY:'price_monthly',STRIPE_PRICE_YEARLY:'price_yearly',ASSETS:{fetch:async()=>new Response('asset',{status:200})}};
 let sentEmail=null;
 const prior=globalThis.fetch;
 globalThis.fetch=async (url,options)=>{
  if(String(url).includes('api.resend.com')){sentEmail=JSON.parse(options.body);return new Response(JSON.stringify({id:'email_test'}),{status:200});}
  if(String(url).includes('api.stripe.com')){
   if(String(url).includes('/subscriptions/'))return new Response(JSON.stringify({id:'sub_mock',customer:'cus_mock',status:'active',metadata:{user_id:'manual'},current_period_end:Math.floor(Date.now()/1000)+2592000,items:{data:[{price:{id:'price_monthly'}}]}}),{status:200});
   return new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/test123'}),{status:200});
  }
  return prior(url,options);
 };
 function request(path,method='GET',body=null,cookie='') {const headers={};if(body!==null)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;return new Request(`https://paediasprint.test${path}`,{method,headers,body:body!==null?JSON.stringify(body):undefined});}
 async function call(path,method='GET',body=null,cookie=''){const res=await worker.fetch(request(path,method,body,cookie),env);return {status:res.status,json:await res.json(),cookie:res.headers.get('set-cookie')};}
 return {env,db,call,mail:()=>sentEmail,restore:()=>{globalThis.fetch=prior;db.close();}};
}
async function registerAndLogin(t,email){
 const reg=await t.call('/api/auth/register','POST',{email,password:'strongPassword123'});assert.equal(reg.status,201);
 const msg=t.mail()?.html||'';const match=msg.match(/\?verify=([a-f0-9]{64})/);assert.ok(match,'verification email should contain link');
 const verify=await t.call('/api/auth/verify','POST',{token:match[1]});assert.equal(verify.status,200);
 const login=await t.call('/api/auth/login','POST',{email,password:'strongPassword123'});assert.equal(login.status,200);
 assert.match(login.cookie||'',/HttpOnly/);
 return login.cookie.split(';')[0];
}
test('Worker API: sample access, verified login, progress, premium gate, webhook and deletion controls',async()=>{
 const t=setup();try{
  const health=await t.call('/api/health');assert.equal(health.status,200);
  const config=await t.call('/api/config');assert.deepEqual(config.json.counts.map(x=>[x.exam,x.count]),[['AKP',30],['FOP',30],['TAS',30]]);
  const anonymous=await t.call('/api/questions?exam=FOP&limit=10');assert.equal(anonymous.status,200);assert.equal(anonymous.json.questions.length,5);assert.equal(anonymous.json.questions[0].answer,undefined);
  const paidId='fop-006';const premiumAnonymous=await t.call('/api/questions/answer','POST',{question_id:paidId,answer:0});assert.equal(premiumAnonymous.status,403);
  const freeId=anonymous.json.questions[0].id;const freeAnswer=await t.call('/api/questions/answer','POST',{question_id:freeId,answer:0});assert.equal(freeAnswer.status,200);assert.ok(freeAnswer.json.explanation.length>25);
  const cookie=await registerAndLogin(t,'student@test.example');
  const me=await t.call('/api/me','GET',null,cookie);assert.equal(me.json.authenticated,true);assert.equal(me.json.is_premium,false);
  const closedCheckout=await t.call('/api/billing/checkout','POST',{plan:'monthly'},cookie);assert.equal(closedCheckout.status,503,'checkout must remain closed before legal/merchant activation');
  t.env.SALES_ENABLED='true';t.env.EDITORIAL_APPROVED='true';t.env.CONTENT_RIGHTS_CONFIRMED='true';t.env.BUSINESS_LEGAL_NAME='Independent Medical Education LLC';t.env.BUSINESS_ADDRESS='Test address, UAE';t.env.SUPPORT_EMAIL='support@test.example';
  const canCheckout=await t.call('/api/config');assert.equal(canCheckout.json.checkout_ready,true);
  const openCheckout=await t.call('/api/billing/checkout','POST',{plan:'monthly'},cookie);assert.equal(openCheckout.status,200);assert.match(openCheckout.json.url,/checkout.stripe.com/);
  const premiumBefore=await t.call('/api/questions?exam=FOP&limit=30','GET',null,cookie);assert.equal(premiumBefore.json.questions.length,5);
  const denied=await t.call('/api/questions/answer','POST',{question_id:paidId,answer:0},cookie);assert.equal(denied.status,403);
  const mark=await t.call('/api/bookmarks','POST',{question_id:freeId,bookmarked:true},cookie);assert.equal(mark.status,200);
  const saved=await t.call('/api/me','GET',null,cookie);assert.ok(saved.json.bookmarks.includes(freeId));
  const grade=await t.call('/api/questions/grade','POST',{answers:[{question_id:freeId,answer:5}]},cookie);assert.equal(grade.status,200);assert.equal(grade.json.score,0);
  const after=await t.call('/api/me','GET',null,cookie);assert.equal(after.json.stats.attempted,1);
  const user=t.db.prepare("SELECT id FROM users WHERE email='student@test.example'").get();
  const event={id:'evt_test_activation',type:'customer.subscription.created',data:{object:{id:'sub_test',customer:'cus_test',status:'active',metadata:{user_id:user.id},current_period_end:Math.floor(Date.now()/1000)+86400,items:{data:[{price:{id:'price_monthly'}}]},cancel_at_period_end:false}}};
  const body=JSON.stringify(event),time=Math.floor(Date.now()/1000);
  const hkey=await crypto.subtle.importKey('raw',new TextEncoder().encode(t.env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const mac=await crypto.subtle.sign('HMAC',hkey,new TextEncoder().encode(`${time}.${body}`));const sig=[...new Uint8Array(mac)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const webhookReq=new Request('https://paediasprint.test/api/webhook/stripe',{method:'POST',body,headers:{'Stripe-Signature':`t=${time},v1=${sig}`}});
  const wr=await worker.fetch(webhookReq,t.env);assert.equal(wr.status,200);
  const duplicate=await worker.fetch(new Request('https://paediasprint.test/api/webhook/stripe',{method:'POST',body,headers:{'Stripe-Signature':`t=${time},v1=${sig}`}}),t.env);assert.equal((await duplicate.json()).duplicate,true);
  const premiumAfter=await t.call('/api/questions?exam=FOP&limit=30','GET',null,cookie);assert.equal(premiumAfter.json.questions.length,30);
  const mePaid=await t.call('/api/me','GET',null,cookie);assert.equal(mePaid.json.is_premium,true);
  const deletionDenied=await t.call('/api/account/delete','POST',{},cookie);assert.equal(deletionDenied.status,409);
  const doubleCheckout=await t.call('/api/billing/checkout','POST',{plan:'yearly'},cookie);assert.equal(doubleCheckout.status,409);
  const adminCookie=await registerAndLogin(t,'admin@test.example');
  const importCheck=await t.call('/api/admin/questions/import','POST',{questions:[{id:'akp-original-draft-999',exam:'AKP',topic:'Respiratory',difficulty:'Foundation',stem:'An independently drafted and medically hypothetical clinical question for editorial testing?',choices:['First answer','Second answer','Third answer','Fourth answer','Fifth answer'],answer:2,explanation:'This is an illustrative and independently drafted explanation awaiting clinical editorial review.',is_free:false}]},adminCookie);
  assert.equal(importCheck.status,200);
  const archiveAnon=await t.call('/api/admin/source-pages?section=D&page=1');assert.equal(archiveAnon.status,403,'private PDF archive must not be publicly accessible');
  const archiveAdmin=await t.call('/api/admin/source-pages?section=D&page=1','GET',null,adminCookie);assert.equal(archiveAdmin.status,200);assert.equal(archiveAdmin.json.total,existsSync('data/source_archive_seed.sql')?404:0);
  const archivedPage=await t.call('/api/admin/source-pages/item?page=9','GET',null,adminCookie);if(existsSync('data/source_archive_seed.sql')){assert.equal(archivedPage.status,200);assert.match(archivedPage.json.item.raw_text,/eczema/i);}else assert.equal(archivedPage.status,404);
  const contentNotes=t.db.prepare('SELECT COUNT(*) AS n FROM teaching_notes').get();assert.equal(contentNotes.n,19);
  const drafted=t.db.prepare('SELECT COUNT(*) AS n FROM questions WHERE id LIKE ? AND is_published=0').get('uk-%');assert.equal(drafted.n,19);
  const publishDenied=await t.call('/api/admin/questions/publish','POST',{id:'uk-fop-001',published:true},adminCookie);assert.equal(publishDenied.status,409,'editorial approval must be explicit');
  const publishOk=await t.call('/api/admin/questions/publish','POST',{id:'uk-fop-001',published:true,clinical_signoff:true},adminCookie);assert.equal(publishOk.status,200);
  const unlocked=await t.call('/api/questions/answer','POST',{question_id:'uk-fop-001',answer:1});assert.equal(unlocked.status,200);assert.equal(unlocked.json.teaching.distractors.length,4);
  const allQuestions=await t.call('/api/admin/questions','GET',null,adminCookie);
  assert.equal(allQuestions.json.questions.find(q=>q.id==='akp-original-draft-999').is_published,false,'new questions must not be accidentally published by default');
 }finally{t.restore();}
});

test('Payhip one-time checkout / signed events / 30-day entitlement / refund / strict price',async()=>{
 const {createHash}=await import('node:crypto');
 const t=setup();try{
  Object.assign(t.env,{PAYMENT_PROVIDER:'payhip',PAYHIP_API_KEY:'private_payhip_test_key',PAYHIP_PRODUCT_KEY:'dFfHl',PAYHIP_30D_CURRENCY:'USD',PAYHIP_30D_PRICE_CENTS:'2150',PAYHIP_CHECKOUT_30D_URL:'https://payhip.com/order?link=dFfHl&pricing_plan=63WdAKYmzw',SALES_ENABLED:'true',EDITORIAL_APPROVED:'true',CONTENT_RIGHTS_CONFIRMED:'true',BUSINESS_LEGAL_NAME:'Test licensed company',BUSINESS_ADDRESS:'Abu Dhabi, UAE',SUPPORT_EMAIL:'test@example.test'});
  const cookie=await registerAndLogin(t,'buyer@test.example');
  const config=await t.call('/api/config');assert.equal(config.json.checkout_ready,true);assert.equal(config.json.payment_provider,'payhip');assert.equal(config.json.yearly_available,false);
  const checkout=await t.call('/api/billing/checkout','POST',{plan:'monthly'},cookie);assert.equal(checkout.status,200);assert.equal(checkout.json.url,t.env.PAYHIP_CHECKOUT_30D_URL);
  const yearly=await t.call('/api/billing/checkout','POST',{plan:'yearly'},cookie);assert.equal(yearly.status,409);
  const sig=createHash('sha256').update(t.env.PAYHIP_API_KEY).digest('hex');
  const makeEvent=(id,type='paid',price=2150,signature=sig)=>({id,email:'buyer@test.example',currency:'USD',price,date:Math.floor(Date.now()/1000),items:[{product_key:'dFfHl',quantity:'1'}],type,signature});
  const hook=async event=>{const response=await worker.fetch(new Request('https://paediasprint.test/api/webhook/payhip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event)}),t.env);return {status:response.status,json:await response.json()};};
  assert.equal((await hook(makeEvent('invalid_payment','paid',2150,'wrong'))).status,403);
  assert.equal((await hook(makeEvent('underpaid','paid',300))).status,422);
  assert.equal((await hook({...makeEvent('other_product'),items:[{product_key:'elsewhere'}]})).json.ignored,true);
  const payment=await hook(makeEvent('payhip_001'));assert.equal(payment.status,200);assert.equal(payment.json.access_assigned,true);
  const dbRow=t.db.prepare("SELECT status,expires_at FROM payhip_purchases WHERE id='payhip_001'").get();assert.equal(dbRow.status,'paid');assert.ok(dbRow.expires_at>Math.floor(Date.now()/1000)+29*86400);
  assert.equal((await hook(makeEvent('payhip_001'))).json.duplicate,true);
  const me=await t.call('/api/me','GET',null,cookie);assert.equal(me.json.is_premium,true);assert.ok(me.json.payhip_access_until);
  const canAccess=await t.call('/api/questions?exam=FOP&limit=30','GET',null,cookie);assert.equal(canAccess.json.questions.length,30);
  const refund=await hook({...makeEvent('payhip_001','refunded'),amount_refunded:2150});assert.equal(refund.status,200);
  const afterRefund=await t.call('/api/me','GET',null,cookie);assert.equal(afterRefund.json.is_premium,false);
 }finally{t.restore();}
});
