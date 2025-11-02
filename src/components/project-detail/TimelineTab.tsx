import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

interface TimelineTabProps {
  forms: any;
}

export const TimelineTab = ({ forms }: TimelineTabProps) => {
  const form4 = forms.form4 || {};
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>
          <CardDescription>Duration and key dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Start Date</h3>
              <p className="text-2xl font-bold">{form4.start || 'TBD'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">End Date</h3>
              <p className="text-2xl font-bold">{form4.end || 'TBD'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Duration</h3>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-primary">{form4.weeks || 12} weeks</p>
              </div>
            </div>
          </div>

          {forms.milestones && forms.milestones.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Project Milestones</h3>
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {forms.milestones.map((milestone: any, i: number) => (
                    <div key={i} className="relative flex items-start gap-6">
                      <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {milestone.week || `W${i + 1}`}
                        </span>
                      </div>
                      <div className="flex-1 pt-3">
                        <h4 className="font-semibold mb-1">{milestone.name || `Milestone ${i + 1}`}</h4>
                        <p className="text-sm text-muted-foreground">{milestone.task || milestone.description || ''}</p>
                        {milestone.duration && (
                          <Badge variant="outline" className="mt-2">{milestone.duration}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};