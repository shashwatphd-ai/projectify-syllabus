import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { projectRatingSchema } from "@/lib/validation-schemas";

interface ProjectFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  currentRating?: number | null;
  currentFeedback?: string | null;
  currentTags?: string[] | null;
  onSuccess?: () => void;
}

const RATING_TAGS = [
  { value: 'great_alignment', label: 'Great LO Alignment', color: 'bg-green-100 text-green-800' },
  { value: 'realistic_scope', label: 'Realistic Scope', color: 'bg-blue-100 text-blue-800' },
  { value: 'good_company_fit', label: 'Good Company Fit', color: 'bg-purple-100 text-purple-800' },
  { value: 'too_generic', label: 'Too Generic', color: 'bg-amber-100 text-amber-800' },
  { value: 'wrong_scope', label: 'Wrong Scope', color: 'bg-red-100 text-red-800' },
  { value: 'poor_alignment', label: 'Poor LO Alignment', color: 'bg-red-100 text-red-800' },
  { value: 'needs_refinement', label: 'Needs Refinement', color: 'bg-orange-100 text-orange-800' },
];

export function ProjectFeedbackDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  currentRating,
  currentFeedback,
  currentTags,
  onSuccess
}: ProjectFeedbackDialogProps) {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState(currentFeedback || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags || []);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate input using zod schema
    const validation = projectRatingSchema.safeParse({
      rating,
      feedback: feedback.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Invalid input");
      return;
    }

    setSubmitting(true);

    try {
      const validData = validation.data;
      
      const { error } = await supabase
        .from('projects')
        .update({
          faculty_rating: validData.rating,
          faculty_feedback: validData.feedback || null,
          rating_tags: validData.tags || null,
          rated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      toast.success("Thank you for your feedback!");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setRating(0);
      setFeedback("");
      setSelectedTags([]);
    } catch (error: unknown) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tagValue: string) => {
    setSelectedTags(prev => 
      prev.includes(tagValue)
        ? prev.filter(t => t !== tagValue)
        : [...prev, tagValue]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate This Project</DialogTitle>
          <DialogDescription>
            Help improve project quality by rating: <span className="font-semibold">{projectTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Overall Quality</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Poor - Major issues"}
                {rating === 2 && "Below Average - Needs work"}
                {rating === 3 && "Average - Acceptable"}
                {rating === 4 && "Good - Minor improvements"}
                {rating === 5 && "Excellent - Ready to use"}
              </p>
            )}
          </div>

          {/* Quick Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Tags (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {RATING_TAGS.map((tag) => (
                <Badge
                  key={tag.value}
                  variant={selectedTags.includes(tag.value) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    selectedTags.includes(tag.value) ? tag.color : ''
                  }`}
                  onClick={() => toggleTag(tag.value)}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Detailed Feedback (Optional)</label>
            <Textarea
              placeholder="What works well? What could be improved?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
