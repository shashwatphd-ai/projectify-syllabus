/**
 * Lightcast Open Skills Integration Service
 *
 * Integrates with Lightcast Open Skills API for enhanced skill taxonomy.
 * Provides 32,000+ skills vs O*NET's ~1,000 skills.
 *
 * Phase 4 of intelligent company matching system.
 *
 * API Documentation: https://docs.lightcast.io/apis/open-skills
 * Free Tier: 1,000 requests/day
 * Updates: Bi-weekly from 40,000+ sources
 */

import { ExtractedSkill } from './skill-extraction-service.ts';

export interface LightcastSkill {
  id: string;                    // UUID
  name: string;                  // Standardized skill name
  type: string;                  // "Hard" or "Soft"
  category: string;              // Skill category
  subcategory?: string;          // More specific category
  infoUrl?: string;              // Link to skill details
  relatedSkills?: string[];      // Related skill IDs
  tags?: string[];               // Additional tags
  confidence: number;            // 0.0 to 1.0 (our matching confidence)
}

export interface LightcastEnrichedSkill extends ExtractedSkill {
  lightcastId?: string;          // Lightcast UUID
  lightcastName?: string;        // Standardized name
  lightcastType?: string;        // Hard/Soft
  lightcastCategory?: string;    // Category from taxonomy
  relatedSkills?: string[];      // Related skill names
}

export interface LightcastEnrichmentResult {
  enrichedSkills: LightcastEnrichedSkill[];
  totalEnriched: number;
  unmatchedSkills: string[];
  apiCalls: number;
  cacheHits: number;
}

// Lightcast API configuration
const LIGHTCAST_API_BASE = 'https://emsiservices.com/skills';
const LIGHTCAST_API_VERSION = 'versions/latest';

// In-memory cache for Lightcast data (7-day TTL due to bi-weekly updates)
const lightcastCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Enrich extracted skills with Lightcast taxonomy
 */
export async function enrichSkillsWithLightcast(
  skills: ExtractedSkill[]
): Promise<LightcastEnrichmentResult> {
  console.log(`\n🌟 [Lightcast] Enriching ${skills.length} skills with Lightcast taxonomy...`);

  const enrichedSkills: LightcastEnrichedSkill[] = [];
  const unmatchedSkills: string[] = [];
  let apiCalls = 0;
  let cacheHits = 0;

  for (const skill of skills) {
    // Search Lightcast for this skill
    const searchResult = await searchLightcastSkill(skill.skill);
    apiCalls += searchResult.apiCalls;
    cacheHits += searchResult.cacheHits;

    if (searchResult.match) {
      enrichedSkills.push({
        ...skill,
        lightcastId: searchResult.match.id,
        lightcastName: searchResult.match.name,
        lightcastType: searchResult.match.type,
        lightcastCategory: searchResult.match.category,
        relatedSkills: searchResult.match.relatedSkills
      });
    } else {
      unmatchedSkills.push(skill.skill);
      // Keep original skill even if not matched in Lightcast
      enrichedSkills.push(skill);
    }
  }

  console.log(`  ✅ Enriched: ${enrichedSkills.filter(s => s.lightcastId).length}/${skills.length} skills`);
  console.log(`  ⚠️  Unmatched: ${unmatchedSkills.length}`);
  console.log(`  💾 Cache: ${cacheHits} hits, ${apiCalls} API calls`);

  return {
    enrichedSkills,
    totalEnriched: enrichedSkills.filter(s => s.lightcastId).length,
    unmatchedSkills,
    apiCalls,
    cacheHits
  };
}

/**
 * Search for a skill in Lightcast taxonomy
 */
