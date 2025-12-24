// CompactSignalIndicator - Shows composite score with mini breakdown for cards
// Single Responsibility: Compact signal display for list views

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Briefcase, TrendingUp, Building2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactSignalIndicatorProps {
  compositeScore?: number | null;
  skillMatch?: number | null;
  marketIntel?: number | null;
  departmentFit?: number | null;
  contactQuality?: number | null;
  size?: 'sm' | 'md';
}

export function CompactSignalIndicator({
  compositeScore,
  skillMatch,
  marketIntel,
  departmentFit,
  contactQuality,
  size = 'sm'
}: CompactSignalIndicatorProps) {
  // Only show if we have signal data
  const hasSignals = compositeScore !== null && compositeScore !== undefined && compositeScore > 0;
  
  if (!hasSignals) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-400';
  };

  const getBadgeVariant = (score: number): 'default' | 'secondary' | 'outline' => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'outline';
  };

  const signals = [
    { icon: Briefcase, value: skillMatch, label: 'Skill Match', color: 'text-blue-500' },
    { icon: TrendingUp, value: marketIntel, label: 'Market Intel', color: 'text-green-500' },
    { icon: Building2, value: departmentFit, label: 'Dept Fit', color: 'text-purple-500' },
    { icon: UserCheck, value: contactQuality, label: 'Contact', color: 'text-orange-500' },
  ];

  const sizeClasses = size === 'sm' 
    ? { icon: 'h-3 w-3', text: 'text-xs', badge: 'text-xs px-1.5 py-0' }
    : { icon: 'h-4 w-4', text: 'text-sm', badge: 'text-sm px-2 py-0.5' };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={getBadgeVariant(compositeScore!)} 
          className={cn("flex items-center gap-1 cursor-help", sizeClasses.badge)}
        >
          <Zap className={sizeClasses.icon} />
          <span className="font-semibold">{compositeScore!.toFixed(0)}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="w-48">
        <div className="space-y-2">
          <p className="font-medium text-xs">Discovery Quality Score</p>
          <div className="space-y-1">
            {signals.map((signal) => (
              signal.value !== null && signal.value !== undefined && (
                <div key={signal.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <signal.icon className={cn("h-3 w-3", signal.color)} />
                    {signal.label}
                  </span>
                  <span className={getScoreColor(signal.value)}>{signal.value.toFixed(0)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
