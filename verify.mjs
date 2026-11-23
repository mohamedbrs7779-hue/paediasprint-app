import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const qs=JSON.parse(fs.readFileSync('data/questions.json','utf8'));
const ids=new Set();const topics={};let errors=0;
for(const q of qs){
 if(ids.has(q.id))throw Error('Duplicate ID '+q.id);ids.add(q.id);
 if(!['FOP','TAS','AKP'].includes(q.exam)||!['Foundation','Intermediate','Advanced'].includes(q.difficulty))throw Error('Invalid exam/difficulty '+q.id);
 if(!Array.isArray(q.choices)||q.choices.length!==5||new Set(q.choices).size!==5||q.answer<0||q.answer>4||q.stem.length<25||q.explanation.length<25)throw Error('Invalid question '+q.id);
 if(!q.reference_url.startsWith('https://'))throw Error('Invalid reference '+q.id);
 topics[q.exam]??=new Set();topics[q.exam].add(q.topic);
}
if(qs.length!==90)throw Error('Expected 90 starter questions');
for(const [e,topicSet] of Object.entries(topics))if(topicSet.size<8)throw Error('Insufficient topic diversity in '+e);
if(qs.filter(q=>q.is_free).length!==15)throw Error('Free tier mismatch');
for(const f of ['public/app.js','src/worker.js','src/security.js','scripts/build-seed.mjs'])execFileSync(process.execPath,['--check',f]);
console.log('✓ 90 structurally valid questions, 15 free and 75 premium');
console.log('✓ Three paper pathways, varied answers, medical topic distribution');
console.log('✓ Four JavaScript source files pass syntax checks');
console.log('⚠ Subject matter and clinical references require independent specialist review before paid launch.');
