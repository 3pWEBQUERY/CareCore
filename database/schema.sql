CREATE TABLE IF NOT EXISTS carecore_users (
  id UUID PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'user',
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS carecore_users_username_lower_idx
  ON carecore_users (LOWER(username));

CREATE TABLE IF NOT EXISTS carecore_sessions (
  id UUID PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carecore_sessions_expiry_idx
  ON carecore_sessions (expires_at);

INSERT INTO carecore_users (id, username, display_name, role, password_hash)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Admin',
  'CareCore Administrator',
  'admin',
  'scrypt:01a0fdc66a4455589c11381adeb7f306:653cb4f3ad74171c86dd33e71582ab3cca7c7f75734302e64fac4cc60c99033911bb3f981397df4e0049ccbc72a1d40adf5824bcb710ee1e4c8c4ea537ba372f'
)
ON CONFLICT DO NOTHING;
