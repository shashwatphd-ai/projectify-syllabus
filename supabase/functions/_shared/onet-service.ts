/**
 * O*NET Integration Service
 *
 * Integrates with O*NET Web Services (https://services.onetcenter.org/)
 * to map extracted skills to standardized occupations and detailed work activities.
 *
 * Phase 2 of intelligent company matching system.
 *
 * API Documentation: https://services.onetcenter.org/reference/
 * Free Tier: 1000 requests/day (sufficient for our use case)
 */

import { ExtractedSkill } from './skill-extraction-service.ts';
import {
  OccupationProvider,
  OccupationMappingResult,
  StandardOccupation,
  StandardSkill,
  StandardDWA
} from './occupation-provider-interface.ts';

export interface OnetOccupation {
  code: string;              // SOC code (e.g., "17-2141.00")
  title: string;             // "Mechanical Engineers"
  description: string;       // Brief description
  matchScore: number;        // 0.0 to 1.0 - how well it matches extracted skills
  dwas: DetailedWorkActivity[];
  skills: OnetSkill[];
  tools: string[];
  technologies: string[];
  tasks: string[];
}

export interface DetailedWorkActivity {
  id: string;                // DWA ID
  name: string;              // Activity name
  description: string;       // Full description
  importance: number;        // 0-100 (how important this activity is)
  level: number;             // 0-7 (complexity level)
}

export interface OnetSkill {
  id: string;
  name: string;
  description: string;
  importance: number;        // 0-100
  level: number;             // 0-7
}

export interface OnetMappingResult {
  occupations: OnetOccupation[];
  totalMapped: number;
  unmappedSkills: string[];  // Skills that couldn't be mapped
  cacheHits: number;         // For performance monitoring
  apiCalls: number;          // For rate limit monitoring
}

// O*NET API configuration
const ONET_API_BASE = 'https://services.onetcenter.org/ws';
const ONET_VERSION = 'online'; // or 'v28' for specific version

// In-memory cache for O*NET data (30-day TTL)
const onetCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Main function: Map extracted skills to O*NET occupations
 */
export async function mapSkillsToOnet(
  skills: ExtractedSkill[]
): Promise<OnetMappingResult> {
  console.log(`\n🔍 [O*NET] Mapping ${skills.length} skills to occupations...`);

  const occupations: OnetOccupation[] = [];
  const unmappedSkills: string[] = [];
  let cacheHits = 0;
  let apiCalls = 0;

  // Step 1: Search for occupations by skill keywords
  const skillKeywords = skills.map(s => s.skill.toLowerCase());
  const searchResults = await searchOccupationsBySkills(skillKeywords);
  apiCalls += searchResults.apiCalls;
  cacheHits += searchResults.cacheHits;

  console.log(`  Found ${searchResults.occupations.length} potential occupations`);

  // Step 2: Get detailed data for top matching occupations
  const topOccupations = searchResults.occupations.slice(0, 5); // Top 5 matches

  for (const occ of topOccupations) {
    console.log(`  📊 Fetching details for: ${occ.title} (${occ.code})`);

    const details = await getOccupationDetails(occ.code);
    apiCalls += details.apiCalls;
    cacheHits += details.cacheHits;

    occupations.push({
      code: occ.code,
      title: occ.title,
      description: occ.description,
      matchScore: occ.matchScore,
      dwas: details.dwas,
      skills: details.skills,
      tools: details.tools,
      technologies: details.technologies,
      tasks: details.tasks
    });
  }

  // Step 3: Identify unmapped skills
  const mappedSkillNames = new Set(
    occupations.flatMap(occ =>
      occ.skills.map(s => s.name.toLowerCase())
    )
  );

  for (const skill of skills) {
    if (!mappedSkillNames.has(skill.skill.toLowerCase())) {
      unmappedSkills.push(skill.skill);
    }
  }

  console.log(`  ✅ Mapped to ${occupations.length} occupations`);
  console.log(`  ⚠️  Unmapped skills: ${unmappedSkills.length}`);
  console.log(`  💾 Cache hits: ${cacheHits}, API calls: ${apiCalls}`);

  return {
    occupations,
    totalMapped: occupations.length,
    unmappedSkills,
    cacheHits,
    apiCalls
  };
}

/**
 * Search for occupations by skill keywords
 */
