import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getDocument } from 'https://esm.sh/pdfjs-serverless@0.3.2';
import { 
  AI_GATEWAY_TIMEOUT_MS, 
  fetchWithTimeout,
  isTimeoutError 
} from "../_shared/timeout-config.ts";

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

async function extractTextWithAI(pdfText: string): Promise<ParsedCourse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  // Fallback regex-based extraction
  const fallbackExtract = (): ParsedCourse => {
    const titleMatch = pdfText.match(/(?:course\s+title|course\s+name)[:\s]+([^\n]+)/i) || 
                       pdfText.match(/^([A-Z][^\n]{10,80})/m);
    const title = titleMatch ? titleMatch[1].trim() : "Course";
    
    const mbaIndicators = /\b(MBA|M\.B\.A\.|graduate|master|masters|eligibility.*bachelor|prerequisite.*bachelor)\b/i;
    const ugIndicators = /\b(undergraduate|UG|bachelor|B\.S\.|B\.A\.|freshman|sophomore|junior|senior|100-|200-|300-|400-level)\b/i;
    let level = "UG";
    if (mbaIndicators.test(pdfText)) level = "MBA";
    if (ugIndicators.test(pdfText)) level = "UG";
    
    const weeksMatch = pdfText.match(/(\d{1,2})\s*weeks?/i);
    const weeks = weeksMatch ? parseInt(weeksMatch[1]) : 12;
    
    const hoursMatch = pdfText.match(/(\d+(?:\.\d+)?)\s*hours?\s*(?:per|\/)\s*week/i);
    const hrs_per_week = hoursMatch ? parseFloat(hoursMatch[1]) : 4.0;
    
    return {
      title,
      level,
      weeks,
      hrs_per_week,
      outcomes: [
        "Define project scope and develop workplan",
        "Conduct external market and competitive analysis",
        "Build fact-based recommendations",
        "Present findings to stakeholders"
      ],
      artifacts: ["proposal", "analysis memo", "report", "slide deck", "final presentation"],
      schedule: []
    };
  };
  
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not found, using fallback extraction");
    return fallbackExtract();
  }
  
  try {
    // Use AI to intelligently extract course information with timeout protection
    const response = await fetchWithTimeout(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing academic syllabi. Extract course information accurately from the provided syllabus text."
          },
          {
            role: "user",
            content: `Analyze this course syllabus and extract the following information:\n\n${pdfText.substring(0, 15000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_course_info",
              description: "Extract structured information from a course syllabus",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "The full course title including course code if present"
                  },
                  level: {
                    type: "string",
                    enum: ["UG", "MBA"],
                    description: "Course level: UG for undergraduate, MBA for graduate/MBA courses. Look for indicators like prerequisites requiring a bachelor's degree, graduate-level course codes, or explicit mentions."
                  },
                  weeks: {
                    type: "integer",
                    description: "Duration of the course in weeks (typically 12-16 for a semester)"
                  },
                  hrs_per_week: {
                    type: "number",
                    description: "Expected hours per week of student work"
                  },
                  outcomes: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of specific learning outcomes or objectives from the syllabus. Extract the ACTUAL course-specific outcomes, not generic ones. Look for sections like 'Learning Outcomes', 'Course Objectives', 'Upon completion students will', etc."
                  },
                  artifacts: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of deliverables or assignments mentioned in the syllabus (e.g., reports, presentations, exams, projects, papers)"
                  },
                  schedule: {
                    type: "array",
                    items: { type: "string" },
                    description: "Weekly schedule if available, showing topics covered each week"
                  }
                },
                required: ["title", "level", "weeks", "hrs_per_week", "outcomes", "artifacts"],
                additionalProperties: false
              }
            }
          }
        ],
          tool_choice: { type: "function", function: { name: "extract_course_info" } }
        })
      },
      AI_GATEWAY_TIMEOUT_MS,
      'AI Syllabus Parsing'
    );
    
    if (!response.ok) {
      console.error("AI extraction failed:", response.status, await response.text());
      return fallbackExtract();
    }
    
    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.warn("No tool call in AI response, using fallback");
      return fallbackExtract();
    }
    
    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("AI extracted course info:", JSON.stringify(extracted, null, 2));
    
    return {
      title: extracted.title || "Course",
      level: extracted.level || "UG",
      weeks: extracted.weeks || 12,
      hrs_per_week: extracted.hrs_per_week || 4.0,
      outcomes: (extracted.outcomes && extracted.outcomes.length > 0) 
        ? extracted.outcomes.slice(0, 12) 
        : fallbackExtract().outcomes,
      artifacts: (extracted.artifacts && extracted.artifacts.length > 0)
        ? extracted.artifacts
        : fallbackExtract().artifacts,
      schedule: extracted.schedule || []
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      console.warn("AI extraction timed out, using fallback:", error);
    } else {
      console.error("Error in AI extraction:", error);
    }
    return fallbackExtract();
  }
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

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated client with user's JWT for RLS policies
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify the JWT and get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Create a service role client for storage operations
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let filePath: string;
    let pdfBuffer: Uint8Array;
    let cityZip: string;

    // Check if request is JSON (storagePath mode) or FormData
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // File already uploaded to storage (Android reload scenario)
      const body = await req.json();
      filePath = body.storagePath;
      cityZip = typeof body.cityZip === 'string' ? body.cityZip : JSON.stringify(body.cityZip);
      
      if (!filePath) {
        throw new Error('No storagePath provided');
      }

      console.log('📂 Using pre-uploaded file from storage:', filePath);
      
      // Download file from storage
      const { data: fileData, error: downloadError } = await serviceRoleClient.storage
        .from('syllabi')
        .download(filePath);
      
      if (downloadError || !fileData) {
        console.error('Download error:', downloadError);
        throw new Error('Failed to download file from storage');
      }
      
      const arrayBuffer = await fileData.arrayBuffer();
      pdfBuffer = new Uint8Array(arrayBuffer);
    } else {
      // Traditional FormData upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      cityZip = formData.get('cityZip') as string;

      if (!file) {
        throw new Error('No file provided');
      }

      // Upload to storage
      filePath = `${user.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await serviceRoleClient.storage
        .from('syllabi')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const arrayBuffer = await file.arrayBuffer();
      pdfBuffer = new Uint8Array(arrayBuffer);
    }

    // Parse the PDF file
    let pdfText = '';
    try {
      const doc = await getDocument(pdfBuffer).promise;
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
    
    // Parse the extracted text using AI
    const parsed = await extractTextWithAI(pdfText);

    // Parse location data - extract all components for precise targeting
    let displayLocation = cityZip;
    let searchLocation = cityZip;
    let locationCity = '';
    let locationState = '';
    let locationZip = '';
    let locationCountry = 'US';
    let locationFormatted = cityZip;
    
    try {
      // Parse complete location data from Upload.tsx
      const locationData = JSON.parse(cityZip);
      displayLocation = locationData.location || cityZip;
      searchLocation = locationData.searchLocation || cityZip;
      locationCity = locationData.city || '';
      locationState = locationData.state || '';
      locationZip = locationData.zip || '';
      locationCountry = locationData.country || 'US';
      locationFormatted = displayLocation;
      console.log('📍 Complete location data parsed:', { 
        display: displayLocation, 
        search: searchLocation, 
        city: locationCity, 
        state: locationState, 
        zip: locationZip, 
        country: locationCountry 
      });
    } catch {
      // Not JSON, use as-is (backward compatibility)
      console.log(`📍 Using legacy location format: "${cityZip}"`);
    }

    // Insert course profile with complete location data
    // RLS policy "Users can insert own courses" allows this when owner_id = auth.uid()
    const { data: course, error: insertError } = await supabaseClient
      .from('course_profiles')
      .insert({
        owner_id: user.id,
        title: parsed.title,
        level: parsed.level,
        city_zip: displayLocation,           // Display format (backward compat)
        search_location: searchLocation,     // Apollo-friendly format
        location_city: locationCity,         // Individual city component
        location_state: locationState,       // Individual state component
        location_zip: locationZip,           // Individual zip component
        location_country: locationCountry,   // Country code (e.g., "US")
        location_formatted: locationFormatted, // Formatted display string
        weeks: parsed.weeks,
        hrs_per_week: parsed.hrs_per_week,
        outcomes: parsed.outcomes,
        artifacts: parsed.artifacts,
        schedule: parsed.schedule,
        file_path: filePath
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    // Note: Company discovery happens automatically during project generation
    // via the discover-companies function, no need to trigger it here
    console.log(`Course location detected: ${cityZip} - company discovery will happen during project generation`);

    return new Response(JSON.stringify({ 
      course, 
      parsed,
      rawText: pdfText.substring(0, 10000) // Include first 10k chars for review
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-syllabus:', error);
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({ 
        error: 'Failed to parse syllabus. Please ensure the file is a valid PDF and try again.' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
