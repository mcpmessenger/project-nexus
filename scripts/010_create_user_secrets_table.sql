-- Create user_secrets table to store per-user configuration secrets (API keys, etc.)
CREATE TABLE IF NOT EXISTS user_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Index for faster lookups per user
CREATE INDEX IF NOT EXISTS idx_user_secrets_user_id ON user_secrets(user_id);

-- Enable row level security
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their secrets"
  ON user_secrets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their secrets"
  ON user_secrets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their secrets"
  ON user_secrets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their secrets"
  ON user_secrets FOR DELETE
  USING (auth.uid() = user_id);
