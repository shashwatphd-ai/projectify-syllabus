/**
 * Course-to-SOC Code Mapping Service
 * 
 * Maps course disciplines directly to O*NET SOC codes to avoid flawed keyword searches.
 * This ensures we get ENGINEERING occupations, not MAINTENANCE occupations.
 */

export interface SOCMapping {
  socCode: string;
  title: string;
  confidence: number;
  industries: string[];
  keywords: string[];
}

/**
 * Direct discipline mappings to O*NET SOC codes
 */
const DISCIPLINE_SOC_MAP: Record<string, SOCMapping[]> = {
  // Mechanical Engineering
  'mechanical': [
    {
      socCode: '17-2141.00',
      title: 'Mechanical Engineers',
      confidence: 0.95,
      industries: ['aerospace', 'automotive', 'manufacturing', 'HVAC', 'robotics', 'energy'],
      keywords: ['mechanical', 'fluid', 'thermodynamics', 'dynamics', 'heat transfer', 'mechanics']
    },
    {
      socCode: '17-2011.00',
      title: 'Aerospace Engineers',
      confidence: 0.85,
      industries: ['aerospace', 'defense', 'aviation', 'space'],
      keywords: ['aerodynamics', 'propulsion', 'flight', 'spacecraft']
    }
  ],
  
  // Systems/Industrial Engineering
  'systems': [
    {
      socCode: '17-2112.00',
      title: 'Industrial Engineers',
      confidence: 0.95,
      industries: ['manufacturing', 'logistics', 'operations', 'industrial engineering', 'supply chain', 'automation', 'production', 'quality assurance'],
      keywords: ['systems', 'optimization', 'processes', 'efficiency', 'operations']
    },
    {
      socCode: '17-2199.08',
      title: 'Robotics Engineers',
      confidence: 0.85,
      industries: ['robotics', 'automation', 'manufacturing', 'AI'],
      keywords: ['robotics', 'automation', 'control systems']
    }
  ],
  
  // Computer Science/Software
  'computer': [
    {
      socCode: '15-1252.00',
      title: 'Software Developers',
      confidence: 0.95,
      industries: ['software', 'technology', 'fintech', 'SaaS', 'cloud computing'],
      keywords: ['software', 'programming', 'development', 'coding', 'algorithms']
    },
    {
      socCode: '15-1299.08',
      title: 'Computer Systems Engineers/Architects',
      confidence: 0.90,
      industries: ['cloud', 'infrastructure', 'enterprise software', 'cybersecurity'],
      keywords: ['systems', 'architecture', 'infrastructure', 'networks']
    }
  ],
  
  // Electrical Engineering
  'electrical': [
    {
      socCode: '17-2071.00',
      title: 'Electrical Engineers',
      confidence: 0.95,
      industries: ['electronics', 'power systems', 'telecommunications', 'semiconductors', 'IoT'],
      keywords: ['electrical', 'electronics', 'circuits', 'power', 'signals']
    },
    {
      socCode: '17-2072.00',
      title: 'Electronics Engineers',
      confidence: 0.90,
      industries: ['consumer electronics', 'semiconductors', 'IoT', 'embedded systems'],
      keywords: ['electronics', 'embedded', 'microcontrollers', 'PCB']
    }
  ],
  
  // Civil Engineering
  'civil': [
    {
      socCode: '17-2051.00',
      title: 'Civil Engineers',
      confidence: 0.95,
      industries: ['construction', 'infrastructure', 'transportation', 'urban planning'],
      keywords: ['civil', 'structures', 'construction', 'infrastructure', 'transportation']
    }
  ],
  
  // Chemical Engineering
  'chemical': [
    {
      socCode: '17-2041.00',
      title: 'Chemical Engineers',
      confidence: 0.95,
      industries: ['chemical', 'pharmaceutical', 'petrochemical', 'materials', 'biotech'],
      keywords: ['chemical', 'reactions', 'processes', 'materials', 'catalysis']
    }
  ],
  
  // Data Science/Analytics
  'data': [
    {
      socCode: '15-2051.00',
      title: 'Data Scientists',
      confidence: 0.95,
      industries: ['technology', 'finance', 'healthcare', 'e-commerce', 'consulting'],
      keywords: ['data', 'analytics', 'machine learning', 'statistics', 'AI']
    },
    {
      socCode: '15-2051.01',
      title: 'Business Intelligence Analysts',
      confidence: 0.85,
      industries: ['business intelligence', 'consulting', 'enterprise software'],
      keywords: ['business intelligence', 'reporting', 'dashboards', 'KPIs']
    }
  ],
  
  // Business/Management
  'business': [
    {
      socCode: '11-3021.00',
      title: 'Computer and Information Systems Managers',
      confidence: 0.85,
      industries: ['technology', 'consulting', 'finance', 'enterprise'],
      keywords: ['management', 'leadership', 'IT', 'project management']
    },
    {
      socCode: '13-1111.00',
      title: 'Management Analysts',
      confidence: 0.80,
      industries: ['consulting', 'business services', 'finance'],
      keywords: ['strategy', 'consulting', 'business analysis', 'operations']
    }
  ]
};

