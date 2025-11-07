-- Task 2.3 Part A: Add project_score column to company_signals table
ALTER TABLE public.company_signals
ADD COLUMN project_score INTEGER DEFAULT 0;