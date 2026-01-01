import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wrench, Monitor, Shield, History, TrendingUp } from "lucide-react";
import type { ProjectDetailForms } from "@/types/project-detail";

interface LogisticsTabProps {
  forms: ProjectDetailForms;
}

export const LogisticsTab = ({ forms }: LogisticsTabProps) => {
  const form5 = forms.form5 || {};
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Logistics</CardTitle>
          <CardDescription>Implementation details and requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Project Type</h3>
                <Badge variant="secondary">{form5.type}</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Project Scope</h3>
                <Badge variant="secondary">{form5.scope}</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Requirements
                </h3>
                <p className="text-muted-foreground">{form5.location}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Intellectual Property Terms
                </h3>
                <Badge variant="outline">{form5.ip}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              {form5.equipment_provided && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Equipment Provided
                  </h3>
                  <p className="text-muted-foreground">{form5.equipment_provided}</p>
                </div>
              )}
              {form5.equipment_needed && (
                <div>
                  <h3 className="font-semibold mb-2">Equipment Needed</h3>
                  <p className="text-muted-foreground">{form5.equipment_needed}</p>
                </div>
              )}
              {form5.software && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Software Requirements
                  </h3>
                  <p className="text-muted-foreground">{form5.software}</p>
                </div>
              )}
            </div>
          </div>

          {form5.past_experience && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <History className="h-4 w-4" />
                Past Project Experience
              </h3>
              <p className="text-muted-foreground">{form5.past_experience}</p>
            </div>
          )}

          {form5.follow_up && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Follow-Up Opportunities
              </h3>
              <p className="text-muted-foreground">{form5.follow_up}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
