import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Target, Briefcase, Code2, AlertCircle, Building2, Calendar, Users, Globe, Linkedin, Twitter, Facebook } from "lucide-react";

interface EnhancedMarketIntelligenceTabProps {
  companyProfile: any;
  projectMetadata: any;
  project: any;
  courseProfile?: any;
}

export const EnhancedMarketIntelligenceTab = ({ companyProfile, projectMetadata, project, courseProfile }: EnhancedMarketIntelligenceTabProps) => {
  const pricingBreakdown = projectMetadata?.pricing_breakdown || {};
  const estimatedROI = projectMetadata?.estimated_roi || {};
  const marketAlignment = projectMetadata?.market_alignment_score || 0;
  const marketSignals = projectMetadata?.market_signals_used || {};
  const hasLegacyPricing = !pricingBreakdown.base_calculation;

  return (
    <div className="space-y-6">
      {/* Company Profile Section */}
      {companyProfile && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Profile
            </CardTitle>
            <CardDescription>Partner organization overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Company Info */}
              <div className="space-y-3">
                {companyProfile.organization_logo_url && (
                  <div className="flex items-center gap-3 pb-2">
                    <img 
                      src={companyProfile.organization_logo_url} 
                      alt={`${companyProfile.name} logo`}
                      className="h-12 w-12 object-contain rounded"
                    />
                    <div>
                      <p className="font-semibold">{companyProfile.name}</p>
                      {companyProfile.organization_founded_year && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Founded {companyProfile.organization_founded_year}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sector:</span>
                  <Badge variant="outline">{companyProfile.sector}</Badge>
                </div>
                
                {companyProfile.organization_employee_count && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{companyProfile.organization_employee_count} employees</span>
                  </div>
                )}
                
                {companyProfile.organization_revenue_range && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{companyProfile.organization_revenue_range}</span>
                  </div>
                )}
                
                {companyProfile.website && (
                  <a 
                    href={companyProfile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Globe className="h-4 w-4" />
                    {companyProfile.website}
                  </a>
                )}
              </div>

              {/* Social Links & Location */}
              <div className="space-y-3">
                {(companyProfile.organization_linkedin_url || companyProfile.organization_twitter_url || companyProfile.organization_facebook_url) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Social Media</p>
                    <div className="flex gap-2">
                      {companyProfile.organization_linkedin_url && (
                        <a 
                          href={companyProfile.organization_linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {companyProfile.organization_twitter_url && (
                        <a 
                          href={companyProfile.organization_twitter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                      )}
                      {companyProfile.organization_facebook_url && (
                        <a 
                          href={companyProfile.organization_facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <Facebook className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {companyProfile.full_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="text-sm">{companyProfile.full_address}</p>
                    {companyProfile.city && companyProfile.zip && (
                      <p className="text-sm text-muted-foreground">{companyProfile.city} {companyProfile.zip}</p>
                    )}
                  </div>
                )}
                
                {companyProfile.recent_news && (
                  <div>
                    <p className="text-sm text-muted-foreground">Recent Activity</p>
                    <p className="text-sm">{companyProfile.recent_news}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasLegacyPricing && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">Legacy Pricing</p>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  This project was generated before market-intelligent pricing was implemented. Budget details are limited.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pricing Breakdown Card */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Breakdown
            </CardTitle>
            <CardDescription>How this project budget was calculated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pricingBreakdown.base_calculation ? (
              <>
                {/* Base Calculation */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Base Labor Cost</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>{pricingBreakdown.base_calculation.hours} hours</span>
                      <span>× ${pricingBreakdown.base_calculation.rate_per_hour}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Materials</span>
                      <span>${pricingBreakdown.base_calculation.materials}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Subtotal</span>
                      <span>${pricingBreakdown.base_calculation.subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Market Multipliers */}
                {pricingBreakdown.multipliers_applied?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Market Intelligence Adjustments</p>
                    {pricingBreakdown.multipliers_applied.map((multiplier: any, idx: number) => (
                      <div key={idx} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{multiplier.factor}</span>
                          <Badge variant={multiplier.multiplier > 1 ? "default" : "secondary"}>
                            {multiplier.multiplier > 1 ? '+' : ''}{((multiplier.multiplier - 1) * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{multiplier.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Final Budget */}
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Final Project Budget</p>
                  <p className="text-3xl font-bold text-primary">${project.pricing_usd.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Budget: ${project.pricing_usd.toLocaleString()}</p>
                <p className="text-xs mt-1">Detailed breakdown unavailable</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ROI Estimation Card */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ROI Estimation
            </CardTitle>
            <CardDescription>Total value delivered by this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {estimatedROI.estimated_budget ? (
              <>
                {/* ROI Overview */}
                <div className="rounded-lg bg-green-500/10 p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Estimated Total Value</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ${estimatedROI.total_estimated_value?.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="border-green-500">
                      {estimatedROI.roi_multiplier}× ROI
                    </Badge>
                  </div>
                </div>

                {/* Value Breakdown */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Value Components</p>
                  
                  {estimatedROI.deliverable_value > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Deliverable Market Value</span>
                      <span className="font-medium">${estimatedROI.deliverable_value.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {estimatedROI.talent_pipeline_value > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Talent Pipeline Savings</span>
                      <span className="font-medium">${estimatedROI.talent_pipeline_value.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {estimatedROI.strategic_value > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Strategic Consulting Value</span>
                      <span className="font-medium">${estimatedROI.strategic_value.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Budget vs Value */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Project Budget</span>
                    <span className="font-medium">${estimatedROI.estimated_budget?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-green-600 dark:text-green-400">
                    <span>Value Delivered</span>
                    <span>+${(estimatedROI.total_estimated_value - estimatedROI.estimated_budget)?.toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">ROI estimation unavailable</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Market Alignment Score */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Alignment Score
            </CardTitle>
            <CardDescription>How well this project addresses company needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - marketAlignment / 100)}`}
                    className="text-blue-500 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">{marketAlignment}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">out of 100</p>
            </div>

            {marketAlignment >= 70 && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Strong Alignment</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  This project is highly relevant to the company's current needs
                </p>
              </div>
            )}
            {marketAlignment >= 40 && marketAlignment < 70 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Moderate Alignment</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Project addresses some company needs
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hiring Urgency & Tech Match */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Market Signals
            </CardTitle>
            <CardDescription>Key indicators driving this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hiring Urgency */}
            {marketSignals.job_postings_matched !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Hiring Activity</span>
                  <Badge variant={
                    marketSignals.job_postings_matched >= 10 ? "destructive" :
                    marketSignals.job_postings_matched >= 5 ? "default" : "secondary"
                  }>
                    {marketSignals.hiring_urgency || 'Low'}
                  </Badge>
                </div>
                <Progress value={Math.min(100, (marketSignals.job_postings_matched / 15) * 100)} />
                <p className="text-xs text-muted-foreground">
                  {marketSignals.job_postings_matched} active job posting{marketSignals.job_postings_matched !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Funding Stage */}
            {marketSignals.funding_stage && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Funding Stage</span>
                  <Badge variant="outline">{marketSignals.funding_stage}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Growth-stage company with resources for partnerships
                </p>
              </div>
            )}

            {/* Technology Alignment */}
            {marketSignals.technologies_aligned?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Technology Match</span>
                  <Badge variant="secondary">
                    <Code2 className="h-3 w-3 mr-1" />
                    {marketSignals.technologies_aligned.length} matches
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {marketSignals.technologies_aligned.slice(0, 6).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Identified Needs */}
            {marketSignals.needs_identified > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Business Needs</span>
                  <Badge variant="secondary">{marketSignals.needs_identified} identified</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Project addresses verified company challenges
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};