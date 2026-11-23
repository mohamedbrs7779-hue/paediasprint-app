import fs from 'node:fs';
const root=new URL('../',import.meta.url);
let html=fs.readFileSync(new URL('public/index.html',root),'utf8');
const css=fs.readFileSync(new URL('public/styles.css',root),'utf8');
const js=fs.readFileSync(new URL('public/app.js',root),'utf8');
const icon=fs.readFileSync(new URL('public/favicon.svg',root),'utf8');
const qs=JSON.parse(fs.readFileSync(new URL('data/questions.json',root),'utf8'));
const data=JSON.stringify(qs.filter(x=>x.is_free)).replace(/</g,'\\u003c');
html=html.replace('<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/styles.css">',`<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(icon)}"><style>${css}</style>`);
html=html.replaceAll('src="/favicon.svg"',`src="data:image/svg+xml,${encodeURIComponent(icon)}"`);
html=html.replace('<div id="announce" class="announce">','<div id="announce" class="announce"><b style="color:#ffdfaf;margin-right:14px">INTERACTIVE PREVIEW — PAYMENTS &amp; SIGN-UP DISABLED</b> ');
const mock=`<script>
const PREVIEW_QUESTIONS=${data};
const PREVIEW_REAL_FETCH=window.fetch;
window.fetch=async function(url,options={}){
 const p=String(url);let body={};try{body=JSON.parse(options.body||'{}')}catch{}
 const endpoint=p.split('/api')[1]||'';
 function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})}
 if(endpoint.startsWith('/config'))return reply({brand:'PaediaSprint',plans:{monthly:79,yearly:499},counts:[{exam:'FOP',count:30,free_count:5},{exam:'TAS',count:30,free_count:5},{exam:'AKP',count:30,free_count:5}],support_email:null,checkout_ready:false,payment_provider:'payhip',yearly_available:false});
 if(endpoint.startsWith('/me'))return reply({authenticated:false});
 if(endpoint.startsWith('/questions?')){
  const u=new URL(p,'https://preview.test');const exam=u.searchParams.get('exam'),limit=Number(u.searchParams.get('limit')||10);
  return reply({questions:PREVIEW_QUESTIONS.filter(q=>q.exam===exam).slice(0,limit).map(q=>({id:q.id,exam:q.exam,topic:q.topic,difficulty:q.difficulty,stem:q.stem,choices:q.choices,is_free:true})),is_premium:false,restricted:true});
 }
 if(endpoint.startsWith('/questions/answer')){const q=PREVIEW_QUESTIONS.find(q=>q.id===body.question_id);if(!q)return reply({error:'Question not found'},404);return reply({correct:q.answer===body.answer,answer:q.answer,explanation:q.explanation,reference_title:q.reference_title,reference_url:q.reference_url});}
 if(endpoint.startsWith('/questions/grade')){const results=(body.answers||[]).map(a=>{const q=PREVIEW_QUESTIONS.find(x=>x.id===a.question_id);return {...q,selected:a.answer,correct:q.answer===a.answer}});return reply({score:results.filter(x=>x.correct).length,total:results.length,reviews:results});}
 return reply({error:'This is a preview only. Sign-up and payments require a published site, real verified business accounts and the production backend.'},503);
};
</script>`;
html=html.replace('<script src="/app.js" defer></script>',`${mock}<script>${js}</script>`);
fs.writeFileSync(new URL('PREVIEW_ONLY.html',root),html);
console.log('Generated standalone interactive PREVIEW_ONLY.html (free questions work, payments disabled).');
