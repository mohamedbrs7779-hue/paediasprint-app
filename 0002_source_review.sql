-- Owner-only PDF review archive. Never expose through student endpoints.
CREATE TABLE IF NOT EXISTS source_pages (
 page_number INTEGER PRIMARY KEY CHECK(page_number BETWEEN 1 AND 874),
 section TEXT NOT NULL,
 collection TEXT NOT NULL,
 role TEXT NOT NULL,
 extract_type TEXT NOT NULL CHECK(extract_type IN ('text_extracted','image_or_low_text')),
 possible_questions INTEGER NOT NULL DEFAULT 0,
 raw_text TEXT NOT NULL,
 review_status TEXT NOT NULL DEFAULT 'not_reviewed',
 rights_status TEXT NOT NULL DEFAULT 'permission_not_checked',
 reviewer_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_source_pages_section ON source_pages(section,page_number);
CREATE INDEX IF NOT EXISTS idx_source_pages_review ON source_pages(review_status,page_number);
-- Extensible teaching notes, one entry for each independently authored question.
CREATE TABLE IF NOT EXISTS teaching_notes (
 question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
 source_pdf_page INTEGER CHECK(source_pdf_page BETWEEN 1 AND 874),
 evidence_level TEXT NOT NULL DEFAULT 'UK_guidance_checked',
 exam_pearl TEXT NOT NULL DEFAULT '',
 distractors_json TEXT NOT NULL DEFAULT '[]',
 additional_refs_json TEXT NOT NULL DEFAULT '[]',
 editorial_status TEXT NOT NULL DEFAULT 'clinician_signoff_pending',
 rights_basis TEXT NOT NULL DEFAULT 'independently_authored',
 last_evidence_review TEXT NOT NULL DEFAULT '2026-11-23'
);
