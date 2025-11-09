import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event_type?: string;
  company_id?: string;
  organization?: {
    id?: string;
    name?: string;
  };
  person?: {
    id?: string;
    organization_id?: string;
  };
  data?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Apollo webhook received');

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body for signature verification
    const bodyText = await req.text();
    
    // Validate webhook signature
    const webhookSecret = Deno.env.get('APOLLO_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ APOLLO_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Webhook secret not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const signature = req.headers.get('x-apollo-signature');
    if (!signature) {
      console.warn('⚠️ Webhook signature missing');
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Signature verification failed'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Verify HMAC signature
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('hex');
    
    // Support both raw hex and sha256= prefix formats
    const signatureValue = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    
    if (signatureValue !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      console.error('Expected:', expectedSignature);
      console.error('Received:', signatureValue);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid signature'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('✅ Webhook signature verified');
    
    // Parse the webhook payload
    const payload: WebhookPayload = JSON.parse(bodyText);
    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2));

    // Determine signal type from the event
    let signalType = 'unknown';
    const eventType = payload.event_type?.toLowerCase() || '';
    
    if (eventType.includes('funding') || eventType.includes('raised')) {
      signalType = 'funding_round';
    } else if (eventType.includes('hire') || eventType.includes('job') || eventType.includes('posting')) {
      signalType = 'hiring';
    } else if (eventType.includes('tech') || eventType.includes('technology')) {
      signalType = 'tech_change';
    } else if (eventType.includes('news') || eventType.includes('announcement')) {
      signalType = 'company_news';
    } else if (eventType) {
      signalType = eventType;
    }

    console.log('Determined signal type:', signalType);

    // Try to extract company_id from the payload
    const companyId = payload.company_id 
      || payload.organization?.id 
      || payload.person?.organization_id
      || null;

    console.log('Company ID:', companyId);

    // Insert the signal into the database
    const { data: insertedSignal, error: insertError } = await supabase
      .from('company_signals')
      .insert({
        company_id: companyId,
        apollo_webhook_payload: payload,
        signal_type: signalType,
        status: 'pending_scoring'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting signal:', insertError);
      throw insertError;
    }

    console.log('Signal inserted successfully:', insertedSignal.id);

    // Return immediate success response to Apollo
    return new Response(
      JSON.stringify({ 
        success: true, 
        signal_id: insertedSignal.id,
        message: 'Webhook received and processed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Still return 200 to Apollo to acknowledge receipt
    // Log the error but don't fail the webhook
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        message: 'Webhook acknowledged but processing failed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
