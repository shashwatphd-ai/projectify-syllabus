import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, createErrorResponse, createJsonResponse, createPreflightResponse } from '../_shared/cors.ts';

interface ScoringRequest {
  signal_id: string;
}

interface CompanySignal {
  id: string;
  company_id: string | null;
  apollo_webhook_payload: any;
  signal_type: string;
  status: string;
}

interface CompanyProfile {
  id: string;
  sector: string | null;
  size: string | null;
  organization_industry_keywords: string[] | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  console.log('Project suitability scorer invoked');

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request
    const { signal_id }: ScoringRequest = await req.json();
    
    if (!signal_id) {
      return createErrorResponse('Missing signal_id', 400, req);
    }

    console.log('Processing signal:', signal_id);

    // Fetch the signal from company_signals
    const { data: signal, error: signalError } = await supabase
      .from('company_signals')
      .select('*')
      .eq('id', signal_id)
      .single();

    if (signalError || !signal) {
      console.error('Error fetching signal:', signalError);
      throw new Error('Signal not found');
    }

    console.log('Signal retrieved:', { 
      id: signal.id, 
      type: signal.signal_type, 
      company_id: signal.company_id 
    });

    // Initialize score
    let score = 0;
    const payload = signal.apollo_webhook_payload;
    const signalType = signal.signal_type;

    // 1. FUNDING SIGNAL (High Value)
    if (signalType === 'funding_round') {
      score += 50;
      console.log('Funding round signal detected: +50 points');
      
      // Check for prime growth stages
      const stage = payload?.stage?.toLowerCase() || payload?.funding_stage?.toLowerCase() || '';
      if (stage.includes('series_a') || stage.includes('series a') || 
          stage.includes('series_b') || stage.includes('series b')) {
        score += 15;
        console.log('Series A/B funding detected: +15 bonus points');
      }
    }

    // 2. HIRING SIGNAL (Medium Value)
    if (signalType === 'hiring') {
      score += 35;
      console.log('Hiring signal detected: +35 points');
      
      // Check if job title matches common course categories
      const jobTitle = (payload?.job_title || payload?.title || '').toLowerCase();
      const relevantKeywords = [
        'software', 'developer', 'engineer', 'data', 'analyst',
        'designer', 'product', 'marketing', 'business'
      ];
      
      if (relevantKeywords.some(keyword => jobTitle.includes(keyword))) {
        score += 10;
        console.log('Relevant job title detected: +10 bonus points');
      }
    }

    // 3. TECH CHANGE SIGNAL (Medium Value)
    if (signalType === 'tech_change') {
      score += 30;
      console.log('Tech change signal detected: +30 points');
      
      // Check if new tech matches common student skills
      const technology = (payload?.technology || payload?.tech_name || '').toLowerCase();
      const relevantTech = [
        'python', 'javascript', 'react', 'node', 'aws', 'cloud',
        'machine learning', 'ai', 'data', 'analytics'
      ];
      
      if (relevantTech.some(tech => technology.includes(tech))) {
        score += 10;
        console.log('Relevant technology detected: +10 bonus points');
      }
    }

    // 4. FIRMOGRAPHIC MODIFIERS
    // Fetch company profile if we have a company_id
    if (signal.company_id) {
      const { data: company, error: companyError } = await supabase
        .from('company_profiles')
        .select('id, sector, size, organization_industry_keywords')
        .eq('id', signal.company_id)
        .single();

      if (!companyError && company) {
        console.log('Company profile retrieved:', { 
          id: company.id, 
          sector: company.sector, 
          size: company.size 
        });

        // Industry modifier
        const sector = (company.sector || '').toLowerCase();
        if (sector.includes('software') || sector.includes('technology') || sector.includes('tech')) {
          score += 10;
          console.log('Tech/Software industry: +10 points');
        }

        // Size modifier (ideal for projects)
        const size = company.size || '';
        if (size === '51-200' || size === '201-500') {
          score += 5;
          console.log('Ideal company size: +5 points');
        }
      } else {
        console.log('Company profile not found or error:', companyError);
      }
    }

    console.log('Final calculated score:', score);

    // Update the signal with the calculated score and mark as processed
    const { error: updateError } = await supabase
      .from('company_signals')
      .update({
        project_score: score,
        status: 'processed'
      })
      .eq('id', signal_id);

    if (updateError) {
      console.error('Error updating signal:', updateError);
      throw updateError;
    }

    console.log('Signal successfully scored and updated');

    return createJsonResponse({ 
      success: true, 
      signal_id,
      score,
      message: 'Signal scored successfully'
    }, 200, req);

  } catch (error) {
    console.error('Error in project-suitability-scorer:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return createErrorResponse(errorMessage, 500, req);
  }
});
