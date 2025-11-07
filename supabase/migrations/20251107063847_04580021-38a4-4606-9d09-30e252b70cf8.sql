-- Task 2.1: Create the company_signals table for capturing Apollo webhook events
-- This table stores raw, incoming company events that will trigger our scoring engine

CREATE TABLE public.company_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Link to our existing company table
    company_id UUID REFERENCES public.company_profiles(id),
    
    -- The raw data from the webhook
    apollo_webhook_payload JSONB NOT NULL,
    
    -- A simple way to categorize the event
    signal_type VARCHAR(100), -- e.g., 'funding_round', 'hiring', 'tech_change'
    
    -- A status for our processing pipeline
    status VARCHAR(50) DEFAULT 'pending_scoring' -- e.g., 'pending_scoring', 'processed'
);

-- Add an index for our scoring function to query efficiently
CREATE INDEX idx_company_signals_status ON public.company_signals(status);

-- Enable RLS on company_signals
ALTER TABLE public.company_signals ENABLE ROW LEVEL SECURITY;

-- Only admins can view company signals
CREATE POLICY "Admins can view company signals"
ON public.company_signals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (for webhook listener function)
CREATE POLICY "Service role can insert company signals"
ON public.company_signals
FOR INSERT
TO service_role
WITH CHECK (true);

-- Admins can update company signals (e.g., change status after processing)
CREATE POLICY "Admins can update company signals"
ON public.company_signals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));