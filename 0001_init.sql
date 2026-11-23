CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 salt TEXT NOT NULL,
 verified INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 stripe_customer_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_tokens (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, purpose);
CREATE TABLE IF NOT EXISTS subscriptions (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 stripe_subscription_id TEXT UNIQUE,
 stripe_customer_id TEXT,
 status TEXT NOT NULL,
 price_id TEXT,
 current_period_end INTEGER NOT NULL DEFAULT 0,
 cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sub_customer ON subscriptions(stripe_customer_id);
CREATE TABLE IF NOT EXISTS questions (
 id TEXT PRIMARY KEY,
 exam TEXT NOT NULL CHECK(exam IN ('FOP','TAS','AKP')),
 topic TEXT NOT NULL,
 difficulty TEXT NOT NULL CHECK(difficulty IN ('Foundation','Intermediate','Advanced')),
 stem TEXT NOT NULL,
 choices_json TEXT NOT NULL,
 answer INTEGER NOT NULL CHECK(answer BETWEEN 0 AND 4),
 explanation TEXT NOT NULL,
 reference_title TEXT NOT NULL DEFAULT '',
 reference_url TEXT NOT NULL DEFAULT '',
 is_free INTEGER NOT NULL DEFAULT 0,
 is_published INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_public ON questions(exam,is_published,is_free,topic);
CREATE TABLE IF NOT EXISTS attempts (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
 selected_answer INTEGER NOT NULL CHECK(selected_answer BETWEEN 0 AND 5),
 is_correct INTEGER NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('practice','mock')),
 answered_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user_date ON attempts(user_id,answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_user_question ON attempts(user_id,question_id);
CREATE TABLE IF NOT EXISTS bookmarks (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,question_id)
);
CREATE TABLE IF NOT EXISTS stripe_events (
 id TEXT PRIMARY KEY,
 processed_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 rate_key TEXT NOT NULL,
 bucket INTEGER NOT NULL,
 count INTEGER NOT NULL,
 PRIMARY KEY(rate_key,bucket)
);
