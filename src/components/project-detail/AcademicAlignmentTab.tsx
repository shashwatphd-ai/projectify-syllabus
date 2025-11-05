import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Target, Award, BookOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AcademicAlignmentTabProps {
  project: any;
  courseProfile: any;
  forms: any;
  metadata?: any;
}

export const AcademicAlignmentTab = ({ project, courseProfile, forms, metadata }: AcademicAlignmentTabProps) => {
  const [alignmentData, setAlignmentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const form6 = forms.form6 || {};

  useEffect(() => {
    // Load alignment data from metadata instead of separate table
    if (metadata?.lo_alignment_details) {
      setAlignmentData(metadata.lo_alignment_details);
    }
    setLoading(false);
  }, [metadata]);

  const learningOutcomes = courseProfile?.learning_outcomes || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading alignment analysis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Academic Requirements Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Academic Requirements
          </CardTitle>
          <CardDescription>Course integration and student expectations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Project Category</p>
              <Badge variant="secondary">{form6.category || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Student Year</p>
              <p className="font-medium">{form6.year || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Time Commitment</p>
              <p className="font-medium">{form6.hours_per_week || 'N/A'} hrs/week</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Difficulty Level</p>
              <Badge variant="outline">{form6.difficulty || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Preferred Majors</p>
              <p className="text-sm">{form6.preferred_majors || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Faculty Expertise</p>
              <p className="text-sm">{form6.faculty_expertise || 'N/A'}</p>
            </div>
          </div>

          {form6.preferred_universities && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Preferred Universities</p>
              <p className="text-sm">{form6.preferred_universities}</p>
            </div>
          )}

          {form6.publication_potential && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Publication Potential
              </p>
              <p className="text-sm">{form6.publication_potential}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Learning Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Course Learning Outcomes
          </CardTitle>
          <CardDescription>Expected learning objectives for {courseProfile?.course_name}</CardDescription>
        </CardHeader>
        <CardContent>
          {learningOutcomes.length > 0 ? (
            <div className="space-y-3">
              {learningOutcomes.map((outcome: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg">
                  <Badge variant="outline" className="mt-0.5">LO{index + 1}</Badge>
                  <p className="text-sm flex-1">{outcome.description || outcome}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No learning outcomes defined for this course</p>
          )}
        </CardContent>
      </Card>

      {/* Alignment Analysis */}
      {alignmentData ? (
        <>
          {/* Activity Alignment Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Project Activity Alignment
              </CardTitle>
              <CardDescription>How project tasks and deliverables map to learning outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mapped LOs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alignmentData.task_alignments?.map((task: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{task.task}</TableCell>
                      <TableCell><Badge variant="outline">Task</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {task.aligned_los.map((lo: number) => (
                            <Badge key={lo} variant="secondary" className="text-xs">LO{lo}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {alignmentData.deliverable_alignments?.map((deliverable: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{deliverable.deliverable}</TableCell>
                      <TableCell><Badge variant="secondary">Deliverable</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {deliverable.aligned_los.map((lo: number) => (
                            <Badge key={lo} variant="secondary" className="text-xs">LO{lo}</Badge>
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
          {alignmentData.detailed_alignment && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Alignment Explanation</CardTitle>
                <CardDescription>How each learning outcome is addressed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alignmentData.detailed_alignment.map((detail: any, idx: number) => (
                    <Collapsible key={idx}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">LO{detail.lo_number}</Badge>
                            <span className="font-medium text-sm text-left">{detail.outcome}</span>
                          </div>
                          <Badge variant="secondary">{detail.coverage}% coverage</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-3 border-l-2 border-primary/20 ml-3">
                        <p className="text-sm text-muted-foreground">{detail.explanation}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alignment Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Alignment Score Breakdown</CardTitle>
              <CardDescription>Coverage analysis per learning outcome</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alignmentData.coverage_scores?.map((score: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">LO{score.lo_number}</span>
                    <span className="text-sm text-muted-foreground">{score.coverage_percentage}%</span>
                  </div>
                  <Progress value={score.coverage_percentage} />
                </div>
              ))}
              
              <div className="pt-4 border-t mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Overall Project Score</span>
                  <span className="text-2xl font-bold text-primary">{Math.round(project.lo_score * 100)}%</span>
                </div>
                <Progress value={project.lo_score * 100} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Coverage Gaps */}
          {alignmentData.coverage_gaps && alignmentData.coverage_gaps.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Coverage Gaps & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alignmentData.coverage_gaps.map((gap: any, idx: number) => (
                    <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge variant="outline" className="mt-0.5">LO{gap.lo_number}</Badge>
                        <p className="text-sm font-medium">{gap.gap}</p>
                      </div>
                      {gap.recommendation && (
                        <p className="text-sm text-muted-foreground ml-14">{gap.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verification Checks (Academic focused) */}
          {metadata?.verification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Academic Verification
                </CardTitle>
                <CardDescription>Quality checks for pedagogical fit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${metadata.verification.lo_alignment_sufficient ? 'text-green-500' : 'text-amber-500'}`} />
                      <span className="font-medium">LO Alignment</span>
                    </div>
                    <Badge variant={metadata.verification.lo_alignment_sufficient ? "default" : "secondary"}>
                      {metadata.verification.lo_alignment_sufficient ? 'Sufficient' : 'Review Needed'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${metadata.verification.feasibility_appropriate ? 'text-green-500' : 'text-amber-500'}`} />
                      <span className="font-medium">Feasibility</span>
                    </div>
                    <Badge variant={metadata.verification.feasibility_appropriate ? "default" : "secondary"}>
                      {metadata.verification.feasibility_appropriate ? 'Appropriate' : 'Review Needed'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${metadata.verification.timeline_realistic ? 'text-green-500' : 'text-amber-500'}`} />
                      <span className="font-medium">Timeline</span>
                    </div>
                    <Badge variant={metadata.verification.timeline_realistic ? "default" : "secondary"}>
                      {metadata.verification.timeline_realistic ? 'Realistic' : 'Review Needed'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">Alignment analysis not available for this project</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};