async function searchOccupationsBySkills(
  skillKeywords: string[]
): Promise<{ occupations: OnetOccupation[]; apiCalls: number; cacheHits: number }> {
  const occupations: OnetOccupation[] = [];
  let apiCalls = 0;
  let cacheHits = 0;

  // Build search query from skill keywords
  const searchQuery = skillKeywords.slice(0, 3).join(' '); // Use top 3 skills

  // Check cache first
  const cacheKey = `search:${searchQuery}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    cacheHits++;
    return { occupations: cached, apiCalls: 0, cacheHits: 1 };
  }

  // Call O*NET search API
  const url = `${ONET_API_BASE}/${ONET_VERSION}/search?keyword=${encodeURIComponent(searchQuery)}`;
  const response = await callOnetAPI(url);
  apiCalls++;

  if (response && response.occupation) {
    for (const occ of response.occupation.slice(0, 10)) {
      // Calculate match score based on keyword overlap
      const matchScore = calculateMatchScore(skillKeywords, occ.title, occ.tags || []);

      occupations.push({
        code: occ.code,
        title: occ.title,
        description: occ.description || '',
        matchScore,
        dwas: [],
        skills: [],
        tools: [],
        technologies: [],
        tasks: []
      });
    }
  }

  // Sort by match score
  occupations.sort((a, b) => b.matchScore - a.matchScore);

  // Cache results
  setInCache(cacheKey, occupations);

  return { occupations, apiCalls, cacheHits };
}

/**
 * Get detailed information for an occupation
 */
async function getOccupationDetails(
  socCode: string
): Promise<{
  dwas: DetailedWorkActivity[];
  skills: OnetSkill[];
  tools: string[];
  technologies: string[];
  tasks: string[];
  apiCalls: number;
  cacheHits: number;
}> {
  let apiCalls = 0;
  let cacheHits = 0;

  // Fetch multiple endpoints in parallel
  const [dwasData, skillsData, toolsData, techData, tasksData] = await Promise.all([
    getWorkActivities(socCode),
    getSkills(socCode),
    getTools(socCode),
    getTechnologies(socCode),
    getTasks(socCode)
  ]);

  apiCalls += dwasData.apiCalls + skillsData.apiCalls + toolsData.apiCalls +
              techData.apiCalls + tasksData.apiCalls;
  cacheHits += dwasData.cacheHits + skillsData.cacheHits + toolsData.cacheHits +
               techData.cacheHits + tasksData.cacheHits;

  return {
    dwas: dwasData.dwas,
    skills: skillsData.skills,
    tools: toolsData.tools,
    technologies: techData.technologies,
    tasks: tasksData.tasks,
    apiCalls,
    cacheHits
  };
}

/**
 * Get detailed work activities for an occupation
 */
async function getWorkActivities(
  socCode: string
): Promise<{ dwas: DetailedWorkActivity[]; apiCalls: number; cacheHits: number }> {
  const cacheKey = `dwas:${socCode}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { dwas: cached, apiCalls: 0, cacheHits: 1 };
  }

  const url = `${ONET_API_BASE}/${ONET_VERSION}/occupations/${socCode}/details/work_activities`;
  const response = await callOnetAPI(url);

  const dwas: DetailedWorkActivity[] = [];
  if (response && response.work_activity) {
    for (const wa of response.work_activity) {
      dwas.push({
        id: wa.id,
        name: wa.name,
        description: wa.description || wa.name,
        importance: parseFloat(wa.importance?.value || '0'),
        level: parseFloat(wa.level?.value || '0')
      });
    }
  }

  setInCache(cacheKey, dwas);
  return { dwas, apiCalls: 1, cacheHits: 0 };
}

/**
 * Get skills for an occupation
 */
async function getSkills(
  socCode: string
): Promise<{ skills: OnetSkill[]; apiCalls: number; cacheHits: number }> {
  const cacheKey = `skills:${socCode}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { skills: cached, apiCalls: 0, cacheHits: 1 };
  }

  const url = `${ONET_API_BASE}/${ONET_VERSION}/occupations/${socCode}/details/skills`;
  const response = await callOnetAPI(url);

  const skills: OnetSkill[] = [];
  if (response && response.skill) {
    for (const skill of response.skill) {
      skills.push({
        id: skill.id,
        name: skill.name,
        description: skill.description || skill.name,
        importance: parseFloat(skill.importance?.value || '0'),
        level: parseFloat(skill.level?.value || '0')
      });
    }
  }

  setInCache(cacheKey, skills);
  return { skills, apiCalls: 1, cacheHits: 0 };
}

/**
 * Get tools for an occupation
 */
async function getTools(
  socCode: string
): Promise<{ tools: string[]; apiCalls: number; cacheHits: number }> {
  const cacheKey = `tools:${socCode}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { tools: cached, apiCalls: 0, cacheHits: 1 };
  }

  const url = `${ONET_API_BASE}/${ONET_VERSION}/occupations/${socCode}/details/tools_used`;
  const response = await callOnetAPI(url);

  const tools: string[] = [];
  if (response && response.tool) {
    for (const tool of response.tool) {
      tools.push(tool.name);
    }
  }

  setInCache(cacheKey, tools);
  return { tools, apiCalls: 1, cacheHits: 0 };
}

