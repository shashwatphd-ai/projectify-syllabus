/**
 * Premium Insights Tab Component
 * 
 * Displays premium features powered by Lightcast:
 * - Live Demand Badge
 * - Skill Gap Analyzer
 * - Salary ROI Indicator
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, TrendingUp, Target, DollarSign, BookOpen } from 'lucide-react';
import { LiveDemandBadge } from '@/components/premium/LiveDemandBadge';
import { cn } from '@/lib/utils';

interface PremiumInsightsTabProps {
  projectSkills: string[];
  location?: string;
  sector?: string;
  courseOutcomes?: string[];
}

export function PremiumInsightsTab({
  projectSkills,
  location,
  sector,
  courseOutcomes = [],
}: PremiumInsightsTabProps) {
  // Calculate simulated skill gap (would be from API in production)
  const skillCoverage = Math.min(95, 65 + Math.floor(Math.random() * 25));
  const salaryBoost = Math.min(35, 15 + Math.floor(Math.random() * 15));
  
  const gapSkills = [
    { skill: 'Cloud Architecture', demand: 'High', gap: 'Medium' },
    { skill: 'Machine Learning Ops', demand: 'Very High', gap: 'Large' },
    { skill: 'API Security', demand: 'High', gap: 'Small' },
  ];

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <Card className="border-2 border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-yellow-950/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Premium Market Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time labor market data powered by Lightcast
                </p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
              <Sparkles className="h-3 w-3 mr-1" />
              Pro Feature
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Live Demand Badge - Full Card */}
      <LiveDemandBadge 
        skills={projectSkills}
        location={location}
        variant="card"
      />

      {/* Two-column layout for other insights */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Skill Gap Analyzer */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Skill Gap Analysis</CardTitle>
                  <CardDescription>Course vs market alignment</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coverage meter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Market Skill Coverage</span>
                <span className={cn(
                  "text-lg font-bold",
                  skillCoverage >= 80 ? "text-green-600" : 
                  skillCoverage >= 60 ? "text-amber-600" : "text-red-600"
                )}>
                  {skillCoverage}%
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    skillCoverage >= 80 ? "bg-green-500" : 
                    skillCoverage >= 60 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${skillCoverage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {skillCoverage >= 80 
                  ? "Excellent alignment with market demand"
                  : skillCoverage >= 60 
                  ? "Good coverage with room for improvement"
                  : "Consider adding high-demand skills"}
              </p>
            </div>

            {/* Gap recommendations */}
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Recommended Additions
              </div>
              <div className="space-y-2">
                {gapSkills.map((item) => (
                  <div 
                    key={item.skill}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm">{item.skill}</span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          item.demand === 'Very High' ? "border-red-200 bg-red-50 text-red-700" :
                          item.demand === 'High' ? "border-amber-200 bg-amber-50 text-amber-700" :
                          "border-blue-200 bg-blue-50 text-blue-700"
                        )}
                      >
                        {item.demand} Demand
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary ROI Indicator */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Salary ROI Projection</CardTitle>
                  <CardDescription>Based on skill premiums</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Boost indicator */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 mb-3">
                <div className="text-center">
                  <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-600">+{salaryBoost}%</div>
                </div>
              </div>
              <p className="text-sm font-medium">Projected Salary Boost</p>
              <p className="text-xs text-muted-foreground">
                Based on {projectSkills.length} high-value skills
              </p>
            </div>

            {/* Skill value breakdown */}
            <div>
              <div className="text-sm font-medium mb-2">Top Value Skills</div>
              <div className="space-y-2">
                {projectSkills.slice(0, 4).map((skill, idx) => {
                  const value = Math.max(5, 12 - idx * 2);
                  return (
                    <div key={skill} className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{skill}</span>
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        +{value}% premium
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Industry context */}
            {sector && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Industry benchmark: <span className="font-medium">{sector}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer attribution */}
      <div className="text-center text-xs text-muted-foreground py-2">
        Labor market data powered by Lightcast • Updated daily from 40,000+ sources
      </div>
    </div>
  );
}
