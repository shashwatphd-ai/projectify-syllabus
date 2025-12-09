import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DemandSignal } from "@/hooks/useDemandSignals";
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Briefcase, Clock, GraduationCap, MapPin, Users } from "lucide-react";
import * as React from "react";
import { useState } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
}: TooltipProps) {
  console.log('tooltip');
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2",
            "data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}


interface DemandSignalCardProps {
  signal: DemandSignal;
  onExpressInterest: (signalId: string) => void;
}

export const DemandSignalCard = ({ signal, onExpressInterest }: DemandSignalCardProps) => {
  const [showCourseCountHint, setShowCourseCountHint] = useState(false);
  return (
    <Card className="flex flex-col h-full hover:shadow-elevated transition-all duration-300 border-border/50">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-start justify-between gap-2 relative">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-primary" />
            <CardTitle className="text-lg sm:text-md font-bold line-clamp-2 leading-tight">{signal.project_category.toUpperCase()}</CardTitle>
          </div>

          <Tooltip
            content="Number of Courses"
          >
            <Badge variant="secondary" onMouseOver={() => setShowCourseCountHint(true)} onMouseLeave={() => setShowCourseCountHint(false)} className="shrink-0 text-xs">
              {signal.course_count}
            </Badge>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 sm:space-y-4 pt-0">
        {/* Student Demand - Primary Highlight */}
        <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-accent/30 rounded-lg border border-accent/40">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-primary" />
          <div className="text-sm sm:text-base font-semibold text-foreground">
            {signal.student_count} students
          </div>
        </div>

        {/* Required Skills */}
        {signal.required_skills.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Skills</p>
            <div className="flex flex-wrap gap-1">
              {signal.required_skills.slice(0, 5).map((skill, idx) => (
                <Badge key={idx} variant="outline" className="text-xs py-0.5 px-2">
                  {skill}
                </Badge>
              ))}
              {signal.required_skills.length > 5 && (
                <Badge variant="outline" className="text-xs py-0.5 px-2">
                  +{signal.required_skills.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Ancillary Data - Compact */}
        <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{signal.geographic_region}</span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>{signal.institution_count} institution{signal.institution_count !== 1 ? 's' : ''}</span>
          </div>
          {signal.typical_duration_weeks > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{signal.typical_duration_weeks}w</span>
            </div>
          )}
        </div>

        {/* Student Levels - Compact */}
        {Object.keys(signal.student_level_distribution).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {Object.entries(signal.student_level_distribution).map(([level, count]) => (
              <Badge key={level} variant="secondary" className="text-xs py-0.5 px-2">
                {level}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 sm:pt-4">
        <Button
          variant="default"
          className="w-full h-9 sm:h-10 text-sm sm:text-base"
          onClick={() => onExpressInterest(signal.id)}
        >
          Express Interest
        </Button>
      </CardFooter>
    </Card>
  );
};
