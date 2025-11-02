import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Package, Lightbulb } from "lucide-react";

interface OverviewTabProps {
  project: any;
  forms: any;
}

export const OverviewTab = ({ project, forms }: OverviewTabProps) => {
  const form1 = forms.form1 || {};
  const form3 = forms.form3 || {};

  return (
    <div className="space-y-6">
      {form1.description && (
        <Card>
          <CardHeader>
            <CardTitle>Project Description</CardTitle>
            <CardDescription>Overview and context</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{form1.description}</p>
          </CardContent>
        </Card>
      )}

      {form3.learning_objectives && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
            <CardDescription>What students will learn from this project</CardDescription>
          </CardHeader>
          <CardContent>
            {typeof form3.learning_objectives === 'string' ? (
              <p className="text-muted-foreground">{form3.learning_objectives}</p>
            ) : (
              <ul className="space-y-2">
                {(form3.learning_objectives || []).map((objective: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-secondary mt-1">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project Tasks
          </CardTitle>
          <CardDescription>Core activities derived from learning outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(project.tasks as string[]).map((task, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-secondary mt-1">•</span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Deliverables
          </CardTitle>
          <CardDescription>Expected outputs from the project</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(project.deliverables as string[]).map((del, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-secondary mt-1">•</span>
                <span>{del}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {form3.skills && (
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
            <CardDescription>Technical and domain expertise needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {form3.skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
