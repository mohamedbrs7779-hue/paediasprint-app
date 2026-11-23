import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {randomHex,sha256,hashPassword,verifyStripeSignature,authCookie,readCookie,safeEmail,equal} from '../src/security.js';
test('password is one-way salted, reproducible and sensitive to different passwords',async()=>{
 const salt=randomHex(16);const h=await hashPassword('long-valid-password-123',salt);
 assert.equal(h.length,64);assert.equal(await hashPassword('long-valid-password-123',salt),h);
 assert.notEqual(await hashPassword('long-valid-password-456',salt),h);
 assert.notEqual(await hashPassword('long-valid-password-123',randomHex(16)),h);
});
test('cookie is HTTP only, secure in HTTPS and correctly read',()=>{
 const req=new Request('https://exam.example.com',{headers:{cookie:'foo=bar; ps_session=hello; baz=1'}});
 assert.equal(readCookie(req,'ps_session'),'hello');
 const c=authCookie(req,'mytoken',3600);
 assert.match(c,/HttpOnly/);assert.match(c,/SameSite=Lax/);assert.match(c,/Secure/);
 assert.equal(readCookie(req,'missing'),null);
});
test('constant-time comparison rejects differing signatures',()=>{assert.equal(equal('abc','abc'),true);assert.equal(equal('abc','abb'),false);assert.equal(equal('abc','ab'),false);});
test('stripe signed event verifies and rejects tampering or old timestamp',async()=>{
 const secret='whsec_testsecret';const t=1800000000;const body='{"id":"evt_123"}';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const h=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${t}.${body}`));
 const sig=Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('');
 assert.equal(await verifyStripeSignature(body,`t=${t},v1=${sig}`,secret,t),true);
 assert.equal(await verifyStripeSignature(body+' ',`t=${t},v1=${sig}`,secret,t),false);
 assert.equal(await verifyStripeSignature(body,`t=${t},v1=${sig}`,secret,t+1000),false);
 assert.equal(await verifyStripeSignature(body,'t=invalid,v1=abc',secret,t),false);
});
test('email validator rejects unsupported malformed values',()=>{assert.equal(safeEmail(' TEST@EXAMPLE.COM '),'test@example.com');assert.equal(safeEmail('not-email'),null);});
