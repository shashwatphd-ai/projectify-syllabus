/**
 * Signal 4: Contact Quality Signal
 * 
 * Evaluates decision-maker availability using Apollo People Search API.
 * Focuses on finding relevant contacts who can champion academic partnerships.
 * 
 * API Used: POST /api/v1/mixed_people/search
 * 
 * Scoring Criteria:
 * - Has senior decision-makers (VP+, Director, C-level): +40 points
 * - Has department-relevant contacts: +30 points  
 * - Has verified email addresses: +20 points
 * - Multiple contact options: +10 points
 * 
 * @module contact-quality-signal
 */

import { 
  SignalResult, 
  SignalProvider, 
  SignalContext, 
  SignalName,
  SIGNAL_WEIGHTS,
  ApolloPerson 
} from '../signal-types.ts';

// =============================================================================
// CONFIGURATION
// =============================================================================

const APOLLO_PEOPLE_SEARCH_URL = 'https://api.apollo.io/api/v1/mixed_people/search';

/** Seniority levels that indicate decision-making authority */
const DECISION_MAKER_SENIORITIES = ['c_suite', 'vp', 'director', 'owner', 'founder', 'partner'];

/** Department keywords that align with academic partnerships */
const RELEVANT_DEPARTMENTS = [
  'engineering', 'technology', 'product', 'research', 'development',
  'data', 'analytics', 'innovation', 'hr', 'human resources', 'talent',
  'operations', 'strategy', 'marketing', 'design'
];

/** Job titles that often champion academic partnerships */
const CHAMPION_TITLES = [
  'chief', 'vp', 'vice president', 'director', 'head of',
  'manager', 'lead', 'principal', 'senior'
];

// =============================================================================
// CONTACT QUALITY SIGNAL PROVIDER
// =============================================================================

/**
 * Contact Quality Signal Provider
 * 
 * Implements SignalProvider interface for decision-maker availability scoring.
 * Uses Apollo People Search API to find and analyze company contacts.
 */
export class ContactQualitySignal implements SignalProvider {
  readonly name: SignalName = 'contact_quality';
  readonly weight: number = SIGNAL_WEIGHTS.contact_quality;

