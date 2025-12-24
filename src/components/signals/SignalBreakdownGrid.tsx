// SignalBreakdownGrid - Displays all 4 signals in a responsive grid
// Liskov Substitution: Can be used anywhere a signal display is needed

import { 
  Briefcase, 
  TrendingUp, 
  Building2, 
  UserCheck,
  Zap
} from "lucide-react";
import { SignalScoreCard } from "./SignalScoreCard";
import { CompanySignals } from "./types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SignalBreakdownGridProps {
  signals: CompanySignals;
  showComposite?: boolean;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function SignalBreakdownGrid({
  signals,
  showComposite = true,
  title = "Discovery Quality Signals",
  description = "How well this company matches your course requirements",
  compact = false
}: SignalBreakdownGridProps) {
  const signalConfig = [
    {
      key: 'skillMatch',
      title: 'Skill Match',
      score: signals.skillMatch.value,
      icon: Briefcase,
      colorClass: 'text-blue-500',
      description: 'Job postings align with syllabus skills'
    },
    {
      key: 'marketIntel',
      title: 'Market Intel',
      score: signals.marketIntel.value,
      icon: TrendingUp,
      colorClass: 'text-green-500',
      description: 'Recent news, funding, and growth signals'
    },
    {
      key: 'departmentFit',
      title: 'Department Fit',
      score: signals.departmentFit.value,
      icon: Building2,
      colorClass: 'text-purple-500',
      description: 'Technical team size and structure'
    },
    {
      key: 'contactQuality',
      title: 'Contact Quality',
      score: signals.contactQuality.value,
      icon: UserCheck,
      colorClass: 'text-orange-500',
      description: 'Verified contact with relevant title'
    }
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {signalConfig.map((signal) => (
          <SignalScoreCard
            key={signal.key}
            title={signal.title}
            score={signal.score}
            icon={signal.icon}
            colorClass={signal.colorClass}
            size="sm"
          />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {signalConfig.map((signal) => (
            <SignalScoreCard
              key={signal.key}
              title={signal.title}
              score={signal.score}
              icon={signal.icon}
              colorClass={signal.colorClass}
              description={signal.description}
              size="md"
            />
          ))}
        </div>

        {showComposite && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Composite Discovery Score</p>
                <p className="text-sm text-muted-foreground">
                  Weighted combination of all signals
                </p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold text-primary">
                  {signals.composite.value.toFixed(0)}
                </span>
                <span className="text-muted-foreground">/100</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
