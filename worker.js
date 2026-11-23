import { randomHex, sha256, hashPassword, equal, authCookie, readCookie, verifyStripeSignature, cleanText, safeEmail, baseUrl } from './security.js';

const NOW=()=>Math.floor(Date.now()/1000);
const payhipMode=env=>env.PAYMENT_PROVIDER==='payhip';
const salesReady=env=>env.SALES_ENABLED==='true' && env.EDITORIAL_APPROVED==='true' && env.CONTENT_RIGHTS_CONFIRMED==='true' && ensureEnv(env,['BUSINESS_LEGAL_NAME','BUSINESS_ADDRESS','SUPPORT_EMAIL','PUBLIC_BASE_URL']) && (payhipMode(env) ? ensureEnv(env,['PAYHIP_API_KEY','PAYHIP_CHECKOUT_30D_URL','PAYHIP_PRODUCT_KEY','PAYHIP_30D_PRICE_CENTS','PAYHIP_30D_CURRENCY']) : ensureEnv(env,['STRIPE_SECRET_KEY','STRIPE_PRICE_MONTHLY','STRIPE_PRICE_YEARLY','STRIPE_WEBHOOK_SECRET']));
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'};
function out(data,status=200,headers={}) {return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});}
function fail(message,status=400){return out({error:message},status);}
async function parse(req){if(Number(req.headers.get('content-length')||0)>220000)throw Error('Request too large');return req.json();}
function ensureEnv(env,keys){return keys.every(k=>!!env[k]);}
function guardOrigin(req){const origin=req.headers.get('Origin');return !origin || origin===new URL(req.url).origin;}
async function limit(env,req,key,max=10,seconds=3600){
 const ip=(req.headers.get('CF-Connecting-IP')||'unknown').slice(0,100);
 const bucket=Math.floor(NOW()/seconds);
 const name=`${key}:${ip}`;
 await env.DB.prepare('INSERT INTO rate_limits(rate_key,bucket,count) VALUES(?,?,1) ON CONFLICT(rate_key,bucket) DO UPDATE SET count=count+1').bind(name,bucket).run();
 const result=await env.DB.prepare('SELECT count FROM rate_limits WHERE rate_key=? AND bucket=?').bind(name,bucket).first();
 return (result?.count||0)<=max;
}
async function member(env,req){
 const raw=readCookie(req,'ps_session');if(!raw||raw.length!==64)return null;
 const h=await sha256(raw);
 const u=await env.DB.prepare('SELECT u.id,u.email,u.verified,u.stripe_customer_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(h,NOW()).first();
 return u?.verified ? u:null;
}
async function premium(env,user){
 if(!user)return false;
 if(env.ADMIN_EMAIL && user.email.toLowerCase()===env.ADMIN_EMAIL.toLowerCase())return true;
 const s=await env.DB.prepare('SELECT status,current_period_end FROM subscriptions WHERE user_id=?').bind(user.id).first();
 if(!!s && ['active','trialing'].includes(s.status) && Number(s.current_period_end)>NOW())return true;
 const access=await env.DB.prepare("SELECT 1 FROM payhip_purchases WHERE user_id=? AND status='paid' AND expires_at>? LIMIT 1").bind(user.id,NOW()).first();
 return !!access;
}
async function session(env,req,userId){
 const token=randomHex();const hashed=await sha256(token);
 await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(hashed,userId,NOW()+30*86400,NOW()).run();
 return authCookie(req,token,30*86400);
}
async function sendMail(env,to,subject,html){
 if(!ensureEnv(env,['RESEND_API_KEY','EMAIL_FROM']))throw new Error('Email delivery is not configured');
 const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,html})});
 if(!res.ok)throw new Error('Email provider rejected delivery');
}
async function issueEmailToken(env,request,user,purpose){
 const token=randomHex();const hashed=await sha256(token);
 await env.DB.prepare('DELETE FROM auth_tokens WHERE user_id=? AND purpose=?').bind(user.id,purpose).run();
 await env.DB.prepare('INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)').bind(hashed,user.id,purpose,NOW()+(purpose==='verify'?86400:1800)).run();
 const url=`${baseUrl(request,env)}/?${purpose==='verify'?'verify':'reset'}=${encodeURIComponent(token)}`;
 const title=purpose==='verify'?'Confirm your PaediaSprint email':'Reset your PaediaSprint password';
 await sendMail(env,user.email,title,`<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto"><h2>${title}</h2><p>Use the link below. It will expire in ${purpose==='verify'?'24 hours':'30 minutes'}.</p><p><a href="${url}" style="background:#096f6c;color:white;padding:12px 20px;text-decoration:none;border-radius:8px">Continue securely</a></p><p>If you didn't request this, ignore this email.</p></div>`);
}
async function stripeRequest(env,path,params,method='POST'){
 const opt={method,headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`}};
 if(params){opt.headers['Content-Type']='application/x-www-form-urlencoded';opt.body=new URLSearchParams(params).toString();}
 const res=await fetch(`https://api.stripe.com/v1/${path}`,opt);
 let data;try{data=await res.json();}catch{data={};}
 if(!res.ok)throw Error(data?.error?.message||'Payment provider error');
 return data;
}
async function saveSubscription(env,s,forcedUserId){
 const customer=typeof s.customer==='string'?s.customer:s.customer?.id;
 let userId=forcedUserId || s.metadata?.user_id;
 if(!userId && customer){const u=await env.DB.prepare('SELECT id FROM users WHERE stripe_customer_id=?').bind(customer).first();userId=u?.id;}
 if(!userId && customer){const u=await env.DB.prepare('SELECT user_id FROM subscriptions WHERE stripe_customer_id=?').bind(customer).first();userId=u?.user_id;}
 if(!userId)return false;
 const item=s.items?.data?.[0];
 const end=Number(s.current_period_end||item?.current_period_end||0);
 const priceId=item?.price?.id || null;
 await env.DB.prepare('UPDATE users SET stripe_customer_id=? WHERE id=?').bind(customer||null,userId).run();
 await env.DB.prepare(`INSERT INTO subscriptions(user_id,stripe_subscription_id,stripe_customer_id,status,price_id,current_period_end,cancel_at_period_end,updated_at)
 VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET stripe_subscription_id=excluded.stripe_subscription_id,stripe_customer_id=excluded.stripe_customer_id,status=excluded.status,price_id=excluded.price_id,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=excluded.updated_at`).bind(userId,s.id,customer||null,s.status||'incomplete',priceId,end,s.cancel_at_period_end?1:0,NOW()).run();
 return true;
}
async function webhook(req,env){
 if(!ensureEnv(env,['STRIPE_WEBHOOK_SECRET','STRIPE_SECRET_KEY']))return fail('Stripe is not configured',503);
 const raw=await req.text();
 if(!(await verifyStripeSignature(raw,req.headers.get('Stripe-Signature'),env.STRIPE_WEBHOOK_SECRET)))return fail('Invalid webhook signature',400);
 const event=JSON.parse(raw);
 const seen=await env.DB.prepare('SELECT 1 FROM stripe_events WHERE id=?').bind(event.id).first();if(seen)return out({ok:true,duplicate:true});
 const s=event.data?.object;
 if(event.type==='checkout.session.completed' && s?.mode==='subscription'){
  const userId=s.client_reference_id || s.metadata?.user_id;
  const cust=typeof s.customer==='string'?s.customer:s.customer?.id;
  if(userId&&cust)await env.DB.prepare('UPDATE users SET stripe_customer_id=? WHERE id=?').bind(cust,userId).run();
  if(s.subscription){const sub=await stripeRequest(env,`subscriptions/${encodeURIComponent(s.subscription)}`,null,'GET');await saveSubscription(env,sub,userId);}
 }
 if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type))await saveSubscription(env,s);
 await env.DB.prepare('INSERT OR IGNORE INTO stripe_events(id,processed_at) VALUES(?,?)').bind(event.id,NOW()).run();
 return out({ok:true});
}
// Payhip documents a signature equal to the SHA-256 hash of the PRIVATE Payhip API key.
// It is checked server-side and is NEVER embedded in the public site.
async function payhipWebhook(req,env){
 if(!ensureEnv(env,['PAYHIP_API_KEY','PAYHIP_PRODUCT_KEY','PAYHIP_30D_PRICE_CENTS','PAYHIP_30D_CURRENCY']))return fail('Payhip is not configured',503);
 const raw=await req.text();if(raw.length>100000)return fail('Webhook too large',413);
 let data;try{data=JSON.parse(raw);}catch{return fail('Invalid JSON',400);}
 if(!data || typeof data.signature!=='string' || !(equal(data.signature,await sha256(env.PAYHIP_API_KEY))))return fail('Invalid Payhip signature',403);
 if(!['paid','refunded'].includes(data.type))return out({ok:true,ignored:true});
 const id=String(data.id||'');const email=safeEmail(data.email);
 if(!/^[a-zA-Z0-9_-]{5,100}$/.test(id)||!email)return fail('Missing valid order identity',422);
 const items=Array.isArray(data.items)?data.items:[];
 const belongs=items.length===1 && items[0]?.product_key===env.PAYHIP_PRODUCT_KEY && Number(items[0].quantity||1)===1;
 if(!belongs)return out({ok:true,ignored:true});
 if(data.type==='refunded'){
   const original=await env.DB.prepare('SELECT amount_cents FROM payhip_purchases WHERE id=?').bind(id).first();
   if(original && Number(data.amount_refunded||0)>=Number(original.amount_cents))await env.DB.prepare("UPDATE payhip_purchases SET status='refunded' WHERE id=?").bind(id).run();
   return out({ok:true,refund_recorded:!!original});
 }
 const cents=Number(data.price),expected=Number(env.PAYHIP_30D_PRICE_CENTS);
 if(!Number.isInteger(cents)||!Number.isInteger(expected)||expected<=0||cents!==expected||data.currency!==env.PAYHIP_30D_CURRENCY){
   // Discounts or changed prices require an explicit admin review, not an unearned access grant.
   return fail('Payment amount or currency needs review',422);
 }
 const prior=await env.DB.prepare('SELECT id FROM payhip_purchases WHERE id=?').bind(id).first();
 if(prior)return out({ok:true,duplicate:true});
 const user=await env.DB.prepare('SELECT id FROM users WHERE email=? AND verified=1').bind(email).first();
 const previous=user?await env.DB.prepare("SELECT MAX(expires_at) AS expiry FROM payhip_purchases WHERE user_id=? AND status='paid'").bind(user.id).first():null;
 const paidAt=Number.isSafeInteger(Number(data.date)) && Number(data.date)>0 ? Number(data.date) : NOW();
 const start=Math.max(NOW(),Number(previous?.expiry||0));const expiry=start+30*86400;
 await env.DB.prepare('INSERT INTO payhip_purchases(id,buyer_email,user_id,product_key,currency,amount_cents,paid_at,expires_at,status) VALUES(?,?,?,?,?,?,?,?,?)')
 .bind(id,email,user?.id||null,env.PAYHIP_PRODUCT_KEY,env.PAYHIP_30D_CURRENCY,cents,paidAt,expiry,'paid').run();
 return out({ok:true,access_assigned:!!user});
}
async function teachingFor(env,id){
 const t=await env.DB.prepare('SELECT source_pdf_page,evidence_level,exam_pearl,distractors_json,additional_refs_json,editorial_status,rights_basis,last_evidence_review FROM teaching_notes WHERE question_id=?').bind(id).first();
 if(!t)return null;
 const parseArray=x=>{try{return JSON.parse(x||'[]')}catch{return []}};
 return {source_pdf_page:t.source_pdf_page,evidence_level:t.evidence_level,exam_pearl:t.exam_pearl,distractors:parseArray(t.distractors_json),references:parseArray(t.additional_refs_json),editorial_status:t.editorial_status,rights_basis:t.rights_basis,last_evidence_review:t.last_evidence_review};
}
const questionPublic=q=>({id:q.id,exam:q.exam,topic:q.topic,difficulty:q.difficulty,stem:q.stem,choices:JSON.parse(q.choices_json),is_free:!!q.is_free});
const questionReview=q=>({...questionPublic(q),answer:q.answer,explanation:q.explanation,reference_title:q.reference_title,reference_url:q.reference_url});
function validQuestion(q){return q&&typeof q==='object'&&['FOP','TAS','AKP'].includes(q.exam)&&typeof q.topic==='string'&&q.topic.length>=2&&q.topic.length<100&&['Foundation','Intermediate','Advanced'].includes(q.difficulty)&&typeof q.stem==='string'&&q.stem.length>=25&&q.stem.length<3500&&Array.isArray(q.choices)&&q.choices.length===5&&q.choices.every(x=>typeof x==='string'&&x.trim().length>0&&x.length<600)&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=4&&typeof q.explanation==='string'&&q.explanation.length>=25&&q.explanation.length<5000;}
async function questionAllowed(env,user,q){return q.is_published===1 && (q.is_free===1 || await premium(env,user));}
async function handle(req,env){
 const url=new URL(req.url);const p=url.pathname;const method=req.method;
 if(p==='/api/webhook/stripe'&&method==='POST')return webhook(req,env);
 if(p==='/api/webhook/payhip'&&method==='POST')return payhipWebhook(req,env);
 if(['POST','PUT','DELETE','PATCH'].includes(method)&&!guardOrigin(req))return fail('Origin rejected',403);
 if(p==='/api/health')return out({ok:true,service:'PaediaSprint',version:'2.0.0'});
 if(p==='/api/config'&&method==='GET'){
  const counts=await env.DB.prepare('SELECT exam,COUNT(*) AS count,SUM(CASE WHEN is_free=1 THEN 1 ELSE 0 END) AS free_count FROM questions WHERE is_published=1 GROUP BY exam').all();
  return out({brand:env.SITE_NAME||'PaediaSprint',plans:{monthly:Number(env.MONTHLY_PRICE_AED||79),yearly:Number(env.YEARLY_PRICE_AED||499)},checkout_ready:salesReady(env),payment_provider:payhipMode(env)?'payhip':'stripe',yearly_available:!payhipMode(env),counts:counts.results||[],support_email:env.SUPPORT_EMAIL||null,merchant:{legal_name:env.BUSINESS_LEGAL_NAME||null,address:env.BUSINESS_ADDRESS||null}});
 }
 if(p==='/api/auth/register'&&method==='POST'){
  if(!(await limit(env,req,'register',6)))return fail('Too many requests. Please try later.',429);
  if(!ensureEnv(env,['RESEND_API_KEY','EMAIL_FROM']))return fail('Registration is not configured yet. Please contact support.',503);
  const v=await parse(req);const email=safeEmail(v.email);const pass=String(v.password||'');
  if(!email||pass.length<12||pass.length>128)return fail('Enter a valid email and a password of 12–128 characters.');
  const existing=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();if(existing)return fail('An account with that email already exists.',409);
  const salt=randomHex(16);const ph=await hashPassword(pass,salt);const user={id:crypto.randomUUID(),email};
  await env.DB.prepare('INSERT INTO users(id,email,password_hash,salt,verified,created_at,updated_at) VALUES(?,?,?,?,0,?,?)').bind(user.id,email,ph,salt,NOW(),NOW()).run();
  try{await issueEmailToken(env,req,user,'verify');}catch{return fail('Account created, but verification email failed. Use Resend verification.',503);}
  return out({ok:true,message:'Check your email and verify your address before signing in.'},201);
 }
 if(p==='/api/auth/resend-verify'&&method==='POST'){
  if(!(await limit(env,req,'resend',4)))return fail('Try again later.',429);
  const v=await parse(req);const email=safeEmail(v.email);if(email){const user=await env.DB.prepare('SELECT id,email FROM users WHERE email=? AND verified=0').bind(email).first();if(user)await issueEmailToken(env,req,user,'verify');}
  return out({ok:true,message:'If your account needs verification, a new message was sent.'});
 }
 if(p==='/api/auth/verify'&&method==='POST'){
  const v=await parse(req);const t=String(v.token||'');if(!/^[a-f0-9]{64}$/.test(t))return fail('Invalid verification link');
  const h=await sha256(t);const item=await env.DB.prepare("SELECT user_id FROM auth_tokens WHERE token_hash=? AND purpose='verify' AND expires_at>?").bind(h,NOW()).first();if(!item)return fail('Link expired. Please request a new one.',410);
  await env.DB.batch([env.DB.prepare('UPDATE users SET verified=1,updated_at=? WHERE id=?').bind(NOW(),item.user_id),env.DB.prepare('DELETE FROM auth_tokens WHERE token_hash=?').bind(h)]);
  const verified=await env.DB.prepare('SELECT email FROM users WHERE id=?').bind(item.user_id).first();
  if(verified)await env.DB.prepare("UPDATE payhip_purchases SET user_id=? WHERE buyer_email=? AND user_id IS NULL AND status='paid'").bind(item.user_id,verified.email).run();
  return out({ok:true,message:'Email verified. You can now sign in.'});
 }
 if(p==='/api/auth/login'&&method==='POST'){
  if(!(await limit(env,req,'login',20)))return fail('Too many sign-in attempts.',429);
  const v=await parse(req);const email=safeEmail(v.email);const pass=String(v.password||'');
  const u=email?await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first():null;
  if(!u||!(await equal(await hashPassword(pass,u.salt),u.password_hash)))return fail('Incorrect email or password',401);
  if(!u.verified)return fail('Please verify your email before signing in.',403);
  return out({ok:true,email:u.email},200,{'Set-Cookie':await session(env,req,u.id)});
 }
 if(p==='/api/auth/request-reset'&&method==='POST'){
  if(!(await limit(env,req,'reset',5)))return fail('Too many requests.',429);
  const v=await parse(req);const email=safeEmail(v.email);
  if(email){const u=await env.DB.prepare('SELECT id,email FROM users WHERE email=?').bind(email).first();if(u)await issueEmailToken(env,req,u,'reset');}
  return out({ok:true,message:'If this email exists, a reset link has been sent.'});
 }
 if(p==='/api/auth/reset'&&method==='POST'){
  if(!(await limit(env,req,'reset-password',10)))return fail('Too many attempts.',429);
  const v=await parse(req);const t=String(v.token||'');const pass=String(v.password||'');
  if(!/^[a-f0-9]{64}$/.test(t)||pass.length<12||pass.length>128)return fail('Invalid link or password length');
  const h=await sha256(t);const item=await env.DB.prepare("SELECT user_id FROM auth_tokens WHERE token_hash=? AND purpose='reset' AND expires_at>?").bind(h,NOW()).first();
  if(!item)return fail('The link has expired.',410);
  const salt=randomHex(16);const ph=await hashPassword(pass,salt);
  await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,salt=?,updated_at=? WHERE id=?').bind(ph,salt,NOW(),item.user_id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(item.user_id),env.DB.prepare('DELETE FROM auth_tokens WHERE user_id=?').bind(item.user_id)]);
  return out({ok:true,message:'Password updated. Sign in again.'});
 }
 if(p==='/api/auth/logout'&&method==='POST'){
  const t=readCookie(req,'ps_session');if(t){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(t)).run();}
  return out({ok:true},200,{'Set-Cookie':authCookie(req,'',0)});
 }
 const user=await member(env,req);
 if(p==='/api/me'&&method==='GET'){
  if(!user)return out({authenticated:false});
  const sub=await env.DB.prepare('SELECT status,current_period_end,cancel_at_period_end FROM subscriptions WHERE user_id=?').bind(user.id).first();
  const counts=await env.DB.prepare('SELECT COUNT(*) AS attempted,SUM(is_correct) AS correct,COUNT(DISTINCT question_id) AS unique_count FROM attempts WHERE user_id=?').bind(user.id).first();
  const byExam=await env.DB.prepare('SELECT q.exam,COUNT(*) AS total,SUM(a.is_correct) AS correct FROM attempts a JOIN questions q ON q.id=a.question_id WHERE a.user_id=? GROUP BY q.exam').bind(user.id).all();
  const recent=await env.DB.prepare('SELECT q.exam,q.topic,a.is_correct,a.answered_at FROM attempts a JOIN questions q ON q.id=a.question_id WHERE a.user_id=? ORDER BY a.answered_at DESC LIMIT 10').bind(user.id).all();
  const books=await env.DB.prepare('SELECT question_id FROM bookmarks WHERE user_id=?').bind(user.id).all();
  const purchased=await env.DB.prepare("SELECT MAX(expires_at) AS expiry FROM payhip_purchases WHERE user_id=? AND status='paid'").bind(user.id).first();
  return out({authenticated:true,email:user.email,payhip_access_until:purchased?.expiry||null,payment_provider:payhipMode(env)?'payhip':'stripe',is_admin:!!env.ADMIN_EMAIL&&user.email.toLowerCase()===env.ADMIN_EMAIL.toLowerCase(),is_premium:await premium(env,user),subscription:sub,stats:counts,by_exam:byExam.results||[],recent:recent.results||[],bookmarks:(books.results||[]).map(x=>x.question_id)});
 }
 if(p==='/api/questions'&&method==='GET'){
  if(!(await limit(env,req,'read-q',200,3600)))return fail('Slow down a little.',429);
  const exam=['FOP','TAS','AKP'].includes(url.searchParams.get('exam'))?url.searchParams.get('exam'):null;
  const topic=cleanText(url.searchParams.get('topic')||'',90);
  const mode=url.searchParams.get('mode');const isPremium=await premium(env,user);
  const n=Math.min(Math.max(parseInt(url.searchParams.get('limit')||'10',10)||10,1),50);
  if(mode==='bookmarks'&&!user)return fail('Sign in to access bookmarks.',401);
  let sql='SELECT q.* FROM questions q';const params=[];
  if(mode==='bookmarks'){sql+=' JOIN bookmarks b ON b.question_id=q.id AND b.user_id=?';params.push(user.id);}
  sql+=' WHERE q.is_published=1';
  if(!isPremium){sql+=' AND q.is_free=1';}
  if(exam){sql+=' AND q.exam=?';params.push(exam);}
  if(topic){sql+=' AND q.topic=?';params.push(topic);}
  sql+=' ORDER BY RANDOM() LIMIT ?';params.push(n);
  const rows=await env.DB.prepare(sql).bind(...params).all();
  return out({questions:(rows.results||[]).map(questionPublic),is_premium:isPremium,restricted:!isPremium});
 }
 if(p==='/api/questions/answer'&&method==='POST'){
  if(!(await limit(env,req,'answer',300,3600)))return fail('Too many submissions.',429);
  const v=await parse(req);const id=cleanText(v.question_id,100);const a=Number(v.answer);
  if(!id||!Number.isInteger(a)||a<0||a>4)return fail('Select an answer.');
  const q=await env.DB.prepare('SELECT * FROM questions WHERE id=?').bind(id).first();if(!q)return fail('Question not found.',404);
  if(!(await questionAllowed(env,user,q)))return fail('Subscribe to access this question.',403);
  const correct=Number(q.answer)===a;
  if(user)await env.DB.prepare('INSERT INTO attempts(id,user_id,question_id,selected_answer,is_correct,mode,answered_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,q.id,a,correct?1:0,'practice',NOW()).run();
  return out({correct,answer:Number(q.answer),explanation:q.explanation,reference_title:q.reference_title,reference_url:q.reference_url,teaching:await teachingFor(env,q.id)});
 }
 if(p==='/api/questions/grade'&&method==='POST'){
  if(!(await limit(env,req,'grade',60,3600)))return fail('Too many submissions.',429);
  const v=await parse(req);const entries=Array.isArray(v.answers)?v.answers:[];
  if(!entries.length||entries.length>50)return fail('Invalid mock exam.');
  const seen=new Set();const result=[];const writes=[];const isPremium=await premium(env,user);
  for(const ent of entries){const id=cleanText(ent.question_id,100);const selected=Number(ent.answer);if(seen.has(id)||!Number.isInteger(selected)||selected<0||selected>5)return fail('Invalid answers.');seen.add(id);
   const q=await env.DB.prepare('SELECT * FROM questions WHERE id=? AND is_published=1').bind(id).first();if(!q||(!q.is_free&&!isPremium))return fail('Unavailable mock question.',403);
   result.push({...questionReview(q),selected,correct:selected===Number(q.answer),teaching:await teachingFor(env,id)});
   if(user)writes.push(env.DB.prepare('INSERT INTO attempts(id,user_id,question_id,selected_answer,is_correct,mode,answered_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,id,selected,selected===Number(q.answer)?1:0,'mock',NOW()));
  }
  if(writes.length)await env.DB.batch(writes);
  return out({score:result.filter(x=>x.correct).length,total:result.length,reviews:result});
 }
 if(p==='/api/bookmarks'&&method==='POST'){
  if(!user)return fail('Sign in to save bookmarks.',401);
  const v=await parse(req);const id=cleanText(v.question_id,100);
  const q=await env.DB.prepare('SELECT * FROM questions WHERE id=?').bind(id).first();if(!q||!(await questionAllowed(env,user,q)))return fail('Question not available.',403);
  if(v.bookmarked){await env.DB.prepare('INSERT OR IGNORE INTO bookmarks(user_id,question_id,created_at) VALUES(?,?,?)').bind(user.id,id,NOW()).run();}
  else await env.DB.prepare('DELETE FROM bookmarks WHERE user_id=? AND question_id=?').bind(user.id,id).run();
  return out({ok:true});
 }
 if(p==='/api/billing/checkout'&&method==='POST'){
  if(!user)return fail('Sign in first.',401);
  if(!salesReady(env))return fail('Membership enrollment is not open yet. Please check back soon.',503);
  if(await premium(env,user))return fail('Your premium access is already active.',409);
  const v=await parse(req);
  if(payhipMode(env)){
   if(v.plan!=='monthly')return fail('Only the 30-day one-time access plan is currently configured.',409);
   // The checkout URL is supplied by the merchant and is deliberately not built from user input.
   const checkout=String(env.PAYHIP_CHECKOUT_30D_URL||'');
   const u=new URL(checkout);
   if(u.protocol!=='https:'||u.hostname!=='payhip.com'||u.pathname!=='/order'||u.searchParams.get('link')!==env.PAYHIP_PRODUCT_KEY)return fail('Merchant checkout link is not valid',503);
   return out({url:checkout,payment_provider:'payhip',one_time:true});
  }
  const annual=v.plan==='yearly';const price=annual?env.STRIPE_PRICE_YEARLY:env.STRIPE_PRICE_MONTHLY;
  const params={'mode':'subscription','line_items[0][price]':price,'line_items[0][quantity]':'1','client_reference_id':user.id,'metadata[user_id]':user.id,'subscription_data[metadata][user_id]':user.id,'success_url':`${baseUrl(req,env)}/?checkout=success`,'cancel_url':`${baseUrl(req,env)}/#pricing`,'billing_address_collection':'auto','allow_promotion_codes':'true'};
  if(user.stripe_customer_id)params.customer=user.stripe_customer_id;else params.customer_email=user.email;
  const s=await stripeRequest(env,'checkout/sessions',params);
  return out({url:s.url});
 }
 if(p==='/api/billing/portal'&&method==='POST'){
  if(!user)return fail('Sign in first.',401);
  if(payhipMode(env))return fail('One-time Payhip purchases have no recurring billing portal.',409);
  if(!user.stripe_customer_id)return fail('No Stripe billing account was found.',404);
  const s=await stripeRequest(env,'billing_portal/sessions',{customer:user.stripe_customer_id,return_url:`${baseUrl(req,env)}/#dashboard`});
  return out({url:s.url});
 }
 if(p==='/api/account/delete'&&method==='POST'){
  if(!user)return fail('Sign in to delete your account.',401);
  const sub=await env.DB.prepare('SELECT status,current_period_end FROM subscriptions WHERE user_id=?').bind(user.id).first();
  if(sub&&['active','trialing','past_due'].includes(sub.status))return fail('Cancel your paid subscription in Billing first and request deletion when it has ended.',409);
  await env.DB.prepare('DELETE FROM users WHERE id=?').bind(user.id).run();
  return out({ok:true},200,{'Set-Cookie':authCookie(req,'',0)});
 }
 if(p.startsWith('/api/admin')){
  if(!user||!env.ADMIN_EMAIL||user.email.toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())return fail('Administrator access required.',403);
  if(p==='/api/admin/source-pages'&&method==='GET'){
   const section=(url.searchParams.get('section')||'').toUpperCase();
   const page=Math.max(1,Math.min(874,Number(url.searchParams.get('page')||1)||1));
   const query=(url.searchParams.get('q')||'').trim().slice(0,90);
   const filters=[];const args=[];
   if(['A','B','C','D'].includes(section)){filters.push('section=?');args.push(section);}
   if(query){filters.push('raw_text LIKE ?');args.push('%'+query+'%');}
   const where=filters.length?' WHERE '+filters.join(' AND '):'';
   const totals=await env.DB.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN extract_type=? THEN 1 ELSE 0 END) AS scans FROM source_pages'+where).bind('image_or_low_text',...args).first();
   const rows=await env.DB.prepare('SELECT page_number,section,collection,role,extract_type,possible_questions,review_status,rights_status,substr(raw_text,1,420) AS excerpt FROM source_pages'+where+' ORDER BY page_number LIMIT 15 OFFSET ?').bind(...args,(page-1)*15).all();
   return out({page,total:totals?.total||0,scans:totals?.scans||0,items:rows.results||[],private_owner_only:true});
  }
  if(p==='/api/admin/source-pages/item'&&method==='GET'){
   const page=Number(url.searchParams.get('page')||0);
   if(!Number.isInteger(page)||page<1||page>874)return fail('Invalid source page.',400);
   const row=await env.DB.prepare('SELECT * FROM source_pages WHERE page_number=?').bind(page).first();
   return row?out({item:row,private_owner_only:true}):fail('Page not found',404);
  }
  if(p==='/api/admin/source-pages/review'&&method==='POST'){
   const v=await parse(req);const page=Number(v.page_number);
   if(!Number.isInteger(page)||page<1||page>874)return fail('Invalid page number',400);
   if(!['not_reviewed','transcription_needed','clinical_review','rights_permission_needed','done'].includes(v.review_status))return fail('Invalid review status',400);
   await env.DB.prepare('UPDATE source_pages SET review_status=?,reviewer_note=? WHERE page_number=?').bind(v.review_status,cleanText(v.reviewer_note||'',1500),page).run();
   return out({ok:true});
  }
  if(p==='/api/admin/questions/publish'&&method==='POST'){
   const v=await parse(req);const id=cleanText(v.id,100);
   if(!id||typeof v.published!=='boolean')return fail('Invalid publication request',400);
   if(v.published&&v.clinical_signoff!==true)return fail('Independent clinical editorial signoff must be confirmed before publication.',409);
   const item=await env.DB.prepare('SELECT id FROM questions WHERE id=?').bind(id).first();
   if(!item)return fail('Question not found',404);
   const tn=await teachingFor(env,id);
   if(v.published&&tn&&tn.rights_basis!=='independently_authored'&&v.rights_permission!==true)return fail('Third-party copyright clearance is required.',409);
   await env.DB.prepare('UPDATE questions SET is_published=?,updated_at=? WHERE id=?').bind(v.published?1:0,NOW(),id).run();
   if(v.published&&tn)await env.DB.prepare('UPDATE teaching_notes SET editorial_status=? WHERE question_id=?').bind('approved_by_owner',id).run();
   return out({ok:true});
  }
  if(p==='/api/admin/questions'&&method==='GET'){
   const q=await env.DB.prepare('SELECT * FROM questions ORDER BY updated_at DESC LIMIT 3000').all();return out({questions:(q.results||[]).map(x=>({...questionReview(x),is_published:!!x.is_published}))});
  }
  if(p==='/api/admin/questions/import'&&method==='POST'){
   const data=await parse(req);const list=Array.isArray(data.questions)?data.questions:[];
   if(!list.length||list.length>100)return fail('Upload 1–100 questions per batch.');
   if(!list.every(validQuestion))return fail('Every question needs exam, topic, difficulty, stem, 5 choices, answer (0–4), and detailed explanation.');
   const commands=list.map(q=>env.DB.prepare(`INSERT INTO questions(id,exam,topic,difficulty,stem,choices_json,answer,explanation,reference_title,reference_url,is_free,is_published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET exam=excluded.exam,topic=excluded.topic,difficulty=excluded.difficulty,stem=excluded.stem,choices_json=excluded.choices_json,answer=excluded.answer,explanation=excluded.explanation,reference_title=excluded.reference_title,reference_url=excluded.reference_url,is_free=excluded.is_free,is_published=excluded.is_published,updated_at=excluded.updated_at`).bind(cleanText(q.id||crypto.randomUUID(),100),q.exam,cleanText(q.topic,90),q.difficulty,q.stem.trim(),JSON.stringify(q.choices),q.answer,q.explanation.trim(),cleanText(q.reference_title,200),cleanText(q.reference_url,500),q.is_free?1:0,0,NOW(),NOW()));
   await env.DB.batch(commands);return out({ok:true,imported:commands.length});
  }
  if(p==='/api/admin/questions'&&method==='DELETE'){
   const v=await parse(req);const id=cleanText(v.id,100);await env.DB.prepare('DELETE FROM questions WHERE id=?').bind(id).run();return out({ok:true});
  }
 }
 return fail('API route not found',404);
}
export default {async fetch(request,env){
 try{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/'))return await handle(request,env);
  const response=await env.ASSETS.fetch(request);
  const h=new Headers(response.headers);h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','strict-origin-when-cross-origin');h.set('X-Frame-Options','DENY');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
 }catch(err){console.error('Request failed',String(err?.message||err));return fail('Request failed. Please try again or contact support.',500);}
}};
