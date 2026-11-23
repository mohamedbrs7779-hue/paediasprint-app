"""Independently authored MRCPCH-themed educational items, not transcriptions.
UK references checked 2026-11-23; requires clinician review before paid publication.
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent.parent
items=[]
def item(exam,topic,page,stem,choices,answer,explanation,ref_title,ref_url,pearl,why,difficulty='Intermediate',other=None):
  count=sum(z['exam']==exam for z in items)+1
  assert len(choices)==5 and 0<=answer<5 and len(why)==4 and ref_url.startswith('https://')
  assert len(stem)>25 and len(explanation)>25 and len(set(choices))==5
  obj=dict(id=f'uk-{exam.lower()}-{count:03}',exam=exam,topic=topic,difficulty=difficulty,stem=stem,choices=choices,answer=answer,explanation=explanation,reference_title=ref_title,reference_url=ref_url,is_free=(count<=5),is_published=False)
  obj['teaching']={'source_pdf_page':page,'evidence_level':'UK guideline / institutional reference independently checked','exam_pearl':pearl,'distractors':[{'option':'ABCDE'[i], 'why_not':str(reason)} for i,reason in enumerate(why) if i!=answer] if False else [],'additional_refs':other or [],'editorial_status':'clinician_signoff_pending','rights_basis':'independently_authored','last_evidence_review':'2026-11-23'}
  # why is a 5-member list below when provided; produce exactly one commentary for each incorrect option
  why_map = why if isinstance(why,dict) else None
  if why_map is None:
    why_map={i:w for i,w in zip((i for i in range(5) if i!=answer), why)}
  obj['teaching']['distractors']=[{'option':'ABCDE'[i],'why_not':str(why_map[i])} for i in range(5) if i!=answer]
  items.append(obj)
item('FOP','Dermatology',9,
 'A child with established atopic eczema develops many similar painful vesicles and punched-out erosions over a short period. Her parent reports a recent oral herpes lesion. What is the priority action?',
 ['Use emollients alone for 48 hours','Start systemic aciclovir promptly and arrange same-day specialist assessment','Prescribe an oral antihistamine as sole treatment','Apply a potent topical steroid without reassessment','Recommend an elimination diet'],1,
 'The clustered, monomorphic vesicles and painful erosions in a child with eczema suggest eczema herpeticum, a potentially serious HSV infection. NICE CG57 recommends immediate systemic aciclovir and same-day dermatology advice. The route depends on illness severity; eye involvement requires same-day ophthalmology as well.',
 'NICE CG57 — Atopic eczema in under 12s','https://www.nice.org.uk/guidance/cg57/chapter/recommendations',
 'Do not delay treatment of suspected eczema herpeticum while awaiting viral confirmation.',
 ['Emollients do not treat disseminated HSV.','Antihistamines do not treat the viral infection.','Topical steroids alone do not address eczema herpeticum.','Dietary restriction has no role in acute suspected HSV infection.'])
item('FOP','Dermatology',9,
 'During follow-up, parents of a child with eczema are uncertain how often to use moisturising therapy. Which foundational advice aligns with UK guidance?',
 ['Stop emollients when the rash clears','Use fragrance-free emollients regularly, including on skin that looks clear','Use antibiotics whenever itching increases','Avoid bathing completely','Replace emollients with oral antihistamines'],1,
 'Regular emollient use is a cornerstone of atopic eczema care. NICE recommends a choice of unperfumed emollients used daily for moisturising, washing and bathing, including when eczema is clear, with instruction on quantities and technique. Anti-inflammatory treatment is added according to severity.',
 'NICE CG57 — Atopic eczema','https://www.nice.org.uk/guidance/cg57/chapter/recommendations',
 'Maintenance barrier care continues between flares.',
 ['Barrier care should continue after improvement.','Increased itch alone does not justify antibiotics.','Routine complete avoidance of bathing is not advised.','Antihistamines are not substitutes for adequate skin-barrier treatment.'],difficulty='Foundation')
item('FOP','Dermatology',9,
 'A child has eczema with spreading crusting and new fever, lethargy and poor oral intake. What is the safest next step?',
 ['Reassure without examination','Use a topical antibiotic only regardless of severity','Urgently assess for systemic illness and treat infection according to severity','Prescribe antifungal cream as first-line','Advise the family to wait for a routine review next week'],2,
 'Systemic features in possible bacterial eczema infection warrant prompt clinical assessment for serious illness, including sepsis. NICE NG190 differentiates localised infection in a well patient from disease in a systemically unwell patient. Antibiotic route and admission depend on the actual severity and examination.',
 'NICE NG190 — Secondary bacterial infection of eczema','https://www.nice.org.uk/guidance/ng190/chapter/Recommendations',
 'Crusting alone does not automatically mean antibiotics; fever and systemic illness change the risk assessment.',
 ['Lethargy and poor feeding require assessment.','Topical treatment alone is not an adequate blanket response to systemic illness.','Fungal infection is not the leading concern here.','A delayed review is unsafe with systemic features.'])
item('FOP','Respiratory',10,
 'A thriving young infant has inspiratory noise that is more noticeable while feeding or crying but diminishes during quiet sleep. There is no sudden onset. Which condition is most consistent?',
 ['Foreign-body aspiration','Laryngomalacia','Asthma','Viral bronchiolitis','Epiglottitis'],1,
 'Laryngomalacia is a common cause of early infancy inspiratory stridor. Dynamic collapse of supraglottic structures leads to symptoms that can worsen with crying and feeding. Persistent stridor warrants clinical assessment and feeding/weight evaluation; severe symptoms may need airway review.',
 'Sheffield Children’s NHS — Laryngomalacia','https://library.sheffieldchildrens.nhs.uk/laryngomalacia-or-floppy-larynx/',
 'Noise starting early in infancy and varying with feeding supports a dynamic upper-airway cause.',
 ['Foreign-body aspiration typically has a sudden event.','Asthma usually produces expiratory wheeze, not isolated inspiratory stridor.','Bronchiolitis usually features an acute respiratory illness.','Epiglottitis is an acute potentially life-threatening presentation.'])
item('FOP','Respiratory',10,
 'A preschool child develops hoarse speech, a seal-like cough and noisy inspiration after a cold. Which diagnosis is most likely?',
 ['Acute bacterial pneumonia','Viral croup','Bronchiectasis','Allergic rhinitis','Chronic asthma'],1,
 'Viral croup causes laryngeal and subglottic inflammation, producing a barking cough, hoarse voice and inspiratory stridor, often after a viral prodrome. Assess work of breathing and stridor at rest to identify illness severity.',
 'NHS — Croup','https://www.nhs.uk/conditions/croup/',
 'Barking cough plus inspiratory stridor localises the problem to the upper airway.',
 ['Pneumonia does not characteristically give barking cough.','Bronchiectasis is a chronic lower-airway disorder.','Rhinitis does not explain barking cough with stridor.','Asthma causes wheeze rather than characteristic inspiratory stridor.'],difficulty='Foundation')
item('FOP','Respiratory',10,
 'An infant develops progressively louder stridor over several weeks. Several bright red superficial vascular birthmarks are noted on the skin. Which airway lesion merits particular consideration?',
 ['Subglottic haemangioma','Adenoidal hypertrophy','Acute epiglottitis','Bilateral otitis media','Viral pharyngitis'],0,
 'Progressive stridor in early infancy associated with cutaneous infantile haemangiomas raises concern for an airway haemangioma. The RCPCH published specimen reasoning selects subglottic haemangioma for its corresponding scenario, whereas an older abbreviated key differed. This is a clinical warning, not proof that every infant with skin lesions has airway involvement.',
 'RCPCH — FOP specimen answer key and reasoning (2026)','https://www.rcpch.ac.uk/sites/default/files/2026-02/fop_specimen_paper_-_answer_key_and_reasoning_final.pdf',
 'Consider subglottic haemangioma in a progressively noisy infant; evaluate urgently if distressed.',
 ['Adenoidal enlargement is uncommon as the cause of progressive stridor in a young infant.','Epiglottitis is usually an acute severe illness.','Ear infection does not cause progressive airway stridor.','Viral pharyngitis is unlikely to cause a progressive weeks-long course.'])
item('FOP','Haematology',12,
 'A previously well child presents with new petechiae and bruises after a recent viral illness. They are afebrile, active and have no bone pain or weight loss. Which condition is a key differential?',
 ['Immune thrombocytopenia','Acute leukaemia with systemic symptoms','Haemophilia A','Hereditary spherocytosis','Henoch–Schönlein purpura'],0,
 'Immune thrombocytopenia often presents in an otherwise well child with sudden petechiae or bruising after a viral infection. The diagnosis requires evaluation including blood count and film, with alternative causes of thrombocytopenia excluded; never infer the platelet count from appearance alone.',
 'Frimley Health NHS — Immune thrombocytopenia','https://www.fhft.nhs.uk/patients-and-visitors/patient-information-library/immune-thrombocytopenia-itp',
 'Well child + sudden petechiae after virus suggests ITP, but confirm with FBC and review the film.',
 ['Leukaemia is important to exclude, but constitutional or bone features increase suspicion.','Haemophilia more commonly produces deep-tissue or joint bleeding.','Spherocytosis presents chiefly with haemolysis.','IgA vasculitis typically has palpable purpura and a different symptom pattern.'])
item('FOP','Haematology',12,
 'A child with a known haemoglobinopathy develops intense limb pain following exposure to cold, with anaemia and intermittent jaundice. Which event best explains the pain?',
 ['Thrombocytopenic bleeding','Vaso-occlusive sickle cell pain episode','Immune-mediated haemolytic anaemia alone','Acute appendicitis','Juvenile idiopathic arthritis'],1,
 'In sickle cell disease, sickled erythrocytes obstruct microvascular flow, causing painful vaso-occlusive episodes. Cold exposure may be a trigger. Jaundice can reflect ongoing haemolysis. An unwell child still requires assessment for infection and acute chest syndrome rather than assuming every pain episode is uncomplicated.',
 'NHS — Sickle cell disease','https://www.nhs.uk/conditions/sickle-cell-disease/',
 'Cold exposure + bone pain + haemolytic features is a high-yield sickle cell pattern.',
 ['A platelet disorder is not the typical mechanism for limb pain.','Haemolysis alone does not explain vaso-occlusive bone pain.','Appendicitis does not explain this haemoglobinopathy pattern.','Inflammatory arthritis follows a different clinical course.'])
item('FOP','Neonatology',11,
 'A baby fails newborn hearing screening. A congenital viral infection is confirmed and long-term audiological follow-up is arranged because hearing loss may develop or progress later. Which infection is particularly relevant?',
 ['Congenital cytomegalovirus','Hepatitis A','Rotavirus','Parvovirus B19 acquired after birth','Rhinovirus'],0,
 'Congenital cytomegalovirus is an important non-genetic cause of childhood sensorineural hearing loss. Some infants are asymptomatic at birth, and hearing loss may be delayed or progressive. NHS resources describe the need for appropriate hearing assessment and follow-up after confirmed congenital CMV.',
 'NHS — Cytomegalovirus (CMV)','https://www.nhs.uk/conditions/cytomegalovirus-cmv/',
 'Do not rely on a single normal hearing screen to exclude later hearing loss in congenital CMV.',
 ['Hepatitis A is not a typical cause of congenital progressive hearing loss.','Rotavirus commonly causes gastroenteritis.','Postnatal parvovirus is not the classic congenital hearing-loss infection.','Rhinovirus does not cause this congenital syndrome.'],other=[{'title':'UCLH NHS — Congenital CMV','url':'https://www.uclh.nhs.uk/patients-and-visitors/patient-information-pages/what-expect-after-congenital-cytomegalovirus-diagnosis'}])
item('FOP','Public Health',16,
 'Parents of a newborn ask about a simple sleep-position intervention that reduces the risk of sudden infant death syndrome. What should be recommended for every sleep?',
 ['Prone sleeping to avoid reflux','Side positioning with cushions','Supine sleeping on a firm, flat, separate sleep surface','Sleeping on a sofa with an adult','Placing soft toys around the infant'],2,
 'UK safer-sleep advice recommends putting babies on their back for every sleep, on a firm and flat surface, with a clear cot. Sofa sleeping and soft loose bedding are unsafe. The recommendation applies to routine sleep unless a specialist provides a specific alternative plan for a rare clinical circumstance.',
 'NHS — Sudden infant death syndrome','https://www.nhs.uk/baby/caring-for-a-newborn/sudden-infant-death-syndrome-sids/',
 'Back to sleep, clear cot, firm flat mattress.',
 ['Prone placement is associated with increased SIDS risk.','Cushions create an unsafe sleep environment.','Sofas are high-risk sleep settings.','Loose soft items are unsafe in the cot.'],difficulty='Foundation')
item('FOP','Immunisation',16,
 'A child has a documented immediate allergy to hen egg but no known reaction to vaccine components. The family asks whether an indicated measles-containing vaccination must be postponed solely because of egg allergy. What is the current UK advice?',
 ['Egg allergy alone is not a reason to defer routine measles-containing vaccination','Defer all measles-containing vaccines until adolescence','Give only mumps vaccine','Administer vaccine only after a strict egg-free diet','Require a negative egg skin test before every dose'],0,
 'Current UK immunisation guidance states that MMR and MMRV vaccines can be given to children with egg allergy, including severe allergy, under routine arrangements. Follow the age-appropriate current UK schedule and investigate any previous true vaccine-component anaphylaxis separately.',
 'NHS — Vaccine safety','https://www.nhs.uk/vaccinations/why-vaccination-is-important-and-the-safest-way-to-protect-yourself/',
 'Egg allergy is not a contraindication to routine MMR/MMRV vaccines; check actual vaccine-component allergy.',
 ['Deferral based on egg allergy alone is not supported.','Single-antigen substitution is not indicated for this reason.','Dietary changes do not alter vaccine safety.','Routine egg skin testing is unnecessary.'],other=[{'title':'UKHSA — MMRV vaccination guide','url':'https://www.gov.uk/government/publications/mmrv-vaccination/mmrv-vaccination-a-guide-for-parents-and-carers'}])
item('FOP','Neonatology',17,
 'A term newborn develops a substantial cephalhaematoma after an assisted delivery but is feeding normally. Which complication should be actively watched for over the following days?',
 ['Renal failure','Hyperbilirubinaemia','Congenital hypothyroidism','Persistent pulmonary hypertension','Neonatal diabetes'],1,
 'Breakdown of pooled blood within a cephalhaematoma can increase unconjugated bilirubin load. Jaundice should be assessed using measured bilirubin and age-in-hours thresholds according to NICE neonatal jaundice guidance, with further monitoring determined by the clinical course.',
 'NICE CG98 — Jaundice in newborn babies','https://www.nice.org.uk/guidance/cg98/chapter/recommendations',
 'After cephalhaematoma, pay attention to bilirubin; management depends on actual measured levels.',
 ['Kidney injury is not the usual direct consequence.','The haematoma does not cause thyroid hormone deficiency.','Pulmonary hypertension is not a direct complication of scalp haematoma.','Neonatal diabetes is not explained by haemoglobin breakdown.'])
item('FOP','Infectious Diseases',81,
 'A young unvaccinated child develops fever, cough, conjunctivitis and coryza before a widespread maculopapular rash appears. Which infection is the priority public-health consideration?',
 ['Measles','Scarlet fever','Hand-foot-and-mouth disease','Chickenpox','Roseola infantum'],0,
 'A prodrome with fever, the three Cs (cough, coryza and conjunctivitis), followed by a spreading rash suggests measles. Urgent infection-control precautions and notification pathways matter because measles is highly contagious. Confirm according to local testing and public-health protocol.',
 'NHS England — Measles guidance for healthcare services','https://www.england.nhs.uk/long-read/measles-guidance-for-healthcare-services/',
 'Measles is a clinical and public-health urgency; consider isolation and notification.',
 ['Scarlet fever often includes pharyngitis and a sandpaper rash.','HFMD typically affects hands, feet and oral mucosa.','Varicella has characteristic evolving vesicles.','Roseola commonly features rash as fever resolves.'])
item('TAS','Genetics',4,
 'During RNA processing, which region of a typical eukaryotic protein-coding gene is transcribed into precursor RNA but removed during splicing?',
 ['Promoter only','Intron','Mature coding exon','Telomere','Centromere'],1,
 'Introns are intervening sequences transcribed into pre-mRNA and normally removed during RNA splicing. Exons remain in the processed transcript. Abnormal splice sites can change exon inclusion and disrupt protein production.',
 'NHS Genomics Education — Introns','https://www.genomicseducation.hee.nhs.uk/glossary/introns/',
 'Intron = spliced out; exon = retained in mature RNA.',
 ['Promoters regulate transcription but are not the spliced intronic sequence.','Coding exons normally remain in mature mRNA.','Telomeres cap chromosomes.','Centromeres contribute to chromosome segregation.'],difficulty='Foundation')
item('TAS','Genetics',4,
 'A researcher describes the portions of a gene that remain joined in mature messenger RNA after pre-mRNA splicing. What are these portions called?',
 ['Enhancers','Introns','Exons','Centrioles','Histones'],2,
 'Exons are the sections retained in mature RNA after introns are removed. Some exons contribute untranslated regions, so describing all exons as exclusively protein coding is an oversimplification.',
 'NHS Genomics Education — Exons','https://www.genomicseducation.hee.nhs.uk/glossary/exons/',
 'Exons are retained in the final processed RNA, including untranslated segments.',
 ['Enhancers are regulatory DNA sequences.','Introns are usually removed by splicing.','Centrioles are cellular structures.','Histones are chromatin-associated proteins.'],difficulty='Foundation')
item('TAS','Genetics',4,
 'A human cell contains one copy of each autosome and a single sex chromosome rather than the usual diploid complement. Which term best describes its chromosome state?',
 ['Triploid','Tetraploid','Aneuploid','Haploid','Mosaic'],3,
 'Human gametes are normally haploid, containing one set of chromosomes (n=23). This differs from diploid somatic cells (2n=46). Aneuploidy describes a gain or loss of individual chromosomes rather than the normal complete haploid set.',
 'NHS Genomics Education — Haploid','https://www.genomicseducation.hee.nhs.uk/glossary/haploid/',
 'Human haploid = 23 chromosomes; diploid = 46.',
 ['Triploidy contains three sets of chromosomes.','Tetraploidy contains four sets.','Aneuploidy is a chromosome-number imbalance, not normal n.','Mosaicism means two or more genetically different cell populations.'],difficulty='Foundation')
item('TAS','Haematology',4,
 'A patient with alpha-thalassaemia is diagnosed with haemoglobin H disease. How many of the four alpha-globin genes are typically non-functional or deleted?',
 ['One','Two','Three','Four','None'],2,
 'Haemoglobin H (HbH) disease typically reflects loss or dysfunction of three alpha-globin genes. Two-gene disease often represents alpha-thalassaemia trait; four-gene loss is associated with haemoglobin Bart’s hydrops fetalis / alpha-thalassaemia major.',
 'UCLH NHS — Alpha thalassaemia','https://www.uclh.nhs.uk/patients-and-visitors/patient-information-pages/alpha-thalassaemia',
 'HbH = three affected alpha genes; alpha-thalassaemia major = four.',
 ['One gene gives a silent-carrier state in typical classification.','Two genes cause alpha-thalassaemia trait.','Four affected genes cause alpha-thalassaemia major.','Unaffected genes do not account for HbH disease.'])
item('FOP','Haematology',12,
 'A child has several weeks of limb pain, reduced energy, fever and newly noticed bruising. Anaemia and petechiae are found. Which diagnosis must be urgently investigated?',
 ['Allergic urticaria','Iron deficiency without other pathology','Acute lymphoblastic leukaemia','Uncomplicated viral rhinitis','Atopic dermatitis'],2,
 'Bone pain, constitutional symptoms, anaemia and bleeding signs raise concern for acute leukaemia due to marrow infiltration and cytopenias. Urgent blood count, blood film and paediatric review are appropriate. Some children with ALL have atypical initial presentations, so do not dismiss persistent bone pain with bruising.',
 'RCPCH — FOP specimen reasoning (2026)','https://www.rcpch.ac.uk/sites/default/files/2026-02/fop_specimen_paper_-_answer_key_and_reasoning_final.pdf',
 'Bone pain + anaemia + bruising/petechiae warrants urgent haematology assessment.',
 ['Hives alone do not cause cytopenia.','Isolated iron deficiency does not usually cause petechiae and bone pain.','A simple coryzal illness does not explain prolonged marrow-related symptoms.','Eczema does not explain systemic bruising and bone pain.'])
item('TAS','Haematology',4,
 'In a red-cell genetics tutorial, haemoglobin C is discussed as an example of which type of molecular defect?',
 ['Whole-chromosome trisomy','Single beta-globin amino-acid substitution','Deletion of three alpha-globin genes','Red-cell membrane protein deficiency','Mitochondrial DNA deletion'],1,
 'Haemoglobin C is a structural beta-globin variant caused by an amino-acid substitution (classically glutamic acid to lysine at beta-chain position 6). It is a qualitative globin-chain abnormality, unlike HbH disease, which reflects alpha-globin gene loss.',
 'NHS Genomics Education — Genetic glossary','https://www.genomicseducation.hee.nhs.uk/glossary/',
 'Differentiate haemoglobin variants (qualitative) from thalassaemias (often quantitative).',
 ['Trisomy affects chromosome number.','Three-alpha-gene loss produces HbH disease, not HbC.','A membrane protein defect causes hereditary spherocytosis.','Mitochondrial deletion is not the molecular lesion of HbC.'],other=[{'title':'UK source bank — Haematology summary','url':'https://www.rcpch.ac.uk/education-careers/examinations/theory/structure-syllabi'}])
# Rewrite notes/data while avoiding original specimen wording. Kept pending for independent clinical signoff.
root=ROOT/'data';root.mkdir(exist_ok=True)
(root/'uk_teaching_questions.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
def sql_quote(s):return "'"+str(s).replace("'","''")+"'"
sql=['-- Independently authored UK-source-backed educational questions.','-- Unpublished by default. A qualified clinician must approve for commercial use.','BEGIN TRANSACTION;']
for q in items:
 t=q['teaching']
 sql.append('INSERT OR IGNORE INTO questions(id,exam,topic,difficulty,stem,choices_json,answer,explanation,reference_title,reference_url,is_free,is_published,created_at,updated_at) VALUES('+','.join([sql_quote(q['id']),sql_quote(q['exam']),sql_quote(q['topic']),sql_quote(q['difficulty']),sql_quote(q['stem']),sql_quote(json.dumps(q['choices'],ensure_ascii=False)),str(q['answer']),sql_quote(q['explanation']),sql_quote(q['reference_title']),sql_quote(q['reference_url']), '1' if q['is_free'] else '0','0','1795392000','1795392000'])+');')
 sql.append('INSERT OR IGNORE INTO teaching_notes(question_id,source_pdf_page,evidence_level,exam_pearl,distractors_json,additional_refs_json,editorial_status,rights_basis,last_evidence_review) VALUES('+','.join([sql_quote(q['id']),str(t['source_pdf_page']),sql_quote(t['evidence_level']),sql_quote(t['exam_pearl']),sql_quote(json.dumps(t['distractors'],ensure_ascii=False)),sql_quote(json.dumps(t['additional_refs'],ensure_ascii=False)),sql_quote(t['editorial_status']),sql_quote(t['rights_basis']),sql_quote(t['last_evidence_review'])])+');')
sql.append('COMMIT;')
(root/'uk_teaching_seed.sql').write_text('\n'.join(sql)+'\n')
print('authored',len(items),'questions, unpublished:',sum(not x['is_published'] for x in items),'FOP/TAS', {a:sum(q['exam']==a for q in items) for a in ['FOP','TAS']})
