/**
 * ESCO Occupation Provider
 *
 * Integrates with ESCO API (European Skills, Competences, Qualifications and Occupations)
 * https://ec.europa.eu/esco/portal/api
 *
 * Benefits:
 * - FREE - No authentication required
 * - 3000+ occupations
 * - 13,000+ skills
 * - Multi-language support (we use English)
 * - No rate limits for reasonable use
 *
 * Part of P0-4 Phase 2: Multi-provider occupation mapping
 */

import {
  OccupationProvider,
  OccupationMappingResult,
  StandardOccupation,
  StandardSkill,
  StandardDWA
} from './occupation-provider-interface.ts';
import { ExtractedSkill } from './skill-extraction-service.ts';

// ESCO API configuration
const ESCO_API_BASE = 'https://ec.europa.eu/esco/api';
const ESCO_LANGUAGE = 'en'; // English
const ESCO_VERSION = 'v1';

// In-memory cache (30-day TTL)
const escoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * ESCO Provider Implementation
 */
export class ESCOProvider implements OccupationProvider {
  readonly name = 'esco';
  readonly version = '1.1.1'; // ESCO v1.1.1

  /**
   * ESCO is always configured (no auth required)
   */
  isConfigured(): boolean {
    return true; // No credentials needed
  }

  /**
   * Health check - verify ESCO API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${ESCO_API_BASE}/resource/occupation?uri=http://data.europa.eu/esco/occupation/114e1eff-215e-47df-8e10-45a5b72f8197&language=${ESCO_LANGUAGE}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch (error) {
      console.error('❌ [ESCO] Health check failed:', error);
      return false;
    }
  }

  /**
   * Map skills to ESCO occupations
   */
  async mapSkillsToOccupations(
    skills: ExtractedSkill[]
  ): Promise<OccupationMappingResult> {
    const startTime = Date.now();
    console.log(`\n🇪🇺 [ESCO] Mapping ${skills.length} skills to occupations...`);

    const occupations: StandardOccupation[] = [];
    const unmappedSkills: string[] = [];
    let apiCalls = 0;
    let cacheHits = 0;

    // Step 1: Search for occupations by skill keywords
    const skillKeywords = skills.map(s => s.skill);
    const searchResults = await this.searchOccupationsBySkills(skillKeywords);
    apiCalls += searchResults.apiCalls;
    cacheHits += searchResults.cacheHits;

    console.log(`  Found ${searchResults.occupations.length} potential ESCO occupations`);

    // Step 2: Get detailed data for top matches
    const topOccupations = searchResults.occupations.slice(0, 5);

    for (const occ of topOccupations) {
      console.log(`  📊 Fetching details for: ${occ.title}`);

      const details = await this.getOccupationDetailsById(occ.uri);
      apiCalls += details.apiCalls;
      cacheHits += details.cacheHits;

      if (details.occupation) {
        occupations.push(details.occupation);
      }
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

    const processingTimeMs = Date.now() - startTime;

    console.log(`  ✅ Mapped to ${occupations.length} ESCO occupations`);
    console.log(`  ⚠️  Unmapped skills: ${unmappedSkills.length}`);
    console.log(`  💾 Cache: ${cacheHits} hits, ${apiCalls} API calls`);
    console.log(`  ⏱️  Processing time: ${processingTimeMs}ms`);

    return {
      occupations,
      totalMapped: occupations.length,
      unmappedSkills,
      provider: this.name,
      apiCalls,
      cacheHits,
      processingTimeMs,
      metadata: {
        escoVersion: this.version,
        language: ESCO_LANGUAGE
      }
    };
  }

  /**
   * Search for occupations by skill keywords
   */
  private async searchOccupationsBySkills(
    skillKeywords: string[]
  ): Promise<{
    occupations: Array<{ uri: string; title: string; matchScore: number }>;
    apiCalls: number;
    cacheHits: number;
  }> {
    const occupations: Array<{ uri: string; title: string; matchScore: number }> = [];
    let apiCalls = 0;
    let cacheHits = 0;

    // Build search query from top skills
    const searchQuery = skillKeywords.slice(0, 3).join(' ');

    // Check cache
    const cacheKey = `search:${searchQuery}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      cacheHits++;
      return { occupations: cached, apiCalls: 0, cacheHits: 1 };
    }

    // Call ESCO search API
    const url = `${ESCO_API_BASE}/search?text=${encodeURIComponent(searchQuery)}&type=occupation&language=${ESCO_LANGUAGE}&limit=20`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Projectify-Syllabus/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`ESCO API error: ${response.status}`);
      }

      const data = await response.json();
      apiCalls++;

      // Parse results
      if (data._embedded?.results) {
        for (const result of data._embedded.results) {
          // Calculate match score based on keyword overlap
          const matchScore = this.calculateMatchScore(
            skillKeywords,
            result.title || '',
            result.description || ''
          );

          occupations.push({
            uri: result.uri,
            title: result.title,
            matchScore
          });
        }
      }

      // Sort by match score
      occupations.sort((a, b) => b.matchScore - a.matchScore);

      // Cache results
      this.setInCache(cacheKey, occupations);

    } catch (error) {
      console.error('❌ [ESCO] Search failed:', error);
    }

    return { occupations, apiCalls, cacheHits };
  }

  /**
   * Get detailed occupation data by ESCO URI
   */
  private async getOccupationDetailsById(
    uri: string
  ): Promise<{
    occupation: StandardOccupation | null;
    apiCalls: number;
    cacheHits: number;
  }> {
    // Check cache
    const cacheKey = `occupation:${uri}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { occupation: cached, apiCalls: 0, cacheHits: 1 };
    }

    try {
      // Fetch occupation details
      const url = `${ESCO_API_BASE}/resource/occupation?uri=${encodeURIComponent(uri)}&language=${ESCO_LANGUAGE}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Projectify-Syllabus/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`ESCO API error: ${response.status}`);
      }

      const data = await response.json();

      // Convert ESCO format to StandardOccupation
      const occupation: StandardOccupation = {
        code: uri, // Use URI as code
        title: data.title || 'Unknown',
        description: data.description?.literal || data.description || '',
        matchScore: 0.8, // Default, will be updated by coordinator
        skills: this.parseEscoSkills(data.hasEssentialSkill || [], data.hasOptionalSkill || []),
        dwas: this.parseEscoDWAs(data.broaderRelations || []),
        tools: [], // ESCO doesn't have explicit tools
        technologies: [], // ESCO doesn't have explicit technologies
        tasks: [], // ESCO doesn't have explicit tasks
        provider: this.name,
        confidence: 0.85 // ESCO has good quality data
      };

      // Cache result
      this.setInCache(cacheKey, occupation);

      return { occupation, apiCalls: 1, cacheHits: 0 };

    } catch (error) {
      console.error(`❌ [ESCO] Failed to fetch occupation ${uri}:`, error);
      return { occupation: null, apiCalls: 1, cacheHits: 0 };
    }
  }

  /**
   * Parse ESCO skills into StandardSkill format
   */
  private parseEscoSkills(
    essentialSkills: any[],
    optionalSkills: any[]
  ): StandardSkill[] {
    const skills: StandardSkill[] = [];

    // Essential skills (higher importance)
    for (const skill of essentialSkills) {
      skills.push({
        id: skill.uri || skill.skillType,
        name: skill.preferredLabel || skill.skill,
        description: skill.description?.literal || '',
        category: this.mapEscoSkillType(skill.skillType),
        importance: 90, // Essential
        level: 0
      });
    }

    // Optional skills (lower importance)
    for (const skill of optionalSkills) {
      skills.push({
        id: skill.uri || skill.skillType,
        name: skill.preferredLabel || skill.skill,
        description: skill.description?.literal || '',
        category: this.mapEscoSkillType(skill.skillType),
        importance: 60, // Optional
        level: 0
      });
    }

    return skills;
  }

  /**
   * Map ESCO skill types to our standard categories
   */
  private mapEscoSkillType(skillType: string): string {
    const typeMap: Record<string, string> = {
      'skill/competence': 'technical',
      'knowledge': 'domain',
      'skill': 'technical',
      'transversal-skill': 'soft',
      'language': 'soft'
    };

    return typeMap[skillType?.toLowerCase()] || 'technical';
  }

  /**
   * Parse ESCO broader relations into DWA-like format
   */
  private parseEscoDWAs(broaderRelations: any[]): StandardDWA[] {
    const dwas: StandardDWA[] = [];

    for (const relation of broaderRelations) {
      dwas.push({
        id: relation.uri || '',
        name: relation.preferredLabel || 'Work Activity',
        description: relation.description?.literal || '',
        importance: 75,
        level: 0
      });
    }

    return dwas;
  }

  /**
   * Calculate match score between skill keywords and occupation
   */
  private calculateMatchScore(
    skillKeywords: string[],
    title: string,
    description: string
  ): number {
    const text = `${title} ${description}`.toLowerCase();
    let matches = 0;

    for (const keyword of skillKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    return skillKeywords.length > 0 ? matches / skillKeywords.length : 0;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = escoCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL_MS) {
      escoCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setInCache(key: string, data: any): void {
    escoCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get occupation details by code (implements optional interface method)
   */
  async getOccupationDetails(code: string): Promise<StandardOccupation | null> {
    const result = await this.getOccupationDetailsById(code);
    return result.occupation;
  }
}

/**
 * Format ESCO mapping results for display
 */
export function formatEscoMappingForDisplay(result: OccupationMappingResult): string {
  const lines = [
    `\n🇪🇺 ESCO Mapping Results`,
    `   Occupations Mapped: ${result.totalMapped}`,
    `   Unmapped Skills: ${result.unmappedSkills.length}`,
    `   Performance: ${result.cacheHits} cache hits, ${result.apiCalls} API calls`,
    `   Processing Time: ${result.processingTimeMs}ms`,
    '\n   Top Occupations:'
  ];

  result.occupations.forEach((occ, i) => {
    lines.push(`\n   ${i + 1}. ${occ.title}`);
    lines.push(`      Match: ${(occ.matchScore * 100).toFixed(0)}%, Confidence: ${(occ.confidence * 100).toFixed(0)}%`);
    lines.push(`      Skills: ${occ.skills.length}, DWAs: ${occ.dwas.length}`);
    if (occ.skills.length > 0) {
      const topSkills = occ.skills.slice(0, 5).map(s => s.name).join(', ');
      lines.push(`      Top Skills: ${topSkills}${occ.skills.length > 5 ? '...' : ''}`);
    }
  });

  if (result.unmappedSkills.length > 0) {
    lines.push(`\n   ⚠️  Unmapped Skills: ${result.unmappedSkills.join(', ')}`);
  }

  return lines.join('\n');
}