async function searchLightcastSkill(
  skillName: string
): Promise<{ match: LightcastSkill | null; apiCalls: number; cacheHits: number }> {
  // Check cache first
  const cacheKey = `skill:${skillName.toLowerCase()}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { match: cached, apiCalls: 0, cacheHits: 1 };
  }

  // Call Lightcast API
  const url = `${LIGHTCAST_API_BASE}/${LIGHTCAST_API_VERSION}/skills?q=${encodeURIComponent(skillName)}&limit=1`;
  const response = await callLightcastAPI(url);

  if (response && response.data && response.data.length > 0) {
    const skillData = response.data[0];
    const match: LightcastSkill = {
      id: skillData.id,
      name: skillData.name,
      type: skillData.type?.name || 'Unknown',
      category: skillData.category?.name || 'Unknown',
      subcategory: skillData.subcategory?.name,
      infoUrl: skillData.infoUrl,
      relatedSkills: skillData.relatedSkills?.map((rs: any) => rs.name) || [],
      tags: skillData.tags || [],
      confidence: 0.9 // High confidence for direct API match
    };

    setInCache(cacheKey, match);
    return { match, apiCalls: 1, cacheHits: 0 };
  }

  return { match: null, apiCalls: 1, cacheHits: 0 };
}

/**
 * Get skill relationships from Lightcast
 */
export async function getRelatedSkills(
  skillId: string
): Promise<LightcastSkill[]> {
  const cacheKey = `related:${skillId}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${LIGHTCAST_API_BASE}/${LIGHTCAST_API_VERSION}/skills/${skillId}/related`;
  const response = await callLightcastAPI(url);

  const relatedSkills: LightcastSkill[] = [];
  if (response && response.data) {
    for (const skill of response.data) {
      relatedSkills.push({
        id: skill.id,
        name: skill.name,
        type: skill.type?.name || 'Unknown',
        category: skill.category?.name || 'Unknown',
        confidence: 0.7 // Lower confidence for related skills
      });
    }
  }

  setInCache(cacheKey, relatedSkills);
  return relatedSkills;
}

/**
 * Extract skills from job posting text using Lightcast
 */
export async function extractSkillsFromJobPosting(
  jobPostingText: string
): Promise<LightcastSkill[]> {
  const cacheKey = `extract:${jobPostingText.substring(0, 100)}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${LIGHTCAST_API_BASE}/${LIGHTCAST_API_VERSION}/extract`;
  const response = await callLightcastAPI(url, 'POST', {
    text: jobPostingText,
    confidenceThreshold: 0.5
  });

  const extractedSkills: LightcastSkill[] = [];
  if (response && response.data) {
    for (const skill of response.data) {
      extractedSkills.push({
        id: skill.skill.id,
        name: skill.skill.name,
        type: skill.skill.type?.name || 'Unknown',
        category: skill.skill.category?.name || 'Unknown',
        confidence: skill.confidence
      });
    }
  }

  setInCache(cacheKey, extractedSkills);
  return extractedSkills;
}

/**
 * Call Lightcast API with authentication
 */
async function callLightcastAPI(
  url: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const apiKey = Deno.env.get('LIGHTCAST_API_KEY');

  if (!apiKey) {
    console.warn('⚠️  Lightcast API key not configured - skipping enrichment');
    console.warn('   Set LIGHTCAST_API_KEY in Supabase secrets for Phase 4 features');
    return null;
  }

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Lightcast authentication failed - check API key');
      }
      if (response.status === 429) {
        throw new Error('Lightcast rate limit exceeded (1000/day)');
      }
      console.error(`❌ Lightcast API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Lightcast API call failed: ${url}`, error);
    return null;
  }
}

/**
 * Cache management
 */
function getFromCache(key: string): any | null {
  const cached = lightcastCache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    lightcastCache.delete(key);
    return null;
  }

  return cached.data;
}

function setInCache(key: string, data: any): void {
  lightcastCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Format Lightcast enrichment for display
 */
export function formatLightcastEnrichmentForDisplay(result: LightcastEnrichmentResult): string {
  const lines = [
    `\n🌟 Lightcast Enrichment Results`,
    `   Total Skills: ${result.enrichedSkills.length}`,
    `   Enriched: ${result.totalEnriched}`,
    `   Unmatched: ${result.unmatchedSkills.length}`,
    `   API Performance: ${result.cacheHits} cache hits, ${result.apiCalls} API calls`,
    '\n   Enriched Skills:'
  ];

  result.enrichedSkills
    .filter(s => s.lightcastId)
    .slice(0, 10)
    .forEach(skill => {
      lines.push(`\n   • ${skill.skill}`);
      lines.push(`     Lightcast: ${skill.lightcastName} (${skill.lightcastType})`);
      lines.push(`     Category: ${skill.lightcastCategory}`);
      if (skill.relatedSkills && skill.relatedSkills.length > 0) {
        lines.push(`     Related: ${skill.relatedSkills.slice(0, 3).join(', ')}`);
      }
    });

  if (result.unmatchedSkills.length > 0) {
    lines.push(`\n   ⚠️  Unmatched: ${result.unmatchedSkills.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Compare course skills with company skills using Lightcast
 */
export async function compareSkillsWithLightcast(
  courseSkills: LightcastEnrichedSkill[],
  companyJobPostings: any[]
): Promise<{
  matchingSkills: string[];
  matchScore: number;
  explanation: string;
}> {
  // Extract skills from company job postings
  const companySkills: LightcastSkill[] = [];
  for (const posting of companyJobPostings) {
    if (posting.title || posting.description) {
      const text = `${posting.title || ''} ${posting.description || ''}`;
      const extracted = await extractSkillsFromJobPosting(text);
      companySkills.push(...extracted);
    }
  }

  // Find matching skills by Lightcast ID
  const matchingSkills: string[] = [];
  const courseSkillIds = new Set(
    courseSkills
      .filter(s => s.lightcastId)
      .map(s => s.lightcastId!)
  );

  for (const companySkill of companySkills) {
    if (courseSkillIds.has(companySkill.id)) {
      matchingSkills.push(companySkill.name);
    }
  }

  // Calculate match score
  const matchScore = courseSkills.length > 0
    ? matchingSkills.length / courseSkills.filter(s => s.lightcastId).length
    : 0;

  // Generate explanation
  const explanation = matchingSkills.length > 0
    ? `Strong skill alignment: ${matchingSkills.length} matching skills from Lightcast taxonomy (${matchingSkills.slice(0, 3).join(', ')})`
    : 'Limited skill overlap based on Lightcast analysis';

  return {
    matchingSkills,
    matchScore,
    explanation
  };
}
