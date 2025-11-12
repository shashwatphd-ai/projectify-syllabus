/**
 * Occupation Coordinator
 *
 * Coordinates multiple occupation providers (ESCO, Skills-ML, O*NET)
 * to produce unified, high-quality occupation mappings.
 *
 * Strategy:
 * 1. Query all configured providers in parallel
 * 2. Merge and deduplicate results
 * 3. Score occupations based on multi-provider agreement
 * 4. Return ranked list with confidence scores
 *
 * Part of P0-4 Phase 2: Multi-provider occupation mapping
 */

import {
  OccupationProvider,
  OccupationMappingResult,
  StandardOccupation,
  MultiProviderConfig
} from './occupation-provider-interface.ts';
import { ExtractedSkill } from './skill-extraction-service.ts';

/**
 * Coordinated mapping result
 */
export interface CoordinatedMappingResult {
  occupations: StandardOccupation[];      // Merged and ranked occupations
  totalMapped: number;
  unmappedSkills: string[];
  providersUsed: string[];                // Which providers contributed
  providerResults: Map<string, OccupationMappingResult>; // Individual provider results
  coordinationStrategy: string;
  processingTimeMs: number;
  healthStatus: Map<string, boolean>;     // Health status of each provider
}

/**
 * Occupation Coordinator
 */
export class OccupationCoordinator {
  private providers: Map<string, OccupationProvider>;
  private config: MultiProviderConfig;

  constructor(
    providers: OccupationProvider[],
    config?: Partial<MultiProviderConfig>
  ) {
    this.providers = new Map();
    for (const provider of providers) {
      this.providers.set(provider.name, provider);
    }

    // Default configuration
    this.config = {
      providers: {
        esco: { enabled: true, priority: 2 },
        skillsml: { enabled: true, priority: 3 }, // Highest priority (fastest, local)
        onet: { enabled: false, priority: 1 }     // Disabled by default (needs credentials)
      },
      coordinationStrategy: 'weighted',
      minProviders: 1,
      fallbackOrder: ['skillsml', 'esco', 'onet'],
      ...config
    };
  }

  /**
   * Health check all providers
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    console.log('\n🏥 Health checking all providers...');
    const healthStatus = new Map<string, boolean>();

    const checks = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      const isHealthy = await provider.healthCheck();
      healthStatus.set(name, isHealthy);
      console.log(`  ${isHealthy ? '✅' : '❌'} ${name}: ${isHealthy ? 'healthy' : 'unavailable'}`);
      return { name, isHealthy };
    });

    await Promise.all(checks);
    return healthStatus;
  }

  /**
   * Map skills using multiple providers with coordination
   */
  async mapSkillsToOccupations(
    skills: ExtractedSkill[]
  ): Promise<CoordinatedMappingResult> {
    const startTime = Date.now();
    console.log(`\n🎯 [Coordinator] Mapping ${skills.length} skills using multi-provider strategy...`);

    // Step 1: Health check and filter enabled providers
    const healthStatus = await this.healthCheckAll();
    const enabledProviders = this.getEnabledProviders(healthStatus);

    if (enabledProviders.length === 0) {
      throw new Error('No providers available - all providers failed health check');
    }

    console.log(`\n  Active providers: ${enabledProviders.map(p => p.name).join(', ')}`);

    // Step 2: Query all providers in parallel
    console.log('\n  🔄 Querying providers in parallel...');
    const providerResults = new Map<string, OccupationMappingResult>();

    const queries = enabledProviders.map(async (provider) => {
      try {
        const result = await provider.mapSkillsToOccupations(skills);
        providerResults.set(provider.name, result);
        return { name: provider.name, result };
      } catch (error) {
        console.error(`  ❌ Provider ${provider.name} failed:`, error);
        return { name: provider.name, result: null };
      }
    });

    await Promise.all(queries);

    // Step 3: Merge and coordinate results
    console.log('\n  🔀 Merging provider results...');
    const mergedOccupations = this.mergeOccupations(providerResults);

    // Step 4: Rank by coordination score
    const rankedOccupations = this.rankByCoordinationScore(
      mergedOccupations,
      providerResults
    );

    // Step 5: Identify unmapped skills
    const unmappedSkills = this.identifyUnmappedSkills(skills, rankedOccupations);

    const processingTimeMs = Date.now() - startTime;
    const providersUsed = Array.from(providerResults.keys());

    console.log('\n  ✅ Coordination complete!');
    console.log(`     Providers used: ${providersUsed.join(', ')}`);
    console.log(`     Occupations found: ${rankedOccupations.length}`);
    console.log(`     Unmapped skills: ${unmappedSkills.length}`);
    console.log(`     Total time: ${processingTimeMs}ms`);

    return {
      occupations: rankedOccupations,
      totalMapped: rankedOccupations.length,
      unmappedSkills,
      providersUsed,
      providerResults,
      coordinationStrategy: this.config.coordinationStrategy,
      processingTimeMs,
      healthStatus
    };
  }

