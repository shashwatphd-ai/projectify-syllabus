/**
 * ALIGNMENT SERVICE
 * 
 * Calculates how well projects align with:
 * 1. Course learning outcomes (LO alignment)
 * 2. Market demands (Market alignment score)
 * 
 * EXTRACTED from generate-projects/index.ts to eliminate "ghost logic" and intermittency.
 */

/**
 * Calculate Learning Outcomes Alignment Score
 * 
 * Uses AI to analyze how project tasks and deliverables align with course outcomes.
 * Returns a 0-1 score representing coverage percentage.
 */
export async function calculateLOAlignment(
  tasks: string[], 
  deliverables: string[], 
  outcomes: string[],
  loAlignment: string
): Promise<number> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = 'You are a learning outcomes assessment expert. Return only valid JSON.';
  const prompt = `Analyze how well this project aligns with the course learning outcomes.

Course Learning Outcomes:
${outcomes.map((o, i) => `LO${i + 1}: ${o}`).join('\n')}

Project Tasks:
${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Project Deliverables:
${deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}

AI Project Designer's Alignment Explanation:
${loAlignment}

For each learning outcome, determine if the project adequately addresses it through its tasks and deliverables.

Return ONLY a JSON object with:
{
  "coverage_percentage": <0-100 number>,
  "outcomes_covered": ["LO1", "LO3", ...],
  "gaps": ["Brief explanation of any gaps"]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    console.error('AI scoring error:', response.status);
    return 0.7;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return 0.7;
    
    const result = JSON.parse(jsonMatch[0]);
    return result.coverage_percentage / 100;
  } catch {
    return 0.7;
  }
}

/**
 * Generate Detailed LO Alignment Mapping
 * 
 * Creates a detailed JSON structure showing which tasks and deliverables
 * map to which learning outcomes.
 */
export async function generateLOAlignmentDetail(
  tasks: string[],
  deliverables: string[],
  outcomes: string[],
  proposal_lo_summary: string
): Promise<any> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const systemPrompt = 'You are a learning outcomes assessment expert. Return only valid JSON with proper syntax.';
  const prompt = `Analyze how project activities align with course learning outcomes.

LEARNING OUTCOMES:
${outcomes.map((o, i) => `${i}: ${o}`).join('\n')}

PROJECT TASKS (total: ${tasks.length}):
${tasks.map((t, i) => `${i}: ${t}`).join('\n')}

PROJECT DELIVERABLES (total: ${deliverables.length}):
${deliverables.map((d, i) => `${i}: ${d}`).join('\n')}

SUMMARY: ${proposal_lo_summary}

Create a detailed mapping. CRITICAL: Use ONLY numeric indices (0, 1, 2, etc.) for aligned_tasks and aligned_deliverables arrays.

Return ONLY valid JSON matching this exact structure:
{
  "outcome_mappings": [
    {
      "outcome_id": "0",
      "outcome_text": "First outcome text",
      "coverage_percentage": 75,
      "aligned_tasks": [0, 2],
      "aligned_deliverables": [1],
      "explanation": "How these tasks/deliverables address this outcome"
    }
  ],
  "task_mappings": [
    {
      "task_id": 0,
      "task_text": "First task",
      "primary_outcome": "0",
      "secondary_outcomes": ["1"]
    }
  ],
  "deliverable_mappings": [
    {
      "deliverable_id": 0,
      "deliverable_text": "First deliverable",
      "primary_outcome": "0",
      "supporting_tasks": [0, 1]
    }
  ]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      }
    }),
  });

  if (!response.ok) {
    console.error('LO alignment detail generation error:', response.status);
    return null;
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON in LO alignment response');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log('📄 Raw LO alignment response (first 300 chars):', content.substring(0, 300));
    console.log('✓ Successfully parsed LO alignment');
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse LO alignment JSON:', error);
    return null;
  }
}

/**
 * Calculate Market Alignment Score
 * 
 * Analyzes how well the project aligns with real market demands by scoring:
 * 1. Alignment with company's inferred needs (40 points)
 * 2. Relevance to company's job postings (30 points)
 * 3. Match with company's technology stack (30 points)
 * 
 * CRITICAL FIX: Uses intelligent keyword matching on job titles/descriptions
 * (not the non-existent "skills_needed" field that was causing "Score = 0" bugs).
 * 
 * Returns: 0-100 score
 */
