-- ============================================
-- Migration 003: 角色改為 user / reviewer / admin
-- ============================================

-- 1. 將舊角色轉換
UPDATE approval.users SET role = 'admin' WHERE role = 'super_admin';
UPDATE approval.users SET role = 'user' WHERE role = 'employee';

-- 2. 更新 role check constraint
ALTER TABLE approval.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE approval.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'reviewer', 'admin'));

-- 3. 預設值
ALTER TABLE approval.users ALTER COLUMN role SET DEFAULT 'user';
