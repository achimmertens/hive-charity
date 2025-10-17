-- Add chary_marked column to charity_analysis_results table
ALTER TABLE public.charity_analysis_results
ADD COLUMN chary_marked boolean NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_charity_analysis_chary_marked ON public.charity_analysis_results(chary_marked);