/**
 * Map course title and context to relevant SOC codes
 */
export function mapCourseToSOC(
  courseTitle: string,
  outcomes: string[] = [],
  courseLevel: string = ''
): SOCMapping[] {
  console.log(`\n🎯 [SOC Mapping] Course: "${courseTitle}"`);

  const titleLower = courseTitle.toLowerCase();
  const outcomesText = outcomes.join(' ').toLowerCase();
  const allText = `${titleLower} ${outcomesText}`;

  const matches: Array<SOCMapping & { matchScore: number }> = [];

  // Discipline stem variations for better matching
  const disciplineStems: Record<string, string[]> = {
    'mechanical': ['mechanical', 'mechanics', 'mechanic'],
    'systems': ['systems', 'system'],
    'computer': ['computer', 'computing', 'computation'],
    'electrical': ['electrical', 'electric', 'electronics', 'electronic'],
    'civil': ['civil'],
    'chemical': ['chemical', 'chemistry'],
    'data': ['data'],
    'business': ['business', 'management', 'mba']
  };

  // Check each discipline
  for (const [discipline, socMappings] of Object.entries(DISCIPLINE_SOC_MAP)) {
    // Check if discipline or its stems appear in title or outcomes
    const stems = disciplineStems[discipline] || [discipline];
    const disciplineMatch = stems.some(stem => allText.includes(stem));

    if (disciplineMatch) {
      console.log(`   ✓ Matched discipline: "${discipline}" (via stems: ${stems.join('/')})`);

      for (const mapping of socMappings) {
        // Calculate match score based on keyword overlap
        let matchScore = 0;

        // Title match is strongest
        if (stems.some(stem => titleLower.includes(stem))) {
          matchScore += 50;
        }

        // Keyword matches
        for (const keyword of mapping.keywords) {
          if (allText.includes(keyword)) {
            matchScore += 10;
          }
        }

        matches.push({ ...mapping, matchScore });
      }
    }
  }
  
  // If no matches, try keyword-based fallback with weighted scoring
  if (matches.length === 0) {
    console.log(`   ⚠️  No discipline match, trying keyword fallback...`);

    for (const [discipline, socMappings] of Object.entries(DISCIPLINE_SOC_MAP)) {
      for (const mapping of socMappings) {
        let matchScore = 0;
        let keywordMatches: string[] = [];

        // Check if any mapping keywords appear in text
        for (const keyword of mapping.keywords) {
          if (allText.includes(keyword)) {
            // Weight longer keywords more heavily (more specific)
            const weight = keyword.length > 6 ? 20 : 15;
            matchScore += weight;
            keywordMatches.push(keyword);
          }
        }

        // Bonus for title-specific keywords
        if (titleLower.split(/\s+/).some(word => mapping.keywords.includes(word))) {
          matchScore += 25;
        }

        if (matchScore > 0) {
          console.log(`   ✓ Keyword match: ${mapping.title} (score: ${matchScore}, keywords: ${keywordMatches.join(', ')})`);
          matches.push({ ...mapping, matchScore });
        }
      }
    }
  }
  
  // Sort by match score and confidence
  matches.sort((a, b) => {
    const scoreA = a.matchScore * a.confidence;
    const scoreB = b.matchScore * b.confidence;
    return scoreB - scoreA;
  });
  
  // Return top 3 matches
  const topMatches = matches.slice(0, 3);
  
  console.log(`\n   📊 Top SOC Mappings:`);
  topMatches.forEach((m, i) => {
    console.log(`     ${i + 1}. ${m.title} (${m.socCode})`);
    console.log(`        Confidence: ${(m.confidence * 100).toFixed(0)}%`);
    console.log(`        Industries: ${m.industries.slice(0, 3).join(', ')}`);
  });
  
  return topMatches;
}