export function calculateMarketAlignmentScore(
  projectTasks: string[],
  projectDeliverables: string[],
  inferredNeeds: string[],
  jobPostings: any[],
  technologiesUsed: string[],
  courseTopics: string[],
  courseOutcomes: string[]
): number {
  let alignmentScore = 0;
  
  console.log(`\n📊 Calculating Market Alignment Score...`);
  
  // Build intelligent keyword set from course data (same logic as filterRelevantSignals)
  const keywords = new Set<string>();
  
  // Extract from topics
  courseTopics.forEach(topic => {
    topic.toLowerCase().split(/[\s,]+/).forEach(word => {
      if (word.length > 3) keywords.add(word);
    });
  });
  
  // Extract from outcomes
  courseOutcomes.forEach(outcome => {
    const words = outcome.toLowerCase().split(/[\s,]+/);
    words.forEach(word => {
      if (word.length > 4 && !['about', 'using', 'their', 'these', 'which', 'where'].includes(word)) {
        keywords.add(word);
      }
    });
  });
  
  // Build synonym map for intelligent matching
  const synonymMap: Record<string, string[]> = {
    'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural'],
    'ml': ['machine learning', 'artificial intelligence', 'ai', 'predictive'],
    'cloud': ['aws', 'azure', 'gcp', 'kubernetes', 'docker', 'serverless'],
    'data': ['analytics', 'database', 'sql', 'nosql', 'etl', 'pipeline'],
    'software': ['development', 'engineering', 'programming', 'coding'],
    'fluid': ['hydraulic', 'flow', 'pressure', 'liquid', 'gas'],
    'mechanical': ['mechanics', 'engineering', 'design', 'cad'],
    'chemical': ['chemistry', 'process', 'reaction', 'synthesis'],
    'simulation': ['modeling', 'cfd', 'fem', 'analysis'],
    'optimization': ['improve', 'enhance', 'efficiency', 'performance']
  };
  
  // Expand keywords with synonyms
  const expandedKeywords = new Set(keywords);
  keywords.forEach(keyword => {
    if (synonymMap[keyword]) {
      synonymMap[keyword].forEach(syn => expandedKeywords.add(syn));
    }
  });
  
  console.log(`  🔑 Course keywords: ${Array.from(expandedKeywords).slice(0, 8).join(', ')}...`);
  
  // Score 1: Inferred Needs Alignment (40 points max)
  if (inferredNeeds && inferredNeeds.length > 0) {
    const taskText = projectTasks.join(' ').toLowerCase();
    const matchedNeeds = inferredNeeds.filter(need => {
      const needKeywords = need.toLowerCase().split(' ');
      return needKeywords.some(keyword => keyword.length > 3 && taskText.includes(keyword));
    });
    const needsScore = (matchedNeeds.length / inferredNeeds.length) * 40;
    alignmentScore += needsScore;
    console.log(`  ✓ Needs alignment: ${matchedNeeds.length}/${inferredNeeds.length} matched (+${needsScore.toFixed(0)} points)`);
  }
  
  // Score 2: Job Postings Alignment (30 points max) - FIXED: Use titles/descriptions, not non-existent skills_needed
  if (jobPostings && jobPostings.length > 0) {
    let matchedJobs = 0;
    jobPostings.forEach(job => {
      const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
      const matches = Array.from(expandedKeywords).filter(keyword => jobText.includes(keyword));
      if (matches.length > 0) {
        matchedJobs++;
        console.log(`  ✓ Job match: "${job.title}" - ${matches.length} keywords`);
      }
    });
    const jobScore = (matchedJobs / jobPostings.length) * 30;
    alignmentScore += jobScore;
    console.log(`  ✓ Job alignment: ${matchedJobs}/${jobPostings.length} matched (+${jobScore.toFixed(0)} points)`);
  }
  
  // Score 3: Technology Stack Alignment (30 points max)
  if (technologiesUsed && technologiesUsed.length > 0) {
    const taskText = projectTasks.join(' ').toLowerCase();
    const matchedTech = technologiesUsed.filter(tech => {
      const techName = typeof tech === 'string' ? tech : ((tech as any)?.name || (tech as any)?.technology || '');
      const techLower = techName.toLowerCase();
      return Array.from(expandedKeywords).some(keyword => 
        techLower.includes(keyword) || keyword.includes(techLower)
      );
    });
    const techScore = (matchedTech.length / technologiesUsed.length) * 30;
    alignmentScore += techScore;
    console.log(`  ✓ Tech alignment: ${matchedTech.length}/${technologiesUsed.length} matched (+${techScore.toFixed(0)} points)`);
  }
  
  const finalScore = Math.round(alignmentScore);
  console.log(`  📊 Final Market Alignment Score: ${finalScore}/100\n`);
  
  return finalScore;
}