/**
 * Get technologies for an occupation
 */
async function getTechnologies(
  socCode: string
): Promise<{ technologies: string[]; apiCalls: number; cacheHits: number }> {
  const cacheKey = `tech:${socCode}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { technologies: cached, apiCalls: 0, cacheHits: 1 };
  }

  const url = `${ONET_API_BASE}/${ONET_VERSION}/occupations/${socCode}/details/technology_skills`;
  const response = await callOnetAPI(url);

  const technologies: string[] = [];
  if (response && response.technology) {
    for (const tech of response.technology) {
      technologies.push(tech.name);
    }
  }

  setInCache(cacheKey, technologies);
  return { technologies, apiCalls: 1, cacheHits: 0 };
}

/**
 * Get tasks for an occupation
 */
async function getTasks(
  socCode: string
): Promise<{ tasks: string[]; apiCalls: number; cacheHits: number }> {
  const cacheKey = `tasks:${socCode}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { tasks: cached, apiCalls: 0, cacheHits: 1 };
  }

  const url = `${ONET_API_BASE}/${ONET_VERSION}/occupations/${socCode}/details/tasks`;
  const response = await callOnetAPI(url);

  const tasks: string[] = [];
  if (response && response.task) {
    for (const task of response.task) {
      tasks.push(task.statement || task.name);
    }
  }

  setInCache(cacheKey, tasks);
  return { tasks, apiCalls: 1, cacheHits: 0 };
}

/**
 * Call O*NET API with authentication
 */