/**
 * Get broad industry keywords from SOC mappings
 */
export function getIndustryKeywordsFromSOC(socMappings: SOCMapping[]): string[] {
  const allIndustries = socMappings.flatMap(m => m.industries);
  return [...new Set(allIndustries)].slice(0, 10);
}

/**
 * Get job title variations from SOC mappings
 */
export function getJobTitlesFromSOC(socMappings: SOCMapping[]): string[] {
  return socMappings.map(m => m.title);
}

/**
 * Generate fallback skills from SOC code when O*NET API fails
 * Uses SOC mapping keywords and industries as synthetic skills
 */
export function generateFallbackSkillsFromSOC(socMapping: SOCMapping): Array<{
  skill: string;
  category: 'technical' | 'analytical' | 'domain' | 'tool' | 'framework';
  confidence: number;
  source: string;
  keywords: string[];
}> {
  const fallbackSkills = [];

  // Use SOC keywords as technical skills
  for (const keyword of socMapping.keywords.slice(0, 8)) {
    fallbackSkills.push({
      skill: keyword,
      category: 'technical' as const,
      confidence: 0.7, // Lower confidence for fallback
      source: `soc-fallback:${socMapping.socCode}`,
      keywords: [keyword.toLowerCase()]
    });
  }

  // Use industries as domain knowledge
  for (const industry of socMapping.industries.slice(0, 5)) {
    fallbackSkills.push({
      skill: `${industry} domain knowledge`,
      category: 'domain' as const,
      confidence: 0.6,
      source: `soc-fallback:${socMapping.socCode}:industry`,
      keywords: [industry.toLowerCase()]
    });
  }

  return fallbackSkills;
}

/**
 * Generate fallback technologies from SOC code industries
 */
export function generateFallbackTechnologiesFromSOC(socMapping: SOCMapping): string[] {
  // Map industries to common technologies
  const industryTechMap: Record<string, string[]> = {
    'aerospace': ['CAD', 'MATLAB', 'ANSYS', 'SolidWorks', 'CFD Software'],
    'automotive': ['CAD', 'CAE', 'CATIA', 'AutoCAD', 'Simulation Software'],
    'manufacturing': ['CAD', 'CAM', 'PLC', 'SCADA', 'ERP Systems'],
    'software': ['JavaScript', 'Python', 'Git', 'AWS', 'Docker'],
    'data': ['Python', 'SQL', 'Tableau', 'R', 'Machine Learning'],
    'cloud': ['AWS', 'Azure', 'Kubernetes', 'Docker', 'Terraform'],
    'finance': ['Excel', 'SQL', 'Python', 'Bloomberg Terminal', 'VBA']
  };

  const technologies = new Set<string>();

  for (const industry of socMapping.industries) {
    const techs = industryTechMap[industry.toLowerCase()];
    if (techs) {
      techs.forEach(t => technologies.add(t));
    }
  }

  return Array.from(technologies).slice(0, 10);
}
