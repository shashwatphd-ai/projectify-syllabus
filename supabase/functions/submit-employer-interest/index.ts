import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const submissionSchema = z.object({
  demandSignalId: z.string().uuid({ message: "Invalid demand signal ID format" }),
  companyName: z.string().trim().min(1, { message: "Company name is required" }).max(255, { message: "Company name must be less than 255 characters" }),
  contactEmail: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  contactName: z.string().trim().max(255, { message: "Contact name must be less than 255 characters" }).optional(),
  companyDomain: z.string().trim().max(255, { message: "Company domain must be less than 255 characters" }).optional(),
  proposedProjectTitle: z.string().trim().min(1, { message: "Project title is required" }).max(255, { message: "Project title must be less than 255 characters" }),
  projectDescription: z.string().trim().min(1, { message: "Project description is required" }).max(5000, { message: "Project description must be less than 5000 characters" }),
  preferredTimeline: z.string().trim().max(100, { message: "Timeline must be less than 100 characters" }).optional(),
  referralSource: z.string().trim().max(100, { message: "Referral source must be less than 100 characters" }).optional(),
});

interface EmployerInterestSubmission {
  demandSignalId: string;
  companyName: string;
  contactEmail: string;
  contactName?: string;
  companyDomain?: string;
  proposedProjectTitle: string;
  projectDescription: string;
  preferredTimeline?: string;
  referralSource?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const rawSubmission = await req.json();
    
    // Validate with zod schema
    const validationResult = submissionSchema.safeParse(rawSubmission);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      
      console.warn('Validation failed:', errors);
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const submission: EmployerInterestSubmission = validationResult.data;

    console.log(`Processing employer interest submission from ${submission.companyName}`);

    // Initialize Supabase Admin Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Validate Demand Signal ID - ensure it exists and is active
    const { data: signal, error: signalError } = await supabaseClient
      .from('demand_signals')
      .select('id, project_category, geographic_region')
      .eq('id', submission.demandSignalId)
      .eq('is_active', true)
      .maybeSingle();

    if (signalError) {
      console.error('Error validating demand signal:', signalError);
      throw new Error('Failed to validate demand signal');
    }

    if (!signal) {
      console.warn('Submission attempt with invalid or inactive demandSignalId:', submission.demandSignalId);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or inactive demand signal ID. This opportunity may no longer be available.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Valid demand signal found: ${signal.project_category} in ${signal.geographic_region}`);

    // Check for duplicate submission (same email + signal)
    const { data: existingSubmission, error: duplicateCheckError } = await supabaseClient
      .from('employer_interest_submissions')
      .select('id, status, created_at')
      .eq('contact_email', submission.contactEmail)
      .eq('demand_signal_id', submission.demandSignalId)
      .maybeSingle();

    if (duplicateCheckError) {
      console.error('Error checking for duplicates:', duplicateCheckError);
      // Don't block submission on duplicate check error
    }

    if (existingSubmission) {
      console.warn(`Duplicate submission detected for ${submission.contactEmail}`);
      return new Response(
        JSON.stringify({ 
          error: 'You have already submitted interest for this opportunity.',
          existingSubmissionId: existingSubmission.id,
          status: existingSubmission.status
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Insert the new submission
    const { data: inserted, error: insertError } = await supabaseClient
      .from('employer_interest_submissions')
      .insert({
        demand_signal_id: submission.demandSignalId,
        company_name: submission.companyName,
        contact_email: submission.contactEmail,
        contact_name: submission.contactName || null,
        company_domain: submission.companyDomain || null,
        proposed_project_title: submission.proposedProjectTitle,
        project_description: submission.projectDescription,
        preferred_timeline: submission.preferredTimeline || null,
        referral_source: submission.referralSource || null,
        status: 'pending' // Set default status for our approval gate
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('Error inserting employer submission:', insertError);
      throw new Error('Failed to submit interest. Please try again.');
    }

    console.log(`Successfully created submission ${inserted.id} for ${submission.companyName}`);

    // Return Success
    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId: inserted.id,
        submittedAt: inserted.created_at,
        message: 'Interest submitted successfully. Our team will review and contact you within 48 hours.'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Error in submit-employer-interest:', error);
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({ 
        error: 'Failed to submit interest. Please try again later.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
