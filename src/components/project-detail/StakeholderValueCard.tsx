import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StakeholderValueCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  borderColor: string;
  score: number;
  metrics: {
    label: string;
    value: number;
    icon: LucideIcon;
  }[];
  insight: string;
  evidence: string;
  benefits: string[];
}

const getScoreGrade = (score: number) => {
  if (score >= 85) return { label: "Exceptional", color: "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/30" };
  if (score >= 70) return { label: "Strong", color: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30" };
  if (score >= 55) return { label: "Good", color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" };
  return { label: "Moderate", color: "text-muted-foreground bg-muted/50 border-border" };
};

export const StakeholderValueCard = ({
  title,
  icon: Icon,
  color,
  bgGradient,
  borderColor,
  score,
  metrics,
  insight,
  evidence,
  benefits
}: StakeholderValueCardProps) => {
  const grade = getScoreGrade(score);

  return (
    <Card className={`${borderColor} ${bgGradient} border-l-4`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-')}/10`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <h3 className="font-semibold text-base">{title}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-3xl font-bold ${color}`}>{Math.round(score)}</span>
            <Badge variant="outline" className={`text-xs ${grade.color} border`}>
              {grade.label}
            </Badge>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-background/50 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <metric.icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={metric.value} className="h-1.5 flex-1" />
                <span className={`text-sm font-semibold ${color}`}>{metric.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Evidence Citation */}
        <div className="bg-muted/30 rounded-lg p-2.5 border border-border/30">
          <div className="flex items-start gap-2">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Evidence:</span> {evidence}
            </div>
          </div>
        </div>

        {/* Key Insight */}
        <div className={`rounded-lg p-3 border ${color.replace('text-', 'bg-')}/5 ${color.replace('text-', 'border-')}/20`}>
          <p className="text-sm leading-relaxed">{insight}</p>
        </div>

        {/* Benefits List */}
        {benefits && benefits.length > 0 && (
          <div className="space-y-1.5">
            {benefits.slice(0, 3).map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className={`${color} mt-0.5 flex-shrink-0`}>●</span>
                <span className="leading-relaxed">{benefit}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
