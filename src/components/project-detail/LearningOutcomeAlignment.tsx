import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LearningOutcomeAlignmentProps {
  project: any;
  courseProfile: any;
}

export const LearningOutcomeAlignment = ({ project, courseProfile }: LearningOutcomeAlignmentProps) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetadata();
  }, [project.id]);

  const loadMetadata = async () => {
    const { data, error } = await supabase
      .from('project_metadata')
      .select('lo_alignment_detail')
      .eq('project_id', project.id)
      .single();

    if (!error && data) {
      setMetadata(data.lo_alignment_detail);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4">Loading alignment analysis...</div>;
  }

  if (!metadata) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning Outcome Alignment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Detailed alignment analysis is not available for this project.
          </p>
        </CardContent>
      </Card>
    );
  }

  const outcomes = courseProfile.outcomes as string[];

  return (
    <div className="space-y-6">
      {/* Course Learning Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle>Course Learning Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {outcomes.map((outcome: string, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">LO{index + 1}</Badge>
                <p className="flex-1">{outcome}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Activity Alignment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Activity Alignment</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Aligned Outcomes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metadata.task_mappings?.map((task: any, idx: number) => (
                <TableRow key={`task-${idx}`}>
                  <TableCell className="font-medium">{task.task_text}</TableCell>
                  <TableCell><Badge variant="outline">Task</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {task.outcome_ids.map((oid: string) => (
                        <Badge key={oid} variant="secondary">{oid}</Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {metadata.deliverable_mappings?.map((del: any, idx: number) => (
                <TableRow key={`del-${idx}`}>
                  <TableCell className="font-medium">{del.deliverable_text}</TableCell>
                  <TableCell><Badge variant="default">Deliverable</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {del.outcome_ids.map((oid: string) => (
                        <Badge key={oid} variant="secondary">{oid}</Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Alignment Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Alignment Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metadata.outcome_mappings?.map((om: any, idx: number) => (
              <div key={idx} className="border-l-4 border-primary pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{om.outcome_id}</Badge>
                  <span className="font-semibold">{om.outcome_text}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{om.explanation}</p>
                <div className="text-xs text-muted-foreground">
                  Addresses {om.aligned_tasks?.length || 0} tasks and {om.aligned_deliverables?.length || 0} deliverables
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alignment Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Alignment Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metadata.overall_coverage && Object.entries(metadata.overall_coverage).map(([lo, score]: [string, any]) => (
              <div key={lo}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{lo} Coverage</span>
                  <span className="text-sm text-muted-foreground">{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Overall Project Score</span>
                <span className="text-lg font-bold text-primary">{project.final_score.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {metadata.gaps && metadata.gaps.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">Coverage Gaps & Recommendations</h4>
              <ul className="list-disc pl-5 space-y-1">
                {metadata.gaps.map((gap: string, idx: number) => (
                  <li key={idx} className="text-sm">{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};