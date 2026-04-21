-- ============================================
-- Migration 005: 退回 / 撤銷 / 追蹤 / 版本紀錄
-- ============================================
-- 對應 5 大功能：
--   §1 退回修改 (returned)
--   §2 撤回修改重送 (withdrawn → pending)
--   §3 版本紀錄 (version + form_data_versions)
--   §4 已核准後撤銷 (pending_revoke / revoked)
--   §5 核准後追蹤 + 財務結案 (tracking + tracking_status + payment_*)

-- 1. requests 表新增欄位
ALTER TABLE approval.requests
  ADD COLUMN IF NOT EXISTS version             integer     DEFAULT 1,
  ADD COLUMN IF NOT EXISTS form_data_versions  jsonb       DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tracking_status     text,
  ADD COLUMN IF NOT EXISTS tracker_name        text,
  ADD COLUMN IF NOT EXISTS tracker_slack_id    text,
  ADD COLUMN IF NOT EXISTS payment_due_date    timestamptz,
  ADD COLUMN IF NOT EXISTS payment_date        timestamptz,
  ADD COLUMN IF NOT EXISTS payment_note        text,
  ADD COLUMN IF NOT EXISTS amount              numeric;

-- 2. status CHECK 放行新值：returned / tracking / pending_revoke / revoked
ALTER TABLE approval.requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE approval.requests ADD CONSTRAINT requests_status_check
  CHECK (status IN (
    'draft','pending','approved','rejected',
    'executing','in_progress','completed','closed',
    'withdrawn','deleted',
    'returned','tracking','pending_revoke','revoked'
  ));

-- 3. tracking_status CHECK（允許 NULL 即尚未進入追蹤）
ALTER TABLE approval.requests DROP CONSTRAINT IF EXISTS requests_tracking_status_check;
ALTER TABLE approval.requests ADD CONSTRAINT requests_tracking_status_check
  CHECK (tracking_status IS NULL OR tracking_status IN (
    'pending_payment','paid','pending_verification','closed'
  ));

-- 4. history.action CHECK 放行新 actions
ALTER TABLE approval.history DROP CONSTRAINT IF EXISTS history_action_check;
ALTER TABLE approval.history ADD CONSTRAINT history_action_check
  CHECK (action IN (
    'approved','rejected','withdrawn','admin_deleted',
    'executing','in_progress','completed','closed',
    'returned','resubmitted',
    'revoke_requested','revoked','revoke_rejected',
    'tracking_started','payment_marked'
  ));

-- 5. 索引（加速追蹤清單 + 版本查詢）
CREATE INDEX IF NOT EXISTS idx_requests_tracking_status
  ON approval.requests(tracking_status)
  WHERE status = 'tracking';

CREATE INDEX IF NOT EXISTS idx_requests_tracker_name
  ON approval.requests(tracker_name)
  WHERE status = 'tracking';

CREATE INDEX IF NOT EXISTS idx_requests_returned
  ON approval.requests(status)
  WHERE status IN ('returned','pending_revoke');
