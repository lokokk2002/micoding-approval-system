-- ============================================
-- Migration 002: 結案狀態 + 路由角色擴充
-- ============================================

-- 1. requests 表新增 closed_at 欄位
ALTER TABLE approval.requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. 更新 status check constraint 加入 closed
ALTER TABLE approval.requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE approval.requests ADD CONSTRAINT requests_status_check
  CHECK (status IN ('pending','approved','rejected',
    'executing','in_progress','completed','closed','withdrawn','deleted'));

-- 3. 更新 history action check constraint 加入 closed
ALTER TABLE approval.history DROP CONSTRAINT IF EXISTS history_action_check;
ALTER TABLE approval.history ADD CONSTRAINT history_action_check
  CHECK (action IN ('approved','rejected','withdrawn',
    'admin_deleted','executing','in_progress','completed','closed'));

-- 4. routing 表：移除舊的承辦人欄位，新增三角色欄位
-- 新增 reviewer_phone
ALTER TABLE approval.routing ADD COLUMN IF NOT EXISTS reviewer_phone TEXT;

-- 新增追蹤人欄位
ALTER TABLE approval.routing ADD COLUMN IF NOT EXISTS tracker_name TEXT;
ALTER TABLE approval.routing ADD COLUMN IF NOT EXISTS tracker_phone TEXT;
ALTER TABLE approval.routing ADD COLUMN IF NOT EXISTS tracker_slack_id TEXT;

-- 新增結案人欄位
ALTER TABLE approval.routing ADD COLUMN IF NOT EXISTS closer_name TEXT;
ALTER TABLE approval.routing ADD COLUMN IF NOT EXISTS closer_phone TEXT;
ALTER TABLE approval.routing ADD COLUMN IF NOT EXISTS closer_slack_id TEXT;

-- 5. 將舊的 assignee 資料遷移到 tracker（承辦人 → 追蹤人）
UPDATE approval.routing
SET tracker_name = assignee_name,
    tracker_phone = assignee_phone,
    tracker_slack_id = assignee_slack_id
WHERE assignee_name IS NOT NULL AND tracker_name IS NULL;

-- 6. 新增 closed 狀態索引
CREATE INDEX IF NOT EXISTS idx_requests_closed ON approval.requests(status) WHERE status = 'closed';
