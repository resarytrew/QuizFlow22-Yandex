-- Поток: Система сессий для отслеживания прогресса прохождения квиза
-- Создано: 2026-03-26

-- Таблица для хранения сессий прохождения квизов
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    participant_name TEXT,
    participant_email TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    score INTEGER DEFAULT 0,
    variables JSONB DEFAULT '{}',
    achievements JSONB DEFAULT '[]',
    path_data JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER
);

-- Индексы для быстрого поиска
CREATE INDEX idx_quiz_sessions_quiz_id ON quiz_sessions(quiz_id);
CREATE INDEX idx_quiz_sessions_quiz_id_status ON quiz_sessions(quiz_id, status);
CREATE INDEX idx_quiz_sessions_quiz_id_score ON quiz_sessions(quiz_id, score DESC);
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_created_at ON quiz_sessions(created_at DESC);

-- RLS политики (уже настроены для quiz_results, применяем аналогично для sessions)
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Создатель сессии может читать и обновлять свои сессии
CREATE POLICY "Users can manage own sessions" ON quiz_sessions
    FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Владелец квиза может читать все сессии своего квиза
CREATE POLICY "Quiz owners can view all sessions" ON quiz_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_sessions.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

-- Включить автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_sessions_updated_at
    BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Обновление существующей таблицы quiz_results для совместимости
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES quiz_sessions(id) ON DELETE SET NULL;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'abandoned'));
