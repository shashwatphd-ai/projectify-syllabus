/**
 * Live Demand Badge Component
 * 
 * Displays real-time labor market demand data powered by Lightcast.
 * Shows job postings count, top employers, salary ranges, and growth trends.
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Briefcase, Building2, DollarSign, Zap, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface LiveDemandData {
  totalJobPostings: number;
  topEmployers: { name: string; count: number }[];
  salaryRange: { min: number; max: number; median: number };
  growthTrend: number;
  topSkills: { skill: string; count: number }[];
  lastUpdated: string;
}

interface LiveDemandBadgeProps {
  skills: string[];
  location?: string;
  occupation?: string;
  variant?: 'badge' | 'card' | 'compact';
  className?: string;
}

export function LiveDemandBadge({
  skills,
  location,
  occupation,
  variant = 'badge',
  className,
}: LiveDemandBadgeProps) {
  const [demandData, setDemandData] = useState<LiveDemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDemandData() {
      if (skills.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-live-demand', {
          body: { skills, location, occupation },
        });

        if (error) throw error;
        setDemandData(data);
      } catch (err) {
        console.error('Failed to fetch live demand:', err);
        setError('Unable to fetch demand data');
      } finally {
        setLoading(false);
      }
    }

    fetchDemandData();
  }, [skills, location, occupation]);

  if (loading) {
    if (variant === 'badge' || variant === 'compact') {
      return <Skeleton className="h-6 w-24" />;
    }
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !demandData) {
    return null;
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatSalary = (num: number) => {
    return `$${Math.round(num / 1000)}k`;
  };

  const TrendIcon = demandData.growthTrend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = demandData.growthTrend >= 0 ? 'text-green-500' : 'text-red-500';

  // Compact badge for lists
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 cursor-help border-primary/20 bg-primary/5",
                className
              )}
            >
              <Zap className="h-3 w-3 text-primary" />
              <span className="font-semibold">{formatNumber(demandData.totalJobPostings)}</span>
              <span className="text-muted-foreground">jobs</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="w-64 p-0" side="bottom">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Live Job Postings</span>
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <div className="text-2xl font-bold text-primary">
                {demandData.totalJobPostings.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendIcon className={cn("h-4 w-4", trendColor)} />
                <span className={trendColor}>
                  {demandData.growthTrend > 0 ? '+' : ''}{demandData.growthTrend}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">Salary Range</div>
                <div className="text-sm font-medium">
                  {formatSalary(demandData.salaryRange.min)} - {formatSalary(demandData.salaryRange.max)}
                </div>
              </div>
              <div className="text-xs text-muted-foreground/70 pt-1">
                Powered by Lightcast
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Standard badge
  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 cursor-help px-3 py-1.5 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5",
                className
              )}
            >
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-bold text-primary">{formatNumber(demandData.totalJobPostings)}</span>
              <span className="text-muted-foreground">live jobs</span>
              <TrendIcon className={cn("h-3 w-3 ml-1", trendColor)} />
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="w-72 p-0" side="bottom">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Real-Time Job Market</div>
                  <div className="text-xs text-muted-foreground">Updated daily from 40,000+ sources</div>
                </div>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="text-xs text-muted-foreground">Total Openings</div>
                  <div className="text-xl font-bold text-primary">
                    {demandData.totalJobPostings.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Growth Trend</div>
                  <div className={cn("text-xl font-bold flex items-center gap-1", trendColor)}>
                    <TrendIcon className="h-5 w-5" />
                    {demandData.growthTrend > 0 ? '+' : ''}{demandData.growthTrend}%
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Top Employers Hiring</div>
                <div className="flex flex-wrap gap-1">
                  {demandData.topEmployers.slice(0, 3).map((employer) => (
                    <Badge key={employer.name} variant="secondary" className="text-xs">
                      {employer.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Salary Range</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{formatSalary(demandData.salaryRange.min)}</span>
                  <div className="flex-1 mx-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                      style={{ width: '60%' }}
                    />
                  </div>
                  <span className="text-sm font-medium">{formatSalary(demandData.salaryRange.max)}</span>
                </div>
                <div className="text-center text-xs text-muted-foreground mt-1">
                  Median: {formatSalary(demandData.salaryRange.median)}
                </div>
              </div>

              <div className="text-xs text-muted-foreground/70 pt-2 text-center border-t">
                Powered by Lightcast Labor Market Data
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full card variant
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Live Market Demand</CardTitle>
              <CardDescription>Real-time job market insights</CardDescription>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Briefcase className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold text-primary">
              {formatNumber(demandData.totalJobPostings)}
            </div>
            <div className="text-xs text-muted-foreground">Active Jobs</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <TrendIcon className={cn("h-5 w-5 mx-auto mb-1", trendColor)} />
            <div className={cn("text-2xl font-bold", trendColor)}>
              {demandData.growthTrend > 0 ? '+' : ''}{demandData.growthTrend}%
            </div>
            <div className="text-xs text-muted-foreground">Monthly Trend</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold text-green-600">
              {formatSalary(demandData.salaryRange.median)}
            </div>
            <div className="text-xs text-muted-foreground">Median Salary</div>
          </div>
        </div>

        {/* Top employers */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Top Employers Hiring</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {demandData.topEmployers.map((employer) => (
              <div 
                key={employer.name}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-sm"
              >
                <span className="font-medium">{employer.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {employer.count}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Salary range visualization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Salary Distribution</span>
            <span className="text-xs text-muted-foreground">
              {formatSalary(demandData.salaryRange.min)} - {formatSalary(demandData.salaryRange.max)}
            </span>
          </div>
          <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
            <div 
              className="absolute top-0 bottom-0 w-1 bg-primary"
              style={{ 
                left: `${((demandData.salaryRange.median - demandData.salaryRange.min) / 
                  (demandData.salaryRange.max - demandData.salaryRange.min)) * 100}%` 
              }}
            />
            <div 
              className="absolute top-full mt-1 text-xs text-primary font-medium"
              style={{ 
                left: `${((demandData.salaryRange.median - demandData.salaryRange.min) / 
                  (demandData.salaryRange.max - demandData.salaryRange.min)) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              Median: {formatSalary(demandData.salaryRange.median)}
            </div>
          </div>
        </div>

        {/* In-demand skills */}
        {demandData.topSkills.length > 0 && (
          <div className="pt-2">
            <div className="text-sm font-medium mb-2">Most In-Demand Skills</div>
            <div className="space-y-2">
              {demandData.topSkills.slice(0, 4).map((skill, idx) => (
                <div key={skill.skill} className="flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{skill.skill}</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ 
                        width: `${(skill.count / demandData.topSkills[0].count) * 100}%`,
                        opacity: 1 - (idx * 0.15)
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {formatNumber(skill.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by Lightcast</span>
          <span>Updated: {new Date(demandData.lastUpdated).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
