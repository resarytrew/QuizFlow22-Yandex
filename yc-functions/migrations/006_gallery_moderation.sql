-- Publication requires an explicit moderation decision. Existing pending rows
-- keep their content and visibility but cease to be published.
CREATE OR REPLACE FUNCTION public.sync_published_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := 'unreviewed';
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
  ELSIF (NEW.name IS DISTINCT FROM OLD.name OR NEW.quiz_data IS DISTINCT FROM OLD.quiz_data)
    AND OLD.moderation_status IN ('approved', 'reviewing', 'rejected') THEN
    NEW.moderation_status := 'unreviewed';
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.moderation_reason := NULL;
  END IF;
  IF NEW.visibility = 'public' AND NEW.moderation_status = 'approved' THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
  ELSE
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tg_sync_published_at ON public.quizzes;
CREATE TRIGGER tg_sync_published_at BEFORE INSERT OR UPDATE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.sync_published_at();
ALTER TABLE public.quizzes ALTER COLUMN moderation_status SET DEFAULT 'unreviewed';
UPDATE public.quizzes SET published_at = NULL
WHERE published_at IS NOT NULL AND (visibility <> 'public' OR moderation_status IS DISTINCT FROM 'approved');
