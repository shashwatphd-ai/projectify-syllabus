import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getDocument } from 'https://esm.sh/pdfjs-serverless@0.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedCourse {
  title: string;
  level: string;
  weeks: number;
  hrs_per_week: number;
  outcomes: string[];
  artifacts: string[];
  schedule: string[];
}

function extractText(pdfText: string): ParsedCourse {
  // Extract course title
  const titleMatch = pdfText.match(/(?:course\s+title|course\s+name)[:\s]+([^\n]+)/i) || 
                     pdfText.match(/^([A-Z][^\n]{10,80})/m);
  const title = titleMatch ? titleMatch[1].trim() : "Course";

  // Detect level
  const level = /\b(MBA|graduate|master)\b/i.test(pdfText) ? "MBA" : "UG";

  // Extract weeks
  const weeksMatch = pdfText.match(/(\d{1,2})\s*weeks?/i);
  const weeks = weeksMatch ? parseInt(weeksMatch[1]) : 12;

  // Extract hours per week
  const hoursMatch = pdfText.match(/(\d+(?:\.\d+)?)\s*hours?\s*(?:per|\/)\s*week/i);
  const hrs_per_week = hoursMatch ? parseFloat(hoursMatch[1]) : 4.0;

  // Extract learning outcomes
  const outcomesSection = pdfText.match(/(?:learning outcomes?|course outcomes?|objectives?)[:\s]+(.{0,2000}?)(?=\n\n|[A-Z][a-z]+\s*\d+:|$)/is);
  let outcomes: string[] = [];
  
  if (outcomesSection) {
    const text = outcomesSection[1];
    outcomes = [
      ...text.matchAll(/[-•]\s*([^\n]+)/g),
      ...text.matchAll(/\d+\.\s*([^\n]+)/g)
    ].map(m => m[1].trim()).filter(o => o.length > 20 && o.length < 200).slice(0, 12);
  }

  if (outcomes.length === 0) {
    outcomes = [
      "Define project scope and develop workplan",
      "Conduct external market and competitive analysis",
      "Build fact-based recommendations",
      "Present findings to stakeholders"
    ];
  }

  // Extract artifacts
  const artifactKeywords = ["proposal", "workplan", "report", "slide", "presentation", "pitch", "deliverable", "memo", "analysis"];
  const artifacts = artifactKeywords.filter(kw => new RegExp(kw, 'i').test(pdfText));
  
  if (artifacts.length === 0) {
    artifacts.push("proposal", "analysis memo", "report", "slide deck", "final presentation");
  }

  // Extract schedule
  const schedule = [...pdfText.matchAll(/week\s*\d+[^\n]*/gi)]
    .map(m => m[0].trim())
    .slice(0, 14);

  return { title, level, weeks, hrs_per_week, outcomes, artifacts, schedule };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify the JWT and get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const cityZip = formData.get('cityZip') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    // Upload to storage using service role to bypass RLS
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    
    // Create a service role client for storage operations
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { error: uploadError } = await serviceRoleClient.storage
      .from('syllabi')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Parse the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    let pdfText = '';
    try {
      const doc = await getDocument(buffer).promise;
      const numPages = doc.numPages;
      
      // Extract text from all pages
      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        pdfText += pageText + '\n';
      }
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      pdfText = 'Course syllabus';
    }
    
    // Parse the extracted text
    const parsed = extractText(pdfText);

    // Insert course profile
    const { data: course, error: insertError } = await supabaseClient
      .from('course_profiles')
      .insert({
        owner_id: user.id,
        title: parsed.title,
        level: parsed.level,
        city_zip: cityZip,
        weeks: parsed.weeks,
        hrs_per_week: parsed.hrs_per_week,
        outcomes: parsed.outcomes,
        artifacts: parsed.artifacts,
        schedule: parsed.schedule,
        file_path: filePath
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ course, parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-syllabus:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