  /**
   * Calculate contact quality score for a company
   */
  async calculate(context: SignalContext): Promise<SignalResult> {
    const { company, syllabusDomain, apolloApiKey } = context;
    
    // Check for API key
    if (!apolloApiKey) {
      console.warn('[ContactQuality] No Apollo API key provided');
      return {
        score: 0,
        confidence: 0,
        signals: ['No Apollo API key available'],
        error: 'Apollo API key not configured'
      };
    }

    // Check for organization ID
    if (!company.apollo_organization_id) {
      console.warn(`[ContactQuality] No Apollo org ID for company: ${company.name}`);
      return this.fallbackToBasicScore(company);
    }

    try {
      // Fetch contacts from Apollo
      const contacts = await this.fetchCompanyContacts(
        company.apollo_organization_id,
        syllabusDomain,
        apolloApiKey
      );

      if (!contacts || contacts.length === 0) {
        console.log(`[ContactQuality] No contacts found for: ${company.name}`);
        return {
          score: 20,
          confidence: 0.3,
          signals: ['No contacts found in Apollo database'],
          rawData: { contactCount: 0 }
        };
      }

      // Analyze contacts
      const analysis = this.analyzeContacts(contacts, syllabusDomain);
      
      // Calculate final score
      const score = this.calculateScore(analysis);
      const confidence = this.calculateConfidence(analysis);
      
      console.log(`[ContactQuality] ${company.name}: score=${score}, confidence=${confidence}, contacts=${contacts.length}`);

      return {
        score,
        confidence,
        signals: this.generateSignalDescriptions(analysis),
        rawData: {
          contactCount: contacts.length,
          analysis
        }
      };

    } catch (error) {
      console.error(`[ContactQuality] Error for ${company.name}:`, error);
      return {
        score: 0,
        confidence: 0,
        signals: ['Error fetching contact data'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===========================================================================
  // APOLLO API INTEGRATION
  // ===========================================================================

  /**
   * Fetch contacts from Apollo People Search API
   */
  private async fetchCompanyContacts(
    organizationId: string,
    domain: string,
    apiKey: string
  ): Promise<ApolloPerson[]> {
    // Map domain to relevant departments
    const targetDepartments = this.mapDomainToDepartments(domain);
    
    const requestBody = {
      organization_ids: [organizationId],
      person_seniorities: DECISION_MAKER_SENIORITIES,
      person_departments: targetDepartments.length > 0 ? targetDepartments : undefined,
      page: 1,
      per_page: 25 // Get up to 25 contacts
    };

    console.log(`[ContactQuality] Searching contacts for org: ${organizationId}`);
    
    const response = await fetch(APOLLO_PEOPLE_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ContactQuality] Apollo API error: ${response.status} - ${errorText}`);
      throw new Error(`Apollo API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract people array from response
    const people = data.people || data.contacts || [];
    
    return people.map((person: Record<string, unknown>) => ({
      id: person.id as string,
      first_name: person.first_name as string | undefined,
      last_name: person.last_name as string | undefined,
      title: person.title as string | undefined,
      seniority: person.seniority as string | undefined,
      departments: person.departments as string[] | undefined,
      email: person.email as string | undefined,
      linkedin_url: person.linkedin_url as string | undefined
    }));
  }

  /**
   * Map syllabus domain to relevant Apollo department filters
   */
  private mapDomainToDepartments(domain: string): string[] {
    const domainLower = domain.toLowerCase();
    
    const domainMapping: Record<string, string[]> = {
      'engineering': ['engineering', 'information_technology', 'operations'],
      'computer science': ['engineering', 'information_technology', 'data'],
      'data science': ['data', 'engineering', 'information_technology'],
      'business': ['operations', 'finance', 'marketing', 'sales'],
      'marketing': ['marketing', 'sales', 'media_and_communication'],
      'finance': ['finance', 'operations', 'consulting'],
      'design': ['design', 'product_management', 'marketing'],
      'healthcare': ['medical_health', 'operations', 'research'],
      'research': ['research', 'engineering', 'education']
    };

    // Find matching domain
    for (const [key, departments] of Object.entries(domainMapping)) {
      if (domainLower.includes(key)) {
        return departments;
      }
    }

    // Default departments for academic partnerships
    return ['human_resources', 'operations', 'engineering'];
  }

  // ===========================================================================
  // CONTACT ANALYSIS
  // ===========================================================================

  /**
   * Analyze contacts to extract quality metrics
   */
  private analyzeContacts(contacts: ApolloPerson[], _domain: string): ContactAnalysis {
    const analysis: ContactAnalysis = {
      totalContacts: contacts.length,
      decisionMakers: 0,
      departmentRelevant: 0,
      verifiedEmails: 0,
      hasChampionTitle: 0,
      seniorityBreakdown: {},
      topContacts: []
    };

    for (const contact of contacts) {
      // Count decision makers
      if (contact.seniority && DECISION_MAKER_SENIORITIES.includes(contact.seniority.toLowerCase())) {
        analysis.decisionMakers++;
      }

      // Track seniority breakdown
      if (contact.seniority) {
        const seniority = contact.seniority.toLowerCase();
        analysis.seniorityBreakdown[seniority] = (analysis.seniorityBreakdown[seniority] || 0) + 1;
      }

      // Check department relevance
      if (contact.departments) {
        const depts = contact.departments.map(d => d.toLowerCase());
        if (depts.some(d => RELEVANT_DEPARTMENTS.some(rd => d.includes(rd)))) {
          analysis.departmentRelevant++;
        }
      }

      // Check for verified email
      if (contact.email && contact.email.includes('@')) {
        analysis.verifiedEmails++;
      }

      // Check for champion titles
      if (contact.title) {
        const titleLower = contact.title.toLowerCase();
        if (CHAMPION_TITLES.some(ct => titleLower.includes(ct))) {
          analysis.hasChampionTitle++;
        }
      }
    }

    // Extract top contacts for display
    analysis.topContacts = contacts
      .filter(c => c.seniority && DECISION_MAKER_SENIORITIES.includes(c.seniority.toLowerCase()))
      .slice(0, 3)
      .map(c => ({
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        title: c.title || 'Unknown',
        hasEmail: Boolean(c.email)
      }));

    return analysis;
  }

  // ===========================================================================
  // SCORING CALCULATIONS
  // ===========================================================================

  /**
   * Calculate contact quality score (0-100)
   */
  private calculateScore(analysis: ContactAnalysis): number {
    let score = 0;

    // Base: Has any contacts (+10)
    if (analysis.totalContacts > 0) {
      score += 10;
    }

    // Decision makers: Up to 40 points
    // 1 decision maker = 15, 2 = 25, 3+ = 40
    if (analysis.decisionMakers >= 3) {
      score += 40;
    } else if (analysis.decisionMakers === 2) {
      score += 25;
    } else if (analysis.decisionMakers === 1) {
      score += 15;
    }

    // Department relevance: Up to 25 points
    const relevanceRatio = analysis.departmentRelevant / Math.max(analysis.totalContacts, 1);
    score += Math.min(25, Math.round(relevanceRatio * 30));

    // Verified emails: Up to 15 points
    const emailRatio = analysis.verifiedEmails / Math.max(analysis.totalContacts, 1);
    score += Math.min(15, Math.round(emailRatio * 20));

    // Champion titles: Up to 10 points
    if (analysis.hasChampionTitle >= 2) {
      score += 10;
    } else if (analysis.hasChampionTitle === 1) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate confidence based on data availability
   */
  private calculateConfidence(analysis: ContactAnalysis): number {
    let confidence = 0.3; // Base confidence

    // More contacts = higher confidence
    if (analysis.totalContacts >= 10) {
      confidence += 0.3;
    } else if (analysis.totalContacts >= 5) {
      confidence += 0.2;
    } else if (analysis.totalContacts >= 2) {
      confidence += 0.1;
    }

    // Has decision makers = higher confidence
    if (analysis.decisionMakers >= 2) {
      confidence += 0.2;
    } else if (analysis.decisionMakers >= 1) {
      confidence += 0.1;
    }

    // Has verified emails = higher confidence
    if (analysis.verifiedEmails >= 3) {
      confidence += 0.2;
    } else if (analysis.verifiedEmails >= 1) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  // ===========================================================================
  // SIGNAL DESCRIPTIONS
  // ===========================================================================

  /**
   * Generate human-readable signal descriptions
   */
  private generateSignalDescriptions(analysis: ContactAnalysis): string[] {
    const signals: string[] = [];

    // Contact availability
    if (analysis.totalContacts >= 10) {
      signals.push(`Strong contact database (${analysis.totalContacts} contacts found)`);
    } else if (analysis.totalContacts >= 5) {
      signals.push(`Good contact availability (${analysis.totalContacts} contacts)`);
    } else if (analysis.totalContacts > 0) {
      signals.push(`Limited contacts available (${analysis.totalContacts})`);
    }

    // Decision makers
    if (analysis.decisionMakers >= 3) {
      signals.push(`Multiple decision-makers identified (${analysis.decisionMakers})`);
    } else if (analysis.decisionMakers >= 1) {
      signals.push(`Decision-maker available (${analysis.decisionMakers})`);
    }

    // Seniority breakdown
    const seniorityKeys = Object.keys(analysis.seniorityBreakdown);
    if (seniorityKeys.length > 0) {
      const topSeniorities = seniorityKeys
        .sort((a, b) => analysis.seniorityBreakdown[b] - analysis.seniorityBreakdown[a])
        .slice(0, 2)
        .map(s => s.replace('_', ' '));
      signals.push(`Key roles: ${topSeniorities.join(', ')}`);
    }

    // Email availability
    if (analysis.verifiedEmails >= 3) {
      signals.push(`Direct contact possible (${analysis.verifiedEmails} verified emails)`);
    } else if (analysis.verifiedEmails >= 1) {
      signals.push('Email contact available');
    }

    // Top contacts preview
    if (analysis.topContacts.length > 0) {
      const preview = analysis.topContacts[0];
      signals.push(`Top contact: ${preview.title}`);
    }

    return signals;
  }

  // ===========================================================================
  // FALLBACK SCORING
  // ===========================================================================

  /**
   * Fallback scoring when Apollo org ID is not available
   * Uses company size as a proxy
   */
  private fallbackToBasicScore(company: { name: string; size?: string | null }): SignalResult {
    let score = 30; // Base score
    const signals: string[] = ['Contact data estimated from company profile'];

    // Larger companies typically have more accessible contacts
    const size = company.size?.toLowerCase() || '';
    
    if (size.includes('1001') || size.includes('5001') || size.includes('10001')) {
      score = 50;
      signals.push('Large company - likely has dedicated partnership contacts');
    } else if (size.includes('201') || size.includes('501')) {
      score = 45;
      signals.push('Mid-size company - good partnership potential');
    } else if (size.includes('51') || size.includes('101')) {
      score = 40;
      signals.push('Growing company - accessible leadership');
    } else if (size.includes('11') || size.includes('1-10')) {
      score = 35;
      signals.push('Small company - direct founder access possible');
    }

    return {
      score,
      confidence: 0.2, // Low confidence for fallback
      signals
    };
  }
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

interface ContactAnalysis {
  totalContacts: number;
  decisionMakers: number;
  departmentRelevant: number;
  verifiedEmails: number;
  hasChampionTitle: number;
  seniorityBreakdown: Record<string, number>;
  topContacts: Array<{
    name: string;
    title: string;
    hasEmail: boolean;
  }>;
}
