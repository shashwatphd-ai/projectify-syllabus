-- Create the main table for aggregated, anonymized demand
CREATE TABLE demand_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Aggregation Dimensions
    project_category VARCHAR(100) NOT NULL,
    industry_sector VARCHAR(100),
    required_skills TEXT[],
    geographic_region VARCHAR(100),
    
    -- Demand Metrics
    student_count INTEGER NOT NULL,
    course_count INTEGER NOT NULL,
    institution_count INTEGER NOT NULL,
    
    -- Temporal Dimensions
    earliest_start_date DATE,
    latest_start_date DATE,
    typical_duration_weeks INTEGER,
    
    -- Privacy-Preserving Aggregates (Zero PII)
    student_level_distribution JSONB,
    institution_types JSONB,
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create the table to capture inbound employer interest (the "form")
CREATE TABLE employer_interest_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Employer Information
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    company_domain VARCHAR(255),
    
    -- Interest Details
    demand_signal_id UUID REFERENCES demand_signals(id),
    project_category VARCHAR(100),
    proposed_project_title VARCHAR(255),
    project_description TEXT,
    preferred_timeline VARCHAR(100),
    
    -- Status Tracking (for our approval gate)
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Attribution Tracking
    referral_source VARCHAR(100),
    
    UNIQUE(contact_email, demand_signal_id)
);

-- Create the table for analytics events (to be piped to BigQuery)
CREATE TABLE dashboard_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    event_type VARCHAR(50) NOT NULL,
    demand_signal_id UUID REFERENCES demand_signals(id),
    session_id VARCHAR(100),
    
    -- Engagement Metrics
    time_on_page INTEGER,
    filters_applied JSONB,
    
    -- Conversion Funnel
    resulted_in_submission BOOLEAN DEFAULT FALSE
);

-- === Indexes for Performance ===

-- Index for the dashboard's main filter
CREATE INDEX idx_demand_signals_category ON demand_signals(project_category);

-- Index for querying only active signals
CREATE INDEX idx_demand_signals_active ON demand_signals(is_active) WHERE is_active = TRUE;

-- Index for the admin panel (to review pending submissions)
CREATE INDEX idx_employer_submissions_status ON employer_interest_submissions(status);

-- Index for time-series analysis on analytics
CREATE INDEX idx_analytics_timestamp ON dashboard_analytics(event_timestamp);

-- Enable Row Level Security
ALTER TABLE demand_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_interest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for demand_signals (public read for dashboard)
CREATE POLICY "Public read access for demand signals"
ON demand_signals FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Service role full access to demand signals"
ON demand_signals FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policies for employer_interest_submissions (authenticated insert, service role manage)
CREATE POLICY "Anyone can submit employer interest"
ON employer_interest_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role full access to employer submissions"
ON employer_interest_submissions FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policies for dashboard_analytics (service role only)
CREATE POLICY "Service role full access to analytics"
ON dashboard_analytics FOR ALL
USING (auth.role() = 'service_role');