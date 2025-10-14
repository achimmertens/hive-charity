-- Create a function to automatically clean up old entries when limit is exceeded
CREATE OR REPLACE FUNCTION public.cleanup_old_charity_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete oldest entries if we have more than 100
  DELETE FROM public.charity_analysis_results
  WHERE id IN (
    SELECT id
    FROM public.charity_analysis_results
    ORDER BY analyzed_at DESC
    OFFSET 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that runs after each insert or update
DROP TRIGGER IF EXISTS trigger_cleanup_old_charity_results ON public.charity_analysis_results;
CREATE TRIGGER trigger_cleanup_old_charity_results
  AFTER INSERT OR UPDATE ON public.charity_analysis_results
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_charity_results();