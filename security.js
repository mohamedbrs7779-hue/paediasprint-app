const enc = new TextEncoder();
const dec = new TextDecoder();
export function toHex(bytes) { return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
export function fromHex(hex) { return new Uint8Array((hex.match(/.{2}/g)||[]).map(x=>parseInt(x,16))); }
export function randomHex(bytes=32) { const a=new Uint8Array(bytes); crypto.getRandomValues(a); return toHex(a); }
export async function sha256(input) { return toHex(await crypto.subtle.digest('SHA-256',enc.encode(input))); }
export async function hashPassword(password, salt) {
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return toHex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromHex(salt),iterations:250000,hash:'SHA-256'},key,256));
}
export function equal(a,b) { if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false; let v=0; for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0; }
export function authCookie(request, value, ttl) { const secure = new URL(request.url).protocol==='https:' ? '; Secure':''; return `ps_session=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${ttl}`; }
export function readCookie(request, name) { const raw=request.headers.get('Cookie')||'';const v=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return v ? v.slice(name.length+1):null; }
export async function verifyStripeSignature(raw, header, secret, nowSeconds=Math.floor(Date.now()/1000)) {
 if(!header || !secret)return false;
 const parts=header.split(',').map(x=>x.trim().split('='));
 const timestamp=parts.find(x=>x[0]==='t')?.[1];const sigs=parts.filter(x=>x[0]==='v1').map(x=>x[1]);
 if(!timestamp || !sigs.length || !/^\d+$/.test(timestamp) || Math.abs(nowSeconds-Number(timestamp))>300)return false;
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const computed=toHex(await crypto.subtle.sign('HMAC',key,enc.encode(`${timestamp}.${raw}`)));
 return sigs.some(sig=>equal(sig,computed));
}
export function cleanText(value, max=1000) {return String(value??'').trim().slice(0,max);}
export function safeEmail(email) {const e=String(email||'').trim().toLowerCase();return e.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)?e:null;}
export function baseUrl(request, env) {return (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/,'');}
export function safePath(path) {return /^\/[a-z0-9/#?&=_\-.%]*$/i.test(path)?path:'/';}
