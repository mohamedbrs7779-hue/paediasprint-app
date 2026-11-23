import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const rows=fs.readFileSync(new URL('data/questions_source.txt',root),'utf8').split(/\r?\n/).filter(Boolean);
const codes={
 RCPCH:['RCPCH theory exam syllabus and structure','https://www.rcpch.ac.uk/education-careers/examinations/theory/structure-syllabi'],
 NICE_B:['NICE guideline NG9: Bronchiolitis in children','https://www.nice.org.uk/guidance/ng9'],
 NICE_C:['NHS: Croup overview','https://www.nhs.uk/conditions/croup/'],
 NICE_J:['NICE guideline CG98: Jaundice in newborn babies','https://www.nice.org.uk/guidance/cg98'],
 NICE_D:['NICE guideline NG18: Diabetes in children and young people','https://www.nice.org.uk/guidance/ng18'],
 NICE_CO:['NICE guideline NG20: Coeliac disease','https://www.nice.org.uk/guidance/ng20'],
 NICE_S:['NICE guideline NG51: Sepsis','https://www.nice.org.uk/guidance/ng51'],
 NICE_F:['NICE guideline NG143: Fever in under 5s','https://www.nice.org.uk/guidance/ng143'],
 NICE_M:['NICE guideline NG240: Meningitis and meningococcal disease','https://www.nice.org.uk/guidance/ng240'],
 NICE_GE:['NICE guideline CG84: Gastroenteritis in under 5s','https://www.nice.org.uk/guidance/cg84'],
 RCUK:['Resuscitation Council UK guidelines','https://www.resus.org.uk/library'],
 GINA:['Global Initiative for Asthma strategy reports','https://ginasthma.org/reports/'],
 AHA:['AHA guidelines for CPR and emergency cardiovascular care','https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines'],
 NCBI:['NCBI Bookshelf: Biomedical science reference collection','https://www.ncbi.nlm.nih.gov/books/']
};
function shuffle(values, seed){const a=[...values];let x=seed;function rnd(){x=(Math.imul(x,1664525)+1013904223)>>>0;return x/2**32;}for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const nums={FOP:0,TAS:0,AKP:0};const out=[];
for(const [idx,row] of rows.entries()){
 const vals=row.split('^');if(vals.length!==11)throw new Error(`Line ${idx+1}: expected 11 fields, got ${vals.length}`);
 const [exam,topic,difficulty,stem,correct,d1,d2,d3,d4,explanation,code]=vals;
 if(!codes[code])throw new Error(`Unknown reference ${code}`);
 if(!['FOP','TAS','AKP'].includes(exam))throw Error(`Unknown exam ${exam}`);
 nums[exam]++;const choices=shuffle([correct,d1,d2,d3,d4],(idx+1)*9349);const answer=choices.indexOf(correct);
 out.push({id:`${exam.toLowerCase()}-${String(nums[exam]).padStart(3,'0')}`,exam,topic,difficulty,stem,choices,answer,explanation,reference_title:codes[code][0],reference_url:codes[code][1],is_free:nums[exam]<=5,is_published:true});
}
fs.writeFileSync(new URL('data/questions.json',root),JSON.stringify(out,null,2)+'\n');
const q=v=>`'${String(v).replace(/'/g,"''")}'`;
const created=1795392000; // stable seed timestamp, avoids modifications on repeated imports
const sql=['-- Independently written starter questions. Clinician review required before charging customers.','-- This file is idempotent: previously edited questions are preserved.'];
for(const v of out){sql.push(`INSERT OR IGNORE INTO questions(id,exam,topic,difficulty,stem,choices_json,answer,explanation,reference_title,reference_url,is_free,is_published,created_at,updated_at) VALUES(${q(v.id)},${q(v.exam)},${q(v.topic)},${q(v.difficulty)},${q(v.stem)},${q(JSON.stringify(v.choices))},${v.answer},${q(v.explanation)},${q(v.reference_title)},${q(v.reference_url)},${v.is_free?1:0},1,${created},${created});`);}
fs.writeFileSync(new URL('data/seed.sql',root),sql.join('\n')+'\n');
console.log(`Created ${out.length} original draft questions (${out.filter(q=>q.is_free).length} free, ${out.filter(q=>!q.is_free).length} premium) across ${Object.keys(nums).join(', ')}.`);
