import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

interface TimelineTabProps {
  project: any;
  forms: any;
}

export const TimelineTab = ({ project, forms }: TimelineTabProps) => {
  const milestones = forms.milestones || [];
  const form4 = forms.form4 || {};
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>
          <CardDescription>Schedule and key milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{form4.start || 'TBD (set by instructor)'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="font-medium">{form4.end || 'TBD (set by instructor)'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{project.duration_weeks} weeks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
          <CardDescription>Key deliverables and checkpoints throughout the project</CardDescription>
        </CardHeader>
        <CardContent>
          {milestones.length > 0 ? (
            <div className="space-y-4">
              {milestones.map((milestone: any, index: number) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Week {milestone.week}</Badge>
                      <span className="font-semibold">{milestone.deliverable}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No milestones defined for this project.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};