  /**
   * Get enabled and healthy providers, sorted by priority
   */
  private getEnabledProviders(
    healthStatus: Map<string, boolean>
  ): OccupationProvider[] {
    const enabled: Array<{ provider: OccupationProvider; priority: number }> = [];

    for (const [name, provider] of this.providers) {
      const providerConfig = this.config.providers[name as keyof typeof this.config.providers];
      const isHealthy = healthStatus.get(name) ?? false;
      const isConfigured = provider.isConfigured();
      const isEnabled = providerConfig?.enabled ?? false;

      if (isEnabled && isHealthy && isConfigured) {
        enabled.push({
          provider,
          priority: providerConfig?.priority ?? 0
        });
      }
    }

    // Sort by priority (higher = more important)
    enabled.sort((a, b) => b.priority - a.priority);

    return enabled.map(e => e.provider);
  }

  /**
   * Merge occupations from multiple providers
   */
  private mergeOccupations(
    providerResults: Map<string, OccupationMappingResult>
  ): Map<string, StandardOccupation[]> {
    const occupationsByTitle = new Map<string, StandardOccupation[]>();

    for (const [providerName, result] of providerResults) {
      for (const occupation of result.occupations) {
        // Normalize title for matching
        const normalizedTitle = this.normalizeOccupationTitle(occupation.title);

        if (!occupationsByTitle.has(normalizedTitle)) {
          occupationsByTitle.set(normalizedTitle, []);
        }

        occupationsByTitle.get(normalizedTitle)!.push(occupation);
      }
    }

    return occupationsByTitle;
  }

  /**
   * Rank occupations by coordination score
   *
   * Coordination score considers:
   * - Number of providers that found this occupation (consensus)
   * - Individual match scores from each provider
   * - Provider confidence levels
   * - Provider priority weights
   */
  private rankByCoordinationScore(
    occupationsByTitle: Map<string, StandardOccupation[]>,
    providerResults: Map<string, OccupationMappingResult>
  ): StandardOccupation[] {
    const scored: Array<{ occupation: StandardOccupation; coordinationScore: number }> = [];

    for (const [title, occupations] of occupationsByTitle) {
      // Calculate coordination score
      const numProviders = occupations.length;
      const totalProviders = providerResults.size;
      const consensusBonus = numProviders / totalProviders; // 0.0 to 1.0

      // Average match scores and confidence across providers
      const avgMatchScore = occupations.reduce((sum, occ) => sum + occ.matchScore, 0) / numProviders;
      const avgConfidence = occupations.reduce((sum, occ) => sum + occ.confidence, 0) / numProviders;

      // Weighted coordination score
      const coordinationScore =
        (avgMatchScore * 0.4) +        // 40% match score
        (avgConfidence * 0.3) +         // 30% provider confidence
        (consensusBonus * 0.3);         // 30% multi-provider consensus

      // Merge occupation data (prefer higher confidence provider)
      const bestOccupation = occupations.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      // Combine skills, DWAs, tools, and technologies from all providers
      const allSkills = new Map<string, any>();
      const allDWAs = new Map<string, any>();
      const allTools = new Set<string>();
      const allTechnologies = new Set<string>();

      for (const occ of occupations) {
        occ.skills.forEach(s => allSkills.set(s.name.toLowerCase(), s));
        occ.dwas.forEach(d => allDWAs.set(d.name.toLowerCase(), d));
        occ.tools.forEach(t => allTools.add(t));
        occ.technologies.forEach(tech => allTechnologies.add(tech));
      }

      const mergedOccupation: StandardOccupation = {
        ...bestOccupation,
        matchScore: coordinationScore,
        skills: Array.from(allSkills.values()),
        dwas: Array.from(allDWAs.values()),
        tools: Array.from(allTools),
        technologies: Array.from(allTechnologies),
        provider: `coordinated(${occupations.map(o => o.provider).join('+')})`,
        confidence: coordinationScore
      };

      scored.push({ occupation: mergedOccupation, coordinationScore });
    }

    // Sort by coordination score (descending)
    scored.sort((a, b) => b.coordinationScore - a.coordinationScore);

    return scored.map(s => s.occupation).slice(0, 10); // Top 10
  }

