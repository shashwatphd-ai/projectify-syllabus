/**
 * Signal 2: Market Intelligence via News Articles
 * 
 * Fetches recent news about companies to identify active/growing businesses
 * using Apollo News Articles API.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only calculates market intelligence score
 * - Open/Closed: Implements SignalProvider interface
 * 
 * @module market-intel-signal
 */

import { 
  SignalResult, 
  SignalProvider, 
  SignalContext, 
  SignalName,
  ApolloNewsArticle 
} from '../signal-types.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** News lookback period in days */
const NEWS_LOOKBACK_DAYS = 90;

/** Maximum organizations per API call */
const MAX_ORGS_PER_REQUEST = 25;

/** Maximum articles to fetch */
const MAX_ARTICLES = 50;

// ============================================================================
// INTERFACES (from plan)
// ============================================================================

interface NewsArticle {
  id: string;
  title: string;
  snippet: string;
  url: string;
  domain?: string;
  published_at: string;
  event_categories: string[];
  organization_ids: string[]; // Apollo returns array, not single ID
}

interface MarketSignalResult {
  score: number;           // 0-1 normalized
  articles: NewsArticle[];
  hasFundingNews: boolean;
  hasHiringNews: boolean;
  hasContractNews: boolean;
  hasExpansionNews: boolean;  // Added: expansion/launches signals
  hasLaunchNews: boolean;     // Added: product launches
  mostRecentDate: string | null;
}

// ============================================================================
// MARKET INTEL SIGNAL PROVIDER
// ============================================================================

/**
 * Market Intelligence Signal Provider
 * 
 * Uses Apollo News Articles API to find companies with recent
 * funding, hiring, or contract news - indicating active growth.
 */
