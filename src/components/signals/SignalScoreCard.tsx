// SignalScoreCard - Single Responsibility: Display one signal score
// Open/Closed: Extensible via props, closed for modification

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SignalScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  icon: LucideIcon;
  description?: string;
  colorClass?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SignalScoreCard({
  title,
  score,
  maxScore = 100,
  icon: Icon,
  description,
  colorClass = "text-primary",
  size = 'md'
}: SignalScoreCardProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  
  const getScoreColor = (pct: number) => {
    if (pct >= 70) return "bg-green-500";
    if (pct >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const sizeClasses = {
    sm: { card: "p-3", title: "text-xs", score: "text-lg", icon: "h-4 w-4" },
    md: { card: "p-4", title: "text-sm", score: "text-2xl", icon: "h-5 w-5" },
    lg: { card: "p-6", title: "text-base", score: "text-3xl", icon: "h-6 w-6" }
  };

  const sizes = sizeClasses[size];

  return (
    <Card className="overflow-hidden">
      <CardContent className={sizes.card}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn(sizes.icon, colorClass)} />
            <span className={cn("font-medium text-muted-foreground", sizes.title)}>
              {title}
            </span>
          </div>
          <span className={cn("font-bold", sizes.score, colorClass)}>
            {score.toFixed(0)}
          </span>
        </div>
        
        <Progress 
          value={percentage} 
          className="h-2"
          indicatorClassName={getScoreColor(percentage)}
        />
        
        {description && (
          <p className="text-xs text-muted-foreground mt-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
