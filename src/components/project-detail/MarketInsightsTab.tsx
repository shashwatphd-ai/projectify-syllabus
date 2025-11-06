import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Target, Briefcase, Code2, AlertCircle } from "lucide-react";

interface MarketInsightsTabProps {
  companyProfile: any;
  projectMetadata: any;
  project: any;
  courseProfile?: any;
}

export const MarketInsightsTab = ({ companyProfile, projectMetadata, project, courseProfile }: MarketInsightsTabProps) => {
  const pricingBreakdown = projectMetadata?.pricing_breakdown || {};
  const estimatedROI = projectMetadata?.estimated_roi || {};
  const marketAlignment = projectMetadata?.market_alignment_score || 0;
  const marketSignals = projectMetadata?.market_signals_used || {};

  const hasLegacyPricing = !pricingBreakdown.base_calculation;

  return (
    <div className="space-y-6">
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
                    <div className="flex justify-between font-medium text-foreground pt-2 border-t">
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
                        {multiplier.level && (
                          <p className="text-xs text-muted-foreground">Level: {multiplier.level}</p>
                        )}
                        {multiplier.stage && (
                          <p className="text-xs text-muted-foreground">Stage: {multiplier.stage}</p>
                        )}
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
                  
                  {estimatedROI.knowledge_transfer_value > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Knowledge Transfer</span>
                      <span className="font-medium">${estimatedROI.knowledge_transfer_value.toLocaleString()}</span>
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
                <p className="text-xs mt-1">Legacy project pricing</p>
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
            {marketAlignment < 40 && marketAlignment > 0 && (
              <div className="rounded-lg bg-slate-500/10 border border-slate-500/20 p-3 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">General Alignment</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Project provides exploratory value
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

      {/* Additional Market Intelligence from Company Profile */}
      {companyProfile && (
        <>
          {/* Technology Stack */}
          {companyProfile.technologies_used && companyProfile.technologies_used.length > 0 && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Technology Stack
                </CardTitle>
                <CardDescription>
                  {companyProfile.technologies_used.length} technologies tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {companyProfile.technologies_used.map((tech: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Job Postings */}
          {companyProfile.job_postings && companyProfile.job_postings.length > 0 && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Active Hiring ({companyProfile.job_postings.length} Open Roles)
                </CardTitle>
                <CardDescription>
                  Current talent needs - potential project alignment opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companyProfile.job_postings.slice(0, 5).map((job: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{job.title}</p>
                          {(job.city || job.state) && (
                            <p className="text-xs text-muted-foreground">
                              {job.city}{job.city && job.state ? ', ' : ''}{job.state}
                              {job.posted_at && ` • Posted ${new Date(job.posted_at).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                        {job.url && (
                          <a 
                            href={job.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex-shrink-0"
                          >
                            View →
                          </a>
                        )}
                      </div>
                      {job.skills_needed && job.skills_needed.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.skills_needed.slice(0, 5).map((skill: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {companyProfile.job_postings.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {companyProfile.job_postings.length - 5} more positions
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Funding & Market Position */}
          {(companyProfile.funding_stage || companyProfile.total_funding_usd || companyProfile.recent_news) && (
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Position & Funding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {companyProfile.funding_stage && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Funding Stage</p>
                    <Badge variant="default">{companyProfile.funding_stage}</Badge>
                  </div>
                )}
                {companyProfile.total_funding_usd && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Funding</p>
                    <p className="font-bold text-lg">
                      ${(companyProfile.total_funding_usd / 1000000).toFixed(1)}M
                    </p>
                  </div>
                )}
                {companyProfile.organization_revenue_range && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      Revenue Range
                    </p>
                    <p className="text-sm font-medium">{companyProfile.organization_revenue_range}</p>
                  </div>
                )}
                {companyProfile.organization_founded_year && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      Founded
                    </p>
                    <p className="text-sm font-medium">{companyProfile.organization_founded_year}</p>
                  </div>
                )}
                {companyProfile.organization_industry_keywords && companyProfile.organization_industry_keywords.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      Industry Keywords
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {companyProfile.organization_industry_keywords.slice(0, 8).map((keyword: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Buying Intent Signals */}
          {companyProfile.buying_intent_signals && companyProfile.buying_intent_signals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Buying Intent Signals
                </CardTitle>
                <CardDescription>
                  Market signals indicating readiness for partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companyProfile.buying_intent_signals.map((signal: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant={signal.confidence === 'high' ? 'default' : 'secondary'}>
                        {signal.confidence}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize">{signal.signal_type?.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{signal.details}</p>
                        {signal.timing && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            Timing: {signal.timing}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
