-- 004: 新增密碼欄位，防止冒名登入
-- 用 bcryptjs 加密儲存，password_hash 永遠不傳到前端

ALTER TABLE approval.users ADD COLUMN password_hash TEXT;

-- 備註：既有使用者的 password_hash 為 NULL
-- 管理員須在後台「用戶管理」為每位使用者設定密碼後，密碼登入才會生效
-- 登入 API 會檢查：若使用者有設密碼 → 必須輸入正確密碼；若尚未設密碼 → 回傳提示請管理員設定
