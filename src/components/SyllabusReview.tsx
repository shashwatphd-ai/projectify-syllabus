import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Clock, GraduationCap, Target, FileText, Calendar, Download } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCoursePdf } from "@/lib/downloadPdf";

interface SyllabusReviewProps {
  courseId: string;
  parsedData: {
    title: string;
    level: string;
    weeks: number;
    hrs_per_week: number;
    outcomes: string[];
    artifacts: string[];
    schedule: string[];
  };
  rawText?: string;
}

export function SyllabusReview({ courseId, parsedData, rawText }: SyllabusReviewProps) {
  const [level, setLevel] = useState(parsedData.level);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleLevelChange = async (newLevel: string) => {
    setLevel(newLevel);
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('course_profiles')
        .update({ level: newLevel })
        .eq('id', courseId);
      
      if (error) throw error;
      toast.success(`Course level updated to ${newLevel}`);
    } catch (error) {
      console.error('Error updating level:', error);
      toast.error('Failed to update course level');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadCoursePdf(courseId);
    } catch (error) {
      // Error is already toasted in downloadCoursePdf
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Parsed Syllabus Information
              </CardTitle>
              <CardDescription>
                Review and verify the extracted course information
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Course Basics */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                Course Title
              </div>
              <p className="font-semibold">{parsedData.title}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                Course Level
              </div>
              <Select value={level} onValueChange={handleLevelChange} disabled={isSaving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UG">Undergraduate</SelectItem>
                  <SelectItem value="MBA">MBA/Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Duration
              </div>
              <p className="font-semibold">{parsedData.weeks} weeks</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Time Commitment
              </div>
              <p className="font-semibold">{parsedData.hrs_per_week} hours/week</p>
            </div>
          </div>

          <Separator />

          {/* Learning Outcomes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <h3 className="font-semibold">Learning Outcomes</h3>
              <Badge variant="secondary">{parsedData.outcomes.length}</Badge>
            </div>
            <ul className="space-y-2 list-disc list-inside text-sm">
              {parsedData.outcomes.map((outcome, idx) => (
                <li key={idx} className="text-muted-foreground">{outcome}</li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Expected Artifacts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">Expected Deliverables</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedData.artifacts.map((artifact, idx) => (
                <Badge key={idx} variant="outline">{artifact}</Badge>
              ))}
            </div>
          </div>

          {parsedData.schedule && parsedData.schedule.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <h3 className="font-semibold">Course Schedule</h3>
                </div>
                <ScrollArea className="h-48 rounded-md border p-4">
                  <div className="space-y-2">
                    {parsedData.schedule.map((item, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">{item}</p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {rawText && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <h3 className="font-semibold">Raw Syllabus Text</h3>
                  <Badge variant="secondary">Preview</Badge>
                </div>
                <ScrollArea className="h-64 rounded-md border p-4">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {rawText}
                  </pre>
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
