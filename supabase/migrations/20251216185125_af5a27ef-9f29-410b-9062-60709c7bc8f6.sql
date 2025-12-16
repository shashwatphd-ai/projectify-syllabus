-- Fix P0: total_funding_usd overflow (currently failing for $2.18B+ companies)
ALTER TABLE company_profiles 
ALTER COLUMN total_funding_usd TYPE bigint;

-- Future-proof P1: ai_tokens_consumed for heavy AI usage scaling
ALTER TABLE generation_runs 
ALTER COLUMN ai_tokens_consumed TYPE bigint;