-- Payhip one-time purchases, recorded only by verified server webhook.
CREATE TABLE IF NOT EXISTS payhip_purchases (
 id TEXT PRIMARY KEY,
 buyer_email TEXT NOT NULL,
 user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 product_key TEXT NOT NULL,
 currency TEXT NOT NULL,
 amount_cents INTEGER NOT NULL,
 paid_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('paid','refunded'))
);
CREATE INDEX IF NOT EXISTS idx_payhip_access ON payhip_purchases(user_id,status,expires_at);
CREATE INDEX IF NOT EXISTS idx_payhip_email ON payhip_purchases(buyer_email,user_id);