export const MarketIntelSignal: SignalProvider = {
  name: 'market_intelligence' as SignalName,
  weight: 0.25, // 25% of composite score
  
  async calculate(context: SignalContext): Promise<SignalResult> {
    const { company, apolloApiKey } = context;
    
    console.log(`  📰 [Signal 2] Fetching market intelligence for ${company.name}`);
    
    // Default result for edge cases
    const defaultResult: SignalResult = {
      score: 10, // Baseline score (10/100) for no news
      confidence: 0.3,
      signals: ['No recent news found'],
      rawData: null
    };
    
    // Check if we have Apollo org ID
    if (!company.apollo_organization_id) {
      console.log(`     ⚠️ No Apollo org ID, skipping news lookup`);
      return {
        ...defaultResult,
        signals: ['No Apollo organization ID available'],
        error: 'Missing apollo_organization_id'
      };
    }
    
    // Check if API key is available
    if (!apolloApiKey) {
      console.log(`     ⚠️ No Apollo API key configured`);
      return {
        ...defaultResult,
        signals: ['Apollo API key not configured'],
        error: 'Missing apolloApiKey'
      };
    }
    
    try {
      const marketResult = await fetchMarketSignals(
        [company.apollo_organization_id],
        apolloApiKey
      );
      
      const result = marketResult.get(company.apollo_organization_id);
      
      if (!result || result.articles.length === 0) {
        return defaultResult;
      }
      
      // Convert 0-1 score to 0-100
      const score = Math.round(result.score * 100);
      
      // Generate human-readable signals
      const signals = generateSignalDescriptions(result);
      
      // Calculate confidence based on data availability
      const confidence = calculateConfidence(result);
      
      console.log(`     ✅ Score: ${score}/100, ${result.articles.length} articles found`);
      
      return {
        score,
        confidence,
        signals,
        rawData: {
          articles: result.articles.slice(0, 10), // Store top 10
          hasFundingNews: result.hasFundingNews,
          hasHiringNews: result.hasHiringNews,
          hasContractNews: result.hasContractNews,
          hasExpansionNews: result.hasExpansionNews,
          hasLaunchNews: result.hasLaunchNews,
          mostRecentDate: result.mostRecentDate,
          articleCount: result.articles.length
        }
      };
      
    } catch (error) {
      console.error(`     ❌ Market intel failed:`, error);
      return {
        ...defaultResult,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

// ============================================================================
// APOLLO NEWS API INTEGRATION (from plan)
// ============================================================================

/**
 * SIGNAL 2: Market Intelligence via News Articles
 * Fetches recent news about companies to identify active/growing businesses
 */
async function fetchMarketSignals(
  organizationIds: string[],
  apolloApiKey: string
): Promise<Map<string, MarketSignalResult>> {
  const results = new Map<string, MarketSignalResult>();
  
  // Initialize empty results for all orgs
  for (const orgId of organizationIds) {
    results.set(orgId, {
      score: 0,
      articles: [],
      hasFundingNews: false,
      hasHiringNews: false,
      hasContractNews: false,
      hasExpansionNews: false,
      hasLaunchNews: false,
      mostRecentDate: null
    });
  }
  
  if (organizationIds.length === 0) return results;
  
  // Calculate date range (last 90 days)
  const today = new Date();
  const ninetyDaysAgo = new Date(today.getTime() - (NEWS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
  
  try {
    // Batch request (Apollo allows multiple org IDs)
    // Include more event categories for better signal detection
    const response = await fetch('https://api.apollo.io/v1/news_articles/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloApiKey
      },
      body: JSON.stringify({
        organization_ids: organizationIds.slice(0, MAX_ORGS_PER_REQUEST),
        categories: ['hires', 'investment', 'contract', 'expansion', 'launches', 'attends_event'],
        published_at: {
          min: ninetyDaysAgo.toISOString().split('T')[0],
          max: today.toISOString().split('T')[0]
        },
        per_page: MAX_ARTICLES
      })
    });
    
    if (!response.ok) {
      console.warn(`     ⚠️ News API returned ${response.status}, using empty results`);
      return results;
    }
    
    const data = await response.json();
    const articles = (data.news_articles || []) as NewsArticle[];
    
    console.log(`     📰 News API: Found ${articles.length} articles for ${organizationIds.length} companies`);
    
    // Group articles by organization (Apollo returns organization_ids array)
    for (const article of articles) {
      // Handle both organization_id (legacy) and organization_ids (current API)
      const orgIds = article.organization_ids || [];
      
      for (const orgId of orgIds) {
        const orgResult = results.get(orgId);
        if (!orgResult) continue;
        
        orgResult.articles.push(article);
        
        // Track categories - investment = funding signal
        if (article.event_categories.includes('investment')) {
          orgResult.hasFundingNews = true;
        }
        // Hiring = growth signal
        if (article.event_categories.includes('hires')) {
          orgResult.hasHiringNews = true;
        }
        // Contracts = revenue signal
        if (article.event_categories.includes('contract')) {
          orgResult.hasContractNews = true;
        }
        // Expansion = geographic/market growth
        if (article.event_categories.includes('expansion')) {
          orgResult.hasExpansionNews = true;
        }
        // Product launches = innovation signal
        if (article.event_categories.includes('launches')) {
          orgResult.hasLaunchNews = true;
        }
        
        // Track recency
        if (!orgResult.mostRecentDate || article.published_at > orgResult.mostRecentDate) {
          orgResult.mostRecentDate = article.published_at;
        }
      }
    }
    
    // Calculate scores
    for (const [orgId, result] of results) {
      result.score = calculateMarketSignalScore(result);
    }
    
    return results;
    
  } catch (error) {
    console.error('     ❌ News API error:', error);
    return results; // Return empty results on error
  }
}

/**
 * Calculate market signal score (0-1)
 * Weights: Funding > Hiring > Expansion > Contract > Launch > Recency
 */
function calculateMarketSignalScore(result: MarketSignalResult): number {
  if (result.articles.length === 0) return 0.1; // Baseline for no news
  
  let score = 0;
  
  // Category scores (max 0.65) - weighted by importance
  if (result.hasFundingNews) score += 0.20;    // Funding = strongest growth signal
  if (result.hasHiringNews) score += 0.15;     // Hiring = active growth
  if (result.hasExpansionNews) score += 0.12;  // Expansion = market growth
  if (result.hasContractNews) score += 0.10;   // Contracts = revenue
  if (result.hasLaunchNews) score += 0.08;     // Launches = innovation
  
  // Volume score (max 0.15)
  const volumeScore = Math.min(0.15, result.articles.length * 0.03);
  score += volumeScore;
  
  // Recency score (max 0.20) - more recent = higher score
  if (result.mostRecentDate) {
    const daysSinceNews = Math.floor(
      (Date.now() - new Date(result.mostRecentDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 0.20 - (daysSinceNews / 90) * 0.20);
    score += recencyScore;
  }
  
  return Math.min(1, score);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate confidence based on data availability
 */
function calculateConfidence(result: MarketSignalResult): number {
  // More articles = higher confidence
  const articleScore = Math.min(1, result.articles.length / 5);
  
  // Multiple categories = higher confidence (now 5 categories)
  let categoryCount = 0;
  if (result.hasFundingNews) categoryCount++;
  if (result.hasHiringNews) categoryCount++;
  if (result.hasContractNews) categoryCount++;
  if (result.hasExpansionNews) categoryCount++;
  if (result.hasLaunchNews) categoryCount++;
  const categoryScore = categoryCount / 5;
  
  // Recent news = higher confidence
  let recencyScore = 0.5;
  if (result.mostRecentDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(result.mostRecentDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    recencyScore = daysSince < 30 ? 1 : daysSince < 60 ? 0.7 : 0.5;
  }
  
  return Math.round((articleScore * 0.4 + categoryScore * 0.3 + recencyScore * 0.3) * 100) / 100;
}

/**
 * Generate human-readable signal descriptions
 */
function generateSignalDescriptions(result: MarketSignalResult): string[] {
  const signals: string[] = [];
  
  if (result.hasFundingNews) {
    signals.push('Recent funding or investment news detected');
  }
  
  if (result.hasHiringNews) {
    signals.push('Active hiring announcements found');
  }
  
  if (result.hasContractNews) {
    signals.push('Recent contract or partnership news');
  }
  
  if (result.hasExpansionNews) {
    signals.push('Market or geographic expansion signals');
  }
  
  if (result.hasLaunchNews) {
    signals.push('Recent product or service launches');
  }
  
  if (result.mostRecentDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(result.mostRecentDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 30) {
      signals.push(`Very recent news activity (${daysSince} days ago)`);
    } else if (daysSince < 60) {
      signals.push(`Recent news activity (${daysSince} days ago)`);
    }
  }
  
  if (result.articles.length > 5) {
    signals.push(`High news volume (${result.articles.length} articles)`);
  }
  
  if (signals.length === 0) {
    signals.push('Limited market activity signals');
  }
  
  return signals;
}

export default MarketIntelSignal;
