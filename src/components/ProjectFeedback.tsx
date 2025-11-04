import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface ProjectFeedbackProps {
  projectId: string;
  onSubmitted?: () => void;
}

// Input validation schema to prevent injection attacks and invalid data
const feedbackSchema = z.object({
  liked: z.boolean(),
  fit: z.number().int().min(1).max(5).nullable(),
  alignment: z.number().int().min(1).max(5).nullable(),
  feasibility: z.number().int().min(1).max(5).nullable(),
  comments: z.string().max(1000, "Comments must be less than 1000 characters").trim().nullable()
});

const ProjectFeedback = ({ projectId, onSubmitted }: ProjectFeedbackProps) => {
  const [liked, setLiked] = useState<boolean | null>(null);
  const [fit, setFit] = useState<string>("");
  const [alignment, setAlignment] = useState<string>("");
  const [feasibility, setFeasibility] = useState<string>("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (liked === null) {
      toast.error("Please indicate if you like this project");
      return;
    }

    // Validate input data before submission
    const validationResult = feedbackSchema.safeParse({
      liked,
      fit: fit ? parseInt(fit) : null,
      alignment: alignment ? parseInt(alignment) : null,
      feasibility: feasibility ? parseInt(feasibility) : null,
      comments: comments.trim() || null
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Invalid feedback data";
      toast.error(errorMessage);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const validData = validationResult.data;

      const { error } = await supabase
        .from('evaluations')
        .insert({
          project_id: projectId,
          evaluator_id: user.id,
          evaluator_role: userRole?.role || 'student',
          liked: validData.liked,
          fit: validData.fit,
          alignment: validData.alignment,
          feasibility: validData.feasibility,
          comments: validData.comments
        });

      if (error) throw error;

      toast.success("Feedback submitted successfully!");
      if (onSubmitted) onSubmitted();
      
      // Reset form
      setLiked(null);
      setFit("");
      setAlignment("");
      setFeasibility("");
      setComments("");
    } catch (error: any) {
      console.error('Submit feedback error:', error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Feedback</CardTitle>
        <CardDescription>
          Help us understand if this project fits your curriculum needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Like/Dislike */}
        <div>
          <Label className="mb-3 block">Overall Assessment</Label>
          <div className="flex gap-4">
            <Button
              variant={liked === true ? "default" : "outline"}
              onClick={() => setLiked(true)}
              className="flex-1"
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Good Fit
            </Button>
            <Button
              variant={liked === false ? "default" : "outline"}
              onClick={() => setLiked(false)}
              className="flex-1"
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Not a Fit
            </Button>
          </div>
        </div>

        {/* Detailed Ratings */}
        {liked !== null && (
          <>
            <div className="space-y-3">
              <Label>Course Fit (1-5)</Label>
              <RadioGroup value={fit} onValueChange={setFit}>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <div key={val} className="flex items-center space-x-2">
                      <RadioGroupItem value={val.toString()} id={`fit-${val}`} />
                      <Label htmlFor={`fit-${val}`} className="cursor-pointer">{val}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                How well does this align with your course objectives?
              </p>
            </div>

            <div className="space-y-3">
              <Label>Learning Outcome Alignment (1-5)</Label>
              <RadioGroup value={alignment} onValueChange={setAlignment}>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <div key={val} className="flex items-center space-x-2">
                      <RadioGroupItem value={val.toString()} id={`align-${val}`} />
                      <Label htmlFor={`align-${val}`} className="cursor-pointer">{val}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                How well do the project tasks cover your learning outcomes?
              </p>
            </div>

            <div className="space-y-3">
              <Label>Feasibility (1-5)</Label>
              <RadioGroup value={feasibility} onValueChange={setFeasibility}>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <div key={val} className="flex items-center space-x-2">
                      <RadioGroupItem value={val.toString()} id={`feas-${val}`} />
                      <Label htmlFor={`feas-${val}`} className="cursor-pointer">{val}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Can students realistically complete this within the timeframe?
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="comments">Additional Comments</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share any suggestions or concerns..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {comments.length}/1000 characters
              </p>
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                if (onSubmitted) onSubmitted();
              }}
              className="w-full"
            >
              Skip for Now
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectFeedback;
