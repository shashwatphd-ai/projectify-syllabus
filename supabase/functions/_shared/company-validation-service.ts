/**
 * COMPANY-COURSE VALIDATION SERVICE
 * 
 * AI-powered validation to ensure company-course fit BEFORE project generation.
 * This prevents force-fitting projects with irrelevant companies.
 */

interface CompanyValidationInput {
  companyName: string;
  companyDescription: string;
  companySector: string;
  companyIndustries: string[];
  companyKeywords: string[];
  companyJobPostings: any[];
  companyTechnologies: string[];
  courseTitle: string;
  courseLevel: string;
  courseOutcomes: string[];
}

interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-1
  reason: string;
  suggestedProjectType?: string;
  skillsOverlap: string[];
}

/**
 * Validate if a company is a good fit for a course BEFORE generating a project.
 * Uses AI to assess genuine mutual benefit rather than force-fitting.
 */
export async function validateCompanyCourseMatch(
  input: CompanyValidationInput
): Promise<ValidationResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.warn('⚠️ LOVABLE_API_KEY not configured, skipping AI validation');
    return {
      isValid: true,
      confidence: 0.5,
      reason: 'Validation skipped - API key not configured',
      skillsOverlap: []
    };
  }

  // Build context for AI validation
  const jobTitles = input.companyJobPostings
    .slice(0, 5)
    .map((j: any) => j.title || j.name)
    .filter(Boolean)
    .join(', ');

  const techStack = input.companyTechnologies.slice(0, 8).join(', ');
  
  const prompt = `You are a strict evaluator determining if a company is a GENUINE match for an academic course project.

COURSE INFORMATION:
- Title: ${input.courseTitle}
- Level: ${input.courseLevel}
- Learning Outcomes:
${input.courseOutcomes.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}

COMPANY INFORMATION:
- Name: ${input.companyName}
- Sector: ${input.companySector}
- Industries: ${input.companyIndustries.join(', ') || 'Not specified'}
- Description: ${input.companyDescription.substring(0, 500)}
- Keywords/Capabilities: ${input.companyKeywords.slice(0, 10).join(', ') || 'Not specified'}
- Current Job Openings: ${jobTitles || 'None available'}
- Technology Stack: ${techStack || 'Not specified'}

EVALUATION CRITERIA:
1. **Field Alignment**: Does the company operate in a field where the course's TECHNICAL skills would be genuinely useful?
2. **Skills Match**: Would the company's actual needs (based on job postings, tech stack, industry) require the skills taught in this course?
3. **Realistic Scope**: Can students realistically apply course concepts to help this company?

EXAMPLES OF MISMATCHES TO REJECT:
- Engineering course (Fluid Mechanics) + HR software company = REJECT (no engineering work needed)
- Structural Engineering course + Marketing agency = REJECT (no structural analysis needed)
- Data Science course + Bakery with no data needs = REJECT (no data work available)
- Computer Science course + Law firm with no tech needs = REJECT (no software development needed)

EXAMPLES OF GOOD MATCHES:
- Fluid Mechanics + Water treatment company = ACCEPT (flow analysis, pipe sizing)
- Data Science + E-commerce company = ACCEPT (recommendation systems, analytics)
- Structural Engineering + Construction firm = ACCEPT (load calculations, designs)
- Marketing course + B2B SaaS startup = ACCEPT (go-to-market strategy)

Respond with ONLY valid JSON (no markdown):
{
  "isValid": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "One clear sentence explaining why this is or isn't a good match",
  "suggestedProjectType": "If valid, suggest what type of project would work. If invalid, leave empty",
  "skillsOverlap": ["List", "of", "skills", "that", "overlap", "between", "course", "and", "company"]
}`;

  try {
    console.log(`  🔍 Validating company-course match for ${input.companyName}...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Use stronger model for validation decisions
        messages: [
          { role: 'user', content: prompt }
        ],
        // Note: temperature removed - some models don't support it
      }),
    });

    if (!response.ok) {
      console.error(`  ❌ Validation API error: ${response.status}`);
      // Default to accepting on API error to avoid blocking
      return {
        isValid: true,
        confidence: 0.5,
        reason: 'Validation API error - defaulting to accept',
        skillsOverlap: []
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('  ⚠️ Could not parse validation response');
      return {
        isValid: true,
        confidence: 0.5,
        reason: 'Could not parse AI response - defaulting to accept',
        skillsOverlap: []
      };
    }

    const result: ValidationResult = JSON.parse(jsonMatch[0]);
    
    // Log result
    const status = result.isValid ? '✅ VALID' : '❌ REJECTED';
    console.log(`  ${status} (${Math.round(result.confidence * 100)}%): ${result.reason}`);
    
    if (result.skillsOverlap && result.skillsOverlap.length > 0) {
      console.log(`     Skills overlap: ${result.skillsOverlap.join(', ')}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`  ❌ Validation error:`, error);
    // Default to accepting on error to avoid blocking
    return {
      isValid: true,
      confidence: 0.5,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
      skillsOverlap: []
    };
  }
}

/**
 * Batch validate multiple companies for a course.
 * Returns only companies that pass validation.
 */
export async function filterValidCompanies(
  companies: any[],
  courseTitle: string,
  courseLevel: string,
  courseOutcomes: string[]
): Promise<{ validCompanies: any[]; rejectedCompanies: { company: any; reason: string }[] }> {
  console.log(`\n🔍 AI Company-Course Validation (${companies.length} companies)`);
  console.log(`   Course: "${courseTitle}" (${courseLevel})`);
  
  const validCompanies: any[] = [];
  const rejectedCompanies: { company: any; reason: string }[] = [];
  
  for (const company of companies) {
    const validationResult = await validateCompanyCourseMatch({
      companyName: company.name,
      companyDescription: company.description || company.seo_description || '',
      companySector: company.sector || 'Unknown',
      companyIndustries: company.industries || [],
      companyKeywords: company.keywords || [],
      companyJobPostings: company.job_postings || [],
      companyTechnologies: company.technologies_used || [],
      courseTitle,
      courseLevel,
      courseOutcomes
    });
    
    if (validationResult.isValid && validationResult.confidence >= 0.6) {
      validCompanies.push({
        ...company,
        validation_confidence: validationResult.confidence,
        validation_reason: validationResult.reason,
        suggested_project_type: validationResult.suggestedProjectType,
        skills_overlap: validationResult.skillsOverlap
      });
    } else {
      rejectedCompanies.push({
        company,
        reason: validationResult.reason
      });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 Validation Results:`);
  console.log(`   ✅ Valid: ${validCompanies.length}`);
  console.log(`   ❌ Rejected: ${rejectedCompanies.length}`);
  
  if (rejectedCompanies.length > 0) {
    console.log(`   Rejection reasons:`);
    rejectedCompanies.forEach(r => {
      console.log(`     - ${r.company.name}: ${r.reason}`);
    });
  }
  
  return { validCompanies, rejectedCompanies };
}
