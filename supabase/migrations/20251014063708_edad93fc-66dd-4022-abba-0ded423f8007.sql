-- Remove duplicate entries, keeping only the most recent one
DELETE FROM public.charity_analysis_results a
USING public.charity_analysis_results b
WHERE a.id < b.id 
AND a.article_url = b.article_url;

-- Add unique constraint to article_url column
ALTER TABLE public.charity_analysis_results 
ADD CONSTRAINT charity_analysis_results_article_url_key UNIQUE (article_url);