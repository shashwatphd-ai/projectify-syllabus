import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, GraduationCap, Clock, Briefcase } from "lucide-react";
import { DemandSignal } from "@/hooks/useDemandSignals";

interface DemandSignalCardProps {
  signal: DemandSignal;
  onExpressInterest: (signalId: string) => void;
}

export const DemandSignalCard = ({ signal, onExpressInterest }: DemandSignalCardProps) => {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl line-clamp-2">{signal.project_category}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {signal.course_count} Course{signal.course_count !== 1 ? 's' : ''}
          </Badge>
        </div>
        {signal.industry_sector && (
          <Badge variant="outline" className="w-fit">
            <Briefcase className="w-3 h-3 mr-1" />
            {signal.industry_sector}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="text-sm">{signal.geographic_region}</span>
        </div>

        {/* Student Demand */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 shrink-0 text-primary" />
          <div className="text-sm">
            <span className="font-semibold text-foreground">{signal.student_count}</span>
            <span className="text-muted-foreground"> students seeking projects</span>
          </div>
        </div>

        {/* Institutions */}
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 shrink-0 text-primary" />
          <div className="text-sm">
            <span className="font-semibold text-foreground">{signal.institution_count}</span>
            <span className="text-muted-foreground"> institution{signal.institution_count !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Duration */}
        {signal.typical_duration_weeks > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-primary" />
            <span className="text-sm text-muted-foreground">
              Typical duration: {signal.typical_duration_weeks} weeks
            </span>
          </div>
        )}

        {/* Skills */}
        {signal.required_skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Required Skills:</p>
            <div className="flex flex-wrap gap-1">
              {signal.required_skills.slice(0, 6).map((skill, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {signal.required_skills.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{signal.required_skills.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Student Levels */}
        {Object.keys(signal.student_level_distribution).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Student Levels:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(signal.student_level_distribution).map(([level, count]) => (
                <Badge key={level} variant="secondary" className="text-xs">
                  {level}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => onExpressInterest(signal.id)}
        >
          Express Interest
        </Button>
      </CardFooter>
    </Card>
  );
};
