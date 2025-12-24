// EvidenceBasedSignalCard - Professional signal display with validation
// Shows methodology, evidence, data sources, and limitations transparently

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LucideIcon, Info, CheckCircle2, XCircle, AlertCircle, Database } from "lucide-react";

interface EvidenceItem {
  label: string;
  present: boolean;
  detail?: string;
  source?: string;
}

interface EvidenceBasedSignalCardProps {
  title: string;
  score: number;
  maxScore?: number;
  icon: LucideIcon;
  methodology: string;
  evidence: EvidenceItem[];
  limitations?: string[];
  colorClass?: string;
}

export function EvidenceBasedSignalCard({
  title,
  score,
  maxScore = 100,
  icon: Icon,
  methodology,
  evidence,
  limitations = [],
  colorClass = "text-primary"
}: EvidenceBasedSignalCardProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const evidenceCount = evidence.filter(e => e.present).length;
  const hasLimitations = limitations.length > 0;
  
  const getScoreLabel = (pct: number) => {
    if (pct >= 70) return { label: "Strong", variant: "default" as const, description: "High confidence in this signal" };
    if (pct >= 40) return { label: "Moderate", variant: "secondary" as const, description: "Partial data available" };
    if (pct > 0) return { label: "Limited", variant: "outline" as const, description: "Some data gaps exist" };
    return { label: "No Data", variant: "destructive" as const, description: "Signal not available for this company" };
  };

  const scoreInfo = getScoreLabel(percentage);

  return (
    <Card className="overflow-hidden h-full">
      <CardContent className="p-4 space-y-3">
        {/* Header with score */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg bg-muted", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">{title}</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                      <Info className="h-3 w-3" />
                      How it's calculated
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs">{methodology}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="text-right">
            <span className={cn("text-2xl font-bold tabular-nums", colorClass)}>
              {score.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground">/{maxScore}</span>
          </div>
        </div>

        {/* Score interpretation */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant={scoreInfo.variant} className="text-xs cursor-help">
                  {scoreInfo.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{scoreInfo.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-xs text-muted-foreground">
            {evidenceCount}/{evidence.length} data points verified
          </span>
        </div>

        {/* Evidence list with sources */}
        <div className="space-y-1.5 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Database className="h-3 w-3" />
            Data Evidence
          </p>
          {evidence.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs group">
              {item.present ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  item.present ? "text-foreground" : "text-muted-foreground/70"
                )}>
                  {item.label}
                </span>
                {item.detail && (
                  <span className={cn(
                    "ml-1",
                    item.present ? "text-muted-foreground" : "text-muted-foreground/50"
                  )}>
                    — {item.detail}
                  </span>
                )}
                {item.source && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 text-muted-foreground/60 cursor-help hidden group-hover:inline">
                          [{item.source}]
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">Data from: {item.source}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Limitations (if any) */}
        {hasLimitations && (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Limitation: </span>
                <span>{limitations[0]}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