  /**
   * Normalize occupation titles for matching
   */
  private normalizeOccupationTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Identify skills that weren't mapped by any provider
   */
  private identifyUnmappedSkills(
    inputSkills: ExtractedSkill[],
    occupations: StandardOccupation[]
  ): string[] {
    const mappedSkills = new Set<string>();

    for (const occ of occupations) {
      for (const skill of occ.skills) {
        mappedSkills.add(skill.name.toLowerCase());
      }
    }

    const unmapped: string[] = [];
    for (const skill of inputSkills) {
      if (!mappedSkills.has(skill.skill.toLowerCase())) {
        unmapped.push(skill.skill);
      }
    }

    return unmapped;
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): OccupationProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Add provider dynamically
   */
  addProvider(provider: OccupationProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Enable/disable provider
   */
  setProviderEnabled(name: string, enabled: boolean): void {
    if (this.config.providers[name as keyof typeof this.config.providers]) {
      this.config.providers[name as keyof typeof this.config.providers]!.enabled = enabled;
    }
  }
}

/**
 * Format coordinated results for display
 */
export function formatCoordinatedResultsForDisplay(
  result: CoordinatedMappingResult
): string {
  const lines = [
    `\n🎯 Multi-Provider Coordination Results`,
    `   Strategy: ${result.coordinationStrategy}`,
    `   Providers Used: ${result.providersUsed.join(', ')}`,
    `   Total Occupations: ${result.totalMapped}`,
    `   Unmapped Skills: ${result.unmappedSkills.length}`,
    `   Processing Time: ${result.processingTimeMs}ms`,
    '\n   Provider Performance:'
  ];

  // Show individual provider stats
  for (const [provider, providerResult] of result.providerResults) {
    lines.push(`   • ${provider}: ${providerResult.totalMapped} occupations, ${providerResult.apiCalls} API calls, ${providerResult.processingTimeMs}ms`);
  }

  lines.push('\n   Top Coordinated Occupations:');

  result.occupations.slice(0, 5).forEach((occ, i) => {
    lines.push(`\n   ${i + 1}. ${occ.title}`);
    lines.push(`      Provider(s): ${occ.provider}`);
    lines.push(`      Coordination Score: ${(occ.matchScore * 100).toFixed(0)}%`);
    lines.push(`      Skills: ${occ.skills.length}, DWAs: ${occ.dwas.length}, Tools: ${occ.tools.length}`);
    if (occ.skills.length > 0) {
      const topSkills = occ.skills.slice(0, 5).map(s => s.name).join(', ');
      lines.push(`      Top Skills: ${topSkills}${occ.skills.length > 5 ? '...' : ''}`);
    }
  });

  if (result.unmappedSkills.length > 0) {
    lines.push(`\n   ⚠️  Unmapped Skills: ${result.unmappedSkills.slice(0, 5).join(', ')}${result.unmappedSkills.length > 5 ? '...' : ''}`);
  }

  return lines.join('\n');
}

/**
 * Create default coordinator with all providers
 */
export async function createDefaultCoordinator(options?: {
  enableOnet?: boolean;
  enableEsco?: boolean;
  enableSkillsML?: boolean;
}): Promise<OccupationCoordinator> {
  const providers: OccupationProvider[] = [];

  // Import providers lazily
  const { ESCOProvider } = await import('./esco-provider.ts');
  const { SkillsMLProvider } = await import('./skills-ml-provider.ts');
  const { OnetProvider } = await import('./onet-service.ts');

  // Always add Skills-ML (local, always works)
  if (options?.enableSkillsML !== false) {
    providers.push(new SkillsMLProvider());
  }

  // Add ESCO (free, no auth)
  if (options?.enableEsco !== false) {
    providers.push(new ESCOProvider());
  }

  // Add O*NET only if credentials available
  if (options?.enableOnet === true) {
    const onetProvider = new OnetProvider();
    if (onetProvider.isConfigured()) {
      providers.push(onetProvider);
    }
  }

  return new OccupationCoordinator(providers, {
    coordinationStrategy: 'weighted',
    minProviders: 1,
    providers: {
      skillsml: { enabled: options?.enableSkillsML !== false, priority: 3 },
      esco: { enabled: options?.enableEsco !== false, priority: 2 },
      onet: { enabled: options?.enableOnet === true, priority: 1 }
    }
  });
}
