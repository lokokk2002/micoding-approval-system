-- ============================================
-- 審批管理系統 Schema v2.0
-- ============================================
CREATE SCHEMA IF NOT EXISTS approval;

-- 1. 用戶表
CREATE TABLE approval.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  role            TEXT NOT NULL DEFAULT 'employee'
    CHECK (role IN ('super_admin','reviewer','employee')),
  brand           TEXT,
  location        TEXT,
  slack_id        TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 申請主表
CREATE TABLE approval.requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number    TEXT UNIQUE NOT NULL,
  category          TEXT NOT NULL,
  type              TEXT NOT NULL,
  brand             TEXT NOT NULL CHECK (brand IN ('double_fitness','rechill')),
  location          TEXT NOT NULL,
  applicant_name    TEXT NOT NULL,
  applicant_phone   TEXT NOT NULL,
  applicant_email   TEXT NOT NULL,
  form_data         JSONB NOT NULL DEFAULT '{}',
  attachments       JSONB DEFAULT '[]',
  is_urgent         BOOLEAN DEFAULT FALSE,
  current_level     INT DEFAULT 1,
  status            TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected',
      'executing','in_progress','completed','withdrawn','deleted')),
  assignee_name     TEXT,
  assignee_phone    TEXT,
  assignee_slack_id TEXT,
  execution_deadline TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 審批歷程表
CREATE TABLE approval.history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES approval.requests(id),
  level           INT NOT NULL,
  actor_name      TEXT NOT NULL,
  actor_role      TEXT,
  action          TEXT NOT NULL
    CHECK (action IN ('approved','rejected','withdrawn',
      'admin_deleted','executing','in_progress','completed')),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 審批路由與承辦人設定表
CREATE TABLE approval.routing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand             TEXT NOT NULL,
  location          TEXT NOT NULL,
  category          TEXT DEFAULT 'all',
  level             INT NOT NULL,
  reviewer_name     TEXT,
  reviewer_slack_id TEXT,
  assignee_name     TEXT,
  assignee_phone    TEXT,
  assignee_slack_id TEXT
);

-- 索引
CREATE INDEX idx_users_phone ON approval.users(phone);
CREATE INDEX idx_users_role ON approval.users(role);
CREATE INDEX idx_requests_status ON approval.requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_requests_brand ON approval.requests(brand, location);
CREATE INDEX idx_requests_applicant ON approval.requests(applicant_phone);
CREATE INDEX idx_requests_assignee ON approval.requests(assignee_phone);
CREATE INDEX idx_requests_urgent ON approval.requests(is_urgent) WHERE status = 'pending';
CREATE INDEX idx_history_request ON approval.history(request_id, level);
CREATE INDEX idx_routing_lookup ON approval.routing(brand, location, category, level);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION approval.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_requests_updated
  BEFORE UPDATE ON approval.requests
  FOR EACH ROW EXECUTE FUNCTION approval.set_updated_at();

-- RLS 政策
ALTER TABLE approval.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.routing ENABLE ROW LEVEL SECURITY;

-- 允許 service role 完整存取
CREATE POLICY "Service role full access" ON approval.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON approval.requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON approval.history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON approval.routing FOR ALL USING (true) WITH CHECK (true);
