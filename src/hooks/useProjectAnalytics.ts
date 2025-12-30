import { useEffect } from 'react';

interface CompanyProfileForAnalytics {
  name: string;
  enrichment_status?: {
    level?: string;
    completeness_score?: number;
  };
}

interface ProjectAnalyticsData {
  projectId: string;
  projectTitle: string;
  companyName: string;
  enrichmentLevel: string;
  completenessScore: number;
  timestamp: string;
}

interface EnrichmentLevelCounts {
  [level: string]: number;
}

export const useProjectAnalytics = (
  projectId: string,
  projectTitle: string,
  companyProfile?: CompanyProfileForAnalytics | null
) => {
  useEffect(() => {
    if (!projectId || !companyProfile) return;

    // Track project view with enrichment data
    const analyticsData: ProjectAnalyticsData = {
      projectId,
      projectTitle,
      companyName: companyProfile.name,
      enrichmentLevel: companyProfile.enrichment_status?.level || 'basic',
      completenessScore: companyProfile.enrichment_status?.completeness_score || 0,
      timestamp: new Date().toISOString()
    };

    // Log to console for debugging
    console.log('📊 Project Analytics:', {
      project: analyticsData.projectTitle,
      company: analyticsData.companyName,
      dataQuality: `${analyticsData.enrichmentLevel} (${analyticsData.completenessScore}%)`,
      timestamp: analyticsData.timestamp
    });

    // Store in localStorage for session tracking
    const recentViews: ProjectAnalyticsData[] = JSON.parse(localStorage.getItem('recentProjectViews') || '[]');
    recentViews.unshift(analyticsData);
    
    // Keep only last 10 views
    if (recentViews.length > 10) {
      recentViews.pop();
    }
    
    localStorage.setItem('recentProjectViews', JSON.stringify(recentViews));

    // Calculate aggregate metrics
    const enrichmentLevels = recentViews.reduce((acc: EnrichmentLevelCounts, view: ProjectAnalyticsData) => {
      acc[view.enrichmentLevel] = (acc[view.enrichmentLevel] || 0) + 1;
      return acc;
    }, {});

    const avgCompleteness = recentViews.reduce(
      (sum: number, view: ProjectAnalyticsData) => sum + view.completenessScore, 
      0
    ) / recentViews.length;

    console.log('📈 Aggregate Metrics:', {
      totalViews: recentViews.length,
      enrichmentDistribution: enrichmentLevels,
      avgDataCompleteness: `${Math.round(avgCompleteness)}%`
    });
  }, [projectId, projectTitle, companyProfile]);

  return {
    // Could return analytics data or methods here if needed
    trackEvent: (eventName: string, data?: Record<string, unknown>) => {
      console.log(`🎯 Event: ${eventName}`, data);
    }
  };
};
