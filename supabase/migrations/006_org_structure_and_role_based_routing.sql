-- ============================================
-- Migration 006: 組織架構表 + 角色制審批
-- ============================================
-- 目的：
--   1. 引入 approval.org_structure 儲存「人員的組織歸屬 + 角色」
--   2. 新增 approval.areas 定義區域（name + 歸屬門市清單）
--   3. routing 表加 reviewer_role，以角色取代人名（向後相容）
--
-- 對應五種角色：
--   staff           一般員工/專員
--   store_manager   門店主管（一個門市一個）
--   area_manager    區主管（一個區一個）
--   dept_head       部門主管
--   gm              總經理

-- 1. 區域定義表
CREATE TABLE IF NOT EXISTS approval.areas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand           text NOT NULL,
  name            text NOT NULL,
  location_codes  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- ['df_store_01','df_store_02']
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (brand, name)
);

-- 2. 組織架構表
CREATE TABLE IF NOT EXISTS approval.org_structure (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES approval.users(id) ON DELETE SET NULL,
  user_name       text NOT NULL,
  user_phone      text,
  user_slack_id   text,

  -- 角色（一人一角色）
  org_role        text NOT NULL CHECK (org_role IN (
                    'staff','store_manager','area_manager','dept_head','gm'
                  )),

  -- 歸屬
  brand           text,        -- 品牌代碼：double_fitness / rechill / …
  department      text,        -- 部門（marketing/hr/finance/…）—— 僅總部人員 / dept_head
  location        text,        -- 門市代碼（df_store_01/…）—— 僅門市人員 / store_manager
  area            text,        -- 區域名稱（台南區…）—— 門市人員 / store_manager / area_manager

  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 3. 唯一索引：同一 brand+location 僅一個 store_manager
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_store_manager_per_location
  ON approval.org_structure(brand, location)
  WHERE org_role = 'store_manager' AND is_active = true AND location IS NOT NULL;

-- 4. 唯一索引：同一 brand+area 僅一個 area_manager
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_area_manager_per_area
  ON approval.org_structure(brand, area)
  WHERE org_role = 'area_manager' AND is_active = true AND area IS NOT NULL;

-- 5. 唯一索引：同一 brand+department 僅一個 dept_head
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_dept_head_per_department
  ON approval.org_structure(brand, department)
  WHERE org_role = 'dept_head' AND is_active = true AND department IS NOT NULL;

-- 6. 同 phone 避免重複（軟索引）
CREATE INDEX IF NOT EXISTS idx_org_structure_phone
  ON approval.org_structure(user_phone) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_structure_role
  ON approval.org_structure(brand, org_role) WHERE is_active = true;

-- 7. 觸發器：updated_at 自動更新
CREATE TRIGGER trg_org_structure_updated
  BEFORE UPDATE ON approval.org_structure
  FOR EACH ROW EXECUTE FUNCTION approval.set_updated_at();

CREATE TRIGGER trg_areas_updated
  BEFORE UPDATE ON approval.areas
  FOR EACH ROW EXECUTE FUNCTION approval.set_updated_at();

-- 8. RLS
ALTER TABLE approval.org_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON approval.org_structure FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON approval.areas FOR ALL USING (true) WITH CHECK (true);

-- 9. routing 表加 reviewer_role（角色制）
ALTER TABLE approval.routing
  ADD COLUMN IF NOT EXISTS reviewer_role text;

ALTER TABLE approval.routing DROP CONSTRAINT IF EXISTS chk_routing_reviewer_role;
ALTER TABLE approval.routing ADD CONSTRAINT chk_routing_reviewer_role
  CHECK (reviewer_role IS NULL OR reviewer_role IN (
    'store_manager','area_manager','dept_head','gm'
  ));
