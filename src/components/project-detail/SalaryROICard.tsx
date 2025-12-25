import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Calculator, 
  Sparkles,
  ArrowUpRight,
  Award,
  Briefcase,
  Users,
  Building2,
  Mail,
  CheckCircle,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SkillPremium {
  skill: string;
  premiumPercent: number;
  demandScore: number;
  marketValue: string;
}

interface OccupationData {
  occupation: string;
  medianSalary: number;
  percentile25: number;
  percentile75: number;
  percentile90: number;
  growthRate: number;
  totalJobs: number;
}

interface SignalInsights {
  partnershipReadiness: number;
  hiringLikelihood: string;
  fundingStability: string;
  decisionMakerAccess: string;
  overallRecommendation: string;
}

interface ROIData {
  currentSalaryEstimate: number;
  projectedSalaryWithSkills: number;
  salaryBoostPercent: number;
  annualValueGain: number;
  fiveYearValueGain: number;
  careerAcceleration: string;
  skillPremiums: SkillPremium[];
  occupationData: OccupationData;
  signalInsights?: SignalInsights;
  confidence: number;
  calculatedAt: string;
}

interface SalaryROICardProps {
  projectId: string;
  existingData?: ROIData | null;
  onCalculate?: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

const MarketValueBadge = ({ value }: { value: string }) => {
  const variants: Record<string, string> = {
    'High': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Standard': 'bg-muted text-muted-foreground'
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${variants[value] || variants['Standard']}`}>
      {value}
    </span>
  );
};

const RecommendationIcon = ({ recommendation }: { recommendation: string }) => {
  if (recommendation.startsWith('✅')) {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  } else if (recommendation.startsWith('👍')) {
    return <CheckCircle className="h-5 w-5 text-blue-600" />;
  } else if (recommendation.startsWith('⚠️')) {
    return <AlertCircle className="h-5 w-5 text-amber-600" />;
  }
  return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
};

export const SalaryROICard = ({ projectId, existingData, onCalculate }: SalaryROICardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [roiData, setRoiData] = useState<ROIData | null>(existingData || null);

  const calculateROI = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('salary-roi-calculator', {
        body: { projectId }
      });

      if (error) throw error;
      
      if (data?.success && data?.data) {
        setRoiData(data.data);
        toast.success('Salary ROI calculated successfully');
        onCalculate?.();
      } else {
        throw new Error(data?.error || 'Failed to calculate ROI');
      }
    } catch (error) {
      console.error('ROI calculation error:', error);
      toast.error('Failed to calculate salary ROI');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary animate-pulse" />
            Calculating Salary ROI...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!roiData) {
    return (
      <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Salary ROI Calculator</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Calculate potential salary gains and partnership value
              </p>
            </div>
            <Button onClick={calculateROI} className="mt-4">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Career ROI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const signalInsights = roiData.signalInsights;

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-background overflow-hidden">
      <CardHeader className="pb-3 border-b border-green-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Salary ROI Analysis
          </CardTitle>
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
            {Math.round(roiData.confidence * 100)}% Confidence
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-5">
        {/* Signal-Based Recommendation for Faculty */}
        {signalInsights && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-start gap-3">
              <RecommendationIcon recommendation={signalInsights.overallRecommendation} />
              <div className="flex-1">
                <p className="text-sm font-medium">Faculty Recommendation</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {signalInsights.overallRecommendation.replace(/^[✅👍⚠️❓]\s*/, '')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{signalInsights.partnershipReadiness}</p>
                <p className="text-xs text-muted-foreground">Partnership Score</p>
              </div>
            </div>
            
            {/* Signal Breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground truncate" title={signalInsights.hiringLikelihood}>
                  {signalInsights.hiringLikelihood.split(' - ')[0]}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground truncate" title={signalInsights.fundingStability}>
                  {signalInsights.fundingStability.split(' - ')[0]}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground truncate" title={signalInsights.decisionMakerAccess}>
                  {signalInsights.decisionMakerAccess.split(' - ')[0]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Value Proposition */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Entry-Level Estimate</p>
            <p className="text-2xl font-bold">{formatCurrency(roiData.currentSalaryEstimate)}</p>
            <p className="text-xs text-muted-foreground mt-1">25th percentile</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
            <p className="text-xs text-green-700 dark:text-green-400 mb-1">With Project Skills</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(roiData.projectedSalaryWithSkills)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">+{roiData.salaryBoostPercent}%</span>
            </div>
          </div>
        </div>

        {/* Value Gain Metrics */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Projected Career Value</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Annual Value Gain</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                +{formatCurrency(roiData.annualValueGain)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">5-Year Total Value</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                +{formatCurrency(roiData.fiveYearValueGain)}
              </p>
            </div>
          </div>
        </div>

        {/* Career Acceleration */}
        <div className="flex items-start gap-3 bg-background/50 rounded-lg p-3 border border-border/50">
          <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Career Acceleration</p>
            <p className="text-xs text-muted-foreground">{roiData.careerAcceleration}</p>
          </div>
        </div>

        {/* Skill Premiums */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Skill Value Breakdown</span>
          </div>
          <div className="space-y-2">
            {roiData.skillPremiums.map((skill, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 border border-border/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{skill.skill}</span>
                  <MarketValueBadge value={skill.marketValue} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16">
                    <Progress value={skill.demandScore} className="h-1.5" />
                  </div>
                  <span className="text-xs font-medium text-green-600 w-10 text-right">
                    +{skill.premiumPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Occupation Info */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">{roiData.occupationData.occupation}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Median Salary</p>
              <p className="font-medium">{formatCurrency(roiData.occupationData.medianSalary)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Growth Rate</p>
              <p className="font-medium text-green-600">+{roiData.occupationData.growthRate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Jobs</p>
              <p className="font-medium">{(roiData.occupationData.totalJobs / 1000).toFixed(0)}K+</p>
            </div>
          </div>
        </div>

        {/* Recalculate Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={calculateROI}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Recalculate
        </Button>
      </CardContent>
    </Card>
  );
};
