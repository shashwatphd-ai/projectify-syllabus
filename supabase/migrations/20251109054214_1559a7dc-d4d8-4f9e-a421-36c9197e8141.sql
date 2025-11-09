-- Phase 1: Create university_domains table (Zero Risk - Foundation)
CREATE TABLE IF NOT EXISTS public.university_domains (
  domain TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  formatted_location TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_university_domains_country ON public.university_domains(country);
CREATE INDEX IF NOT EXISTS idx_university_domains_name ON public.university_domains(name);

-- Enable RLS
ALTER TABLE public.university_domains ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access to university domains"
  ON public.university_domains
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow public read access for location detection
CREATE POLICY "Public read access to university domains"
  ON public.university_domains
  FOR SELECT
  USING (true);

-- Phase 3: Add new location columns to course_profiles (Backward Compatible)
-- Keep city_zip for backward compatibility, add new structured fields
ALTER TABLE public.course_profiles 
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_zip TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS location_formatted TEXT;

-- Populate new columns from existing city_zip for US locations
UPDATE public.course_profiles
SET 
  location_formatted = city_zip,
  location_country = 'US'
WHERE city_zip IS NOT NULL AND location_formatted IS NULL;

-- Insert initial seed data for common US universities
INSERT INTO public.university_domains (domain, name, country, city, state, zip, formatted_location)
VALUES
  ('harvard.edu', 'Harvard University', 'US', 'Cambridge', 'MA', '02138', 'Cambridge, MA 02138'),
  ('stanford.edu', 'Stanford University', 'US', 'Stanford', 'CA', '94305', 'Stanford, CA 94305'),
  ('mit.edu', 'Massachusetts Institute of Technology', 'US', 'Cambridge', 'MA', '02139', 'Cambridge, MA 02139'),
  ('umich.edu', 'University of Michigan', 'US', 'Ann Arbor', 'MI', '48109', 'Ann Arbor, MI 48109'),
  ('berkeley.edu', 'University of California Berkeley', 'US', 'Berkeley', 'CA', '94720', 'Berkeley, CA 94720'),
  ('ox.ac.uk', 'University of Oxford', 'GB', 'Oxford', '', 'OX1 2JD', 'Oxford, OX1 2JD, United Kingdom'),
  ('cam.ac.uk', 'University of Cambridge', 'GB', 'Cambridge', '', 'CB2 1TN', 'Cambridge, CB2 1TN, United Kingdom'),
  ('utoronto.ca', 'University of Toronto', 'CA', 'Toronto', 'ON', 'M5S 1A1', 'Toronto, ON M5S 1A1, Canada'),
  ('ubc.ca', 'University of British Columbia', 'CA', 'Vancouver', 'BC', 'V6T 1Z4', 'Vancouver, BC V6T 1Z4, Canada'),
  ('anu.edu.au', 'Australian National University', 'AU', 'Canberra', 'ACT', '2601', 'Canberra, ACT 2601, Australia')
ON CONFLICT (domain) DO NOTHING;