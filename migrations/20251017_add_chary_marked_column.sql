-- Add chary_marked boolean column to charity_analysis_results
ALTER TABLE public.charity_analysis_results
ADD COLUMN IF NOT EXISTS chary_marked boolean DEFAULT false;

-- Backfill existing rows to false where NULL (defensive)
UPDATE public.charity_analysis_results
SET chary_marked = false
WHERE chary_marked IS NULL;

-- Index for quick lookup if you plan to filter by this column
CREATE INDEX IF NOT EXISTS idx_charity_analysis_chary_marked ON public.charity_analysis_results (chary_marked);
