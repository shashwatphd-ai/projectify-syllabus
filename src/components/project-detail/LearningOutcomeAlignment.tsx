import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface LearningOutcomeAlignmentProps {
  project: any;
  courseProfile: any;
  loAlignmentDetail?: any;
}

export const LearningOutcomeAlignment = ({ project, courseProfile, loAlignmentDetail }: LearningOutcomeAlignmentProps) => {
  if (!loAlignmentDetail) {
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
              {loAlignmentDetail.task_mappings?.map((task: any, idx: number) => {
                const outcomeIds = [
                  task?.primary_outcome,
                  ...(task?.secondary_outcomes || [])
                ].filter(Boolean);
                
                return (
                  <TableRow key={`task-${idx}`}>
                    <TableCell className="font-medium">{task?.task_text}</TableCell>
                    <TableCell><Badge variant="outline">Task</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {outcomeIds.map((oid: string) => (
                          <Badge key={oid} variant="secondary">{oid}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {loAlignmentDetail.deliverable_mappings?.map((del: any, idx: number) => {
                const outcomeId = del?.primary_outcome;
                
                return (
                  <TableRow key={`del-${idx}`}>
                    <TableCell className="font-medium">{del?.deliverable_text}</TableCell>
                    <TableCell><Badge variant="default">Deliverable</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {outcomeId && (
                          <Badge variant="secondary">{outcomeId}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
            {loAlignmentDetail.outcome_mappings?.map((om: any, idx: number) => (
              <div key={idx} className="border-l-4 border-primary pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{om?.outcome_id}</Badge>
                  <span className="font-semibold">{om?.outcome_text}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{om?.explanation}</p>
                <div className="text-xs text-muted-foreground">
                  Addresses {om?.aligned_tasks?.length || 0} tasks and {om?.aligned_deliverables?.length || 0} deliverables
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
            {loAlignmentDetail?.overall_coverage && Object.entries(loAlignmentDetail.overall_coverage).map(([lo, score]: [string, any]) => (
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

          {loAlignmentDetail?.gaps && loAlignmentDetail.gaps.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">Coverage Gaps & Recommendations</h4>
              <ul className="list-disc pl-5 space-y-1">
                {loAlignmentDetail.gaps.map((gap: string, idx: number) => (
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