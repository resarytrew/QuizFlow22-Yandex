-- Поток: Усиление безопасности сессий и результатов (FIXED TYPE CASTING)
-- Дата: 2026-06-01

-- 1. СТРУКТУРА ДАННЫХ
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS session_token TEXT;
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_token ON quiz_sessions(id, session_token);

-- 2. ПОЛИТИКИ ДЛЯ quiz_sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Quiz owners can view all sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "sessions_select_owner_or_quiz_owner" ON quiz_sessions;
DROP POLICY IF EXISTS "sessions_insert_published_only" ON quiz_sessions;
DROP POLICY IF EXISTS "sessions_update_named_owner" ON quiz_sessions;

-- 2a) SELECT: Применяем явное приведение к ::uuid
CREATE POLICY "sessions_select_owner_or_quiz_owner" ON quiz_sessions
    FOR SELECT
    USING (
        auth.uid() = user_id::uuid  -- Приводим user_id к uuid
        OR EXISTS (
            SELECT 1 FROM quizzes
            WHERE quizzes.id::uuid = quiz_sessions.quiz_id::uuid -- Сравниваем как uuid
              AND quizzes.user_id::uuid = auth.uid()
        )
    );

-- 2b) INSERT
CREATE POLICY "sessions_insert_published_only" ON quiz_sessions
    FOR INSERT
    WITH CHECK (
        (user_id IS NULL OR user_id::uuid = auth.uid())
        AND EXISTS (
            SELECT 1 FROM quizzes
            WHERE quizzes.id::uuid = quiz_sessions.quiz_id::uuid
              AND quizzes.is_published = true
        )
    );

-- 2c) UPDATE
CREATE POLICY "sessions_update_named_owner" ON quiz_sessions
    FOR UPDATE
    USING (auth.uid() IS NOT NULL AND auth.uid() = user_id::uuid);

-- 3. ПОЛИТИКИ ДЛЯ quiz_results
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "results_select_owner_or_quiz_owner" ON quiz_results;
DROP POLICY IF EXISTS "results_select_quiz_owner" ON quiz_results;

-- SELECT для результатов с исправлением типов
CREATE POLICY "results_select_owner_or_quiz_owner" ON quiz_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quizzes
            WHERE quizzes.id::uuid = quiz_results.quiz_id::uuid
              AND quizzes.user_id::uuid = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM quiz_sessions
            WHERE quiz_sessions.id::uuid = quiz_results.session_id::uuid
              AND quiz_sessions.user_id::uuid = auth.uid()
        )
    );