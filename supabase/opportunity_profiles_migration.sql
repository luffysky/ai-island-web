-- 機會島 V2：我的機會檔案（存一次、所有 AI 工具自動帶入，不用每次重打）。
-- 冪等、加法。跑法：node scripts/run-sql.mjs supabase/opportunity_profiles_migration.sql

CREATE TABLE IF NOT EXISTS public.opportunity_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  identity text,          -- 身分（學生／上班族／創業者／自由工作者…）
  assets text,            -- 擁有什麼（作品／Demo／技能／團隊／資源…）
  stage text,             -- 完成度（只有點子／雛形／有 Demo／已上線／有營收…）
  interests text[],       -- 想參加的類型（AI／創業／設計／黑客松…）
  about text,             -- 綜合自我描述（AI 讀規則/適合度/生成 直接用這段）
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunity_profiles_own ON public.opportunity_profiles;
CREATE POLICY opportunity_profiles_own ON public.opportunity_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
