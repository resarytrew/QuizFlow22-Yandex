-- Keep a reviewed snapshot separate from the editable document.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS published_quiz_data jsonb;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS published_name text;
CREATE OR REPLACE FUNCTION public.quiz_public_content(doc jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT (doc - 'editorOrder') || jsonb_build_object('nodes', COALESCE((
  SELECT jsonb_agg(jsonb_set(n, '{data}', COALESCE(n->'data','{}'::jsonb) - 'editorNote') ORDER BY ordinal)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(doc->'nodes')='array' THEN doc->'nodes' ELSE '[]'::jsonb END) WITH ORDINALITY AS item(n, ordinal)
 ),'[]'::jsonb));
$$;
UPDATE public.quizzes SET published_quiz_data=public.quiz_public_content(quiz_data), published_name=name
WHERE moderation_status='approved' AND published_quiz_data IS NULL;

CREATE OR REPLACE FUNCTION public.quiz_review_content(doc jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT (doc - 'nodes' - 'edges' - 'editorOrder') || jsonb_build_object(
  'nodes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n->'id','type',n->'type','data',(n->'data')-'editorNote'))
   FROM jsonb_array_elements(CASE WHEN jsonb_typeof(doc->'nodes')='array' THEN doc->'nodes' ELSE '[]'::jsonb END) n),'[]'::jsonb),
  'edges', COALESCE((SELECT jsonb_agg(e - 'selected' - 'style' - 'animated' ORDER BY e->>'id')
   FROM jsonb_array_elements(CASE WHEN jsonb_typeof(doc->'edges')='array' THEN doc->'edges' ELSE '[]'::jsonb END) e),'[]'::jsonb));
$$;
CREATE OR REPLACE FUNCTION public.sync_published_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.moderation_status := 'unreviewed'; NEW.moderated_at := NULL; NEW.moderated_by := NULL;
  NEW.published_quiz_data := NULL; NEW.published_name := NULL; NEW.published_at := NULL; NEW.revision := 1;
 ELSE
  NEW.revision := OLD.revision + 1;
  IF (NEW.name IS DISTINCT FROM OLD.name OR public.quiz_review_content(NEW.quiz_data) IS DISTINCT FROM public.quiz_review_content(OLD.quiz_data))
   AND OLD.moderation_status IN ('approved','reviewing','rejected') THEN
   NEW.moderation_status := 'unreviewed'; NEW.moderated_at := NULL; NEW.moderated_by := NULL; NEW.moderation_reason := NULL;
  END IF;
  -- Approvals go through the audited administration endpoint. A fresh decision
  -- is distinguishable from ordinary saves, including layout-only updates.
  IF NEW.moderation_status='approved' AND NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN
   NEW.published_quiz_data := public.quiz_public_content(NEW.quiz_data); NEW.published_name := NEW.name; NEW.published_at := now();
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