async function callOnetAPI(url: string): Promise<any> {
  const username = Deno.env.get('ONET_USERNAME');
  const password = Deno.env.get('ONET_PASSWORD');

  if (!username || !password) {
    console.error('❌ O*NET credentials not configured');
    console.error('   Set ONET_USERNAME and ONET_PASSWORD in Supabase secrets');
    throw new Error('O*NET credentials missing');
  }

  const authString = btoa(`${username}:${password}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
        'User-Agent': 'Projectify-Syllabus/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('O*NET authentication failed - check credentials');
      }
      if (response.status === 429) {
        throw new Error('O*NET rate limit exceeded (1000/day)');
      }
      throw new Error(`O*NET API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ O*NET API call failed: ${url}`, error);
    return null;
  }
}

/**
 * Calculate match score between skill keywords and occupation
 */
function calculateMatchScore(
  skillKeywords: string[],
  occupationTitle: string,
  occupationTags: string[]
): number {
  const allTerms = [occupationTitle, ...occupationTags]
    .join(' ')
    .toLowerCase();

  let matches = 0;
  for (const keyword of skillKeywords) {
    if (allTerms.includes(keyword)) {
      matches++;
    }
  }

  return matches / skillKeywords.length;
}

/**
 * Cache management
 */
function getFromCache(key: string): any | null {
  const cached = onetCache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    onetCache.delete(key);
    return null;
  }

  return cached.data;
}

function setInCache(key: string, data: any): void {
  onetCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Format O*NET results for display/logging
 */
export function formatOnetMappingForDisplay(result: OnetMappingResult): string {
  const lines = [
    `\n📊 O*NET Mapping Results`,
    `   Occupations Mapped: ${result.totalMapped}`,
    `   Unmapped Skills: ${result.unmappedSkills.length}`,
    `   API Performance: ${result.cacheHits} cache hits, ${result.apiCalls} API calls`,
    '\n   Top Occupations:'
  ];

  result.occupations.forEach((occ, i) => {
    lines.push(`\n   ${i + 1}. ${occ.title} (${occ.code}) - Match: ${(occ.matchScore * 100).toFixed(0)}%`);
    lines.push(`      DWAs: ${occ.dwas.length}, Skills: ${occ.skills.length}`);
    lines.push(`      Tools: ${occ.tools.slice(0, 5).join(', ')}${occ.tools.length > 5 ? '...' : ''}`);
    lines.push(`      Technologies: ${occ.technologies.slice(0, 5).join(', ')}${occ.technologies.length > 5 ? '...' : ''}`);
  });

  if (result.unmappedSkills.length > 0) {
    lines.push(`\n   ⚠️  Unmapped Skills: ${result.unmappedSkills.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Get job titles from O*NET occupations
 */
export function extractJobTitlesFromOnet(occupations: OnetOccupation[]): string[] {
  const titles = new Set<string>();

  for (const occ of occupations) {
    // Add main occupation title
    titles.add(occ.title);

    // Add variant titles (from tasks/descriptions)
    // e.g., "Mechanical Engineer" → ["Mechanical Engineer", "HVAC Engineer", "Thermal Engineer"]
    // This would come from O*NET's "Sample of Reported Job Titles" endpoint
    // For now, just use the main title
  }

  return Array.from(titles);
}

/**
 * Get industry keywords from DWAs
 */
export function extractIndustryKeywordsFromDWAs(dwas: DetailedWorkActivity[]): string[] {
  const keywords = new Set<string>();

  // Extract domain-specific terms from high-importance DWAs
  const importantDWAs = dwas
    .filter(dwa => dwa.importance > 70)
    .slice(0, 10);

  for (const dwa of importantDWAs) {
    // Simple keyword extraction (can be improved with NLP)
    const words = dwa.description
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 4); // Filter short words

    words.forEach(w => keywords.add(w));
  }

  return Array.from(keywords);
}

/**
 * O*NET Provider Implementation (implements OccupationProvider interface)
 */
export class OnetProvider implements OccupationProvider {
  readonly name = 'onet';
  readonly version = '28.0'; // O*NET database version

  /**
   * Check if O*NET credentials are configured
   */
  isConfigured(): boolean {
    const username = Deno.env.get('ONET_USERNAME');
    const password = Deno.env.get('ONET_PASSWORD');
    return !!(username && password);
  }

  /**
   * Health check - verify O*NET API is accessible
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️  [O*NET] Credentials not configured');
      return false;
    }

    try {
      // Try a simple API call
      const url = `${ONET_API_BASE}/${ONET_VERSION}/about`;
      const response = await callOnetAPI(url);
      return !!response;
    } catch (error) {
      console.error('❌ [O*NET] Health check failed:', error);
      return false;
    }
  }

  /**
   * Map skills to O*NET occupations (implements interface method)
   */
  async mapSkillsToOccupations(
    skills: ExtractedSkill[]
  ): Promise<OccupationMappingResult> {
    const startTime = Date.now();

    // Call existing mapSkillsToOnet function
    const onetResult = await mapSkillsToOnet(skills);

    // Convert OnetMappingResult to OccupationMappingResult (standardized format)
    const standardOccupations: StandardOccupation[] = onetResult.occupations.map(occ => ({
      code: occ.code,
      title: occ.title,
      description: occ.description,
      matchScore: occ.matchScore,
      skills: occ.skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: 'technical',
        importance: s.importance,
        level: s.level
      })),
      dwas: occ.dwas.map(dwa => ({
        id: dwa.id,
        name: dwa.name,
        description: dwa.description,
        importance: dwa.importance,
        level: dwa.level
      })),
      tools: occ.tools,
      technologies: occ.technologies, // Map technologies from O*NET
      tasks: occ.tasks,
      provider: this.name,
      confidence: 0.95 // O*NET has very high quality data
    }));

    const processingTimeMs = Date.now() - startTime;

    return {
      occupations: standardOccupations,
      totalMapped: standardOccupations.length,
      unmappedSkills: onetResult.unmappedSkills,
      provider: this.name,
      apiCalls: onetResult.apiCalls,
      cacheHits: onetResult.cacheHits,
      processingTimeMs,
      metadata: {
        onetVersion: this.version,
        apiBase: ONET_API_BASE
      }
    };
  }

  /**
   * Get occupation details by SOC code
   */
  async getOccupationDetails(code: string): Promise<StandardOccupation | null> {
    try {
      const details = await getOccupationDetails(code);

      return {
        code,
        title: '', // Would need to fetch from API
        description: '',
        matchScore: 1.0,
        skills: details.skills.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: 'technical',
          importance: s.importance,
          level: s.level
        })),
        dwas: details.dwas.map(dwa => ({
          id: dwa.id,
          name: dwa.name,
          description: dwa.description,
          importance: dwa.importance,
          level: dwa.level
        })),
        tools: details.tools,
        technologies: details.technologies,
        tasks: details.tasks,
        provider: this.name,
        confidence: 0.95
      };
    } catch (error) {
      console.error(`❌ [O*NET] Failed to fetch details for ${code}:`, error);
      return null;
    }
  }
}
