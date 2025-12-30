import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { studentRatingSchema } from "@/lib/validation-schemas";

interface StudentRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentEmail: string | null;
  projectId: string;
  projectTitle: string;
  onRated?: () => void;
}

export function StudentRatingDialog({
  open,
  onOpenChange,
  studentId,
  studentEmail,
  projectId,
  projectTitle,
  onRated,
}: StudentRatingDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate rating using zod schema
    const validation = studentRatingSchema.safeParse({ rating });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const session = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('rate-student-performance', {
        body: {
          student_id: studentId,
          project_id: projectId,
          rating: validation.data.rating,
        },
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`Student rated ${validation.data.rating}/5 successfully`);
      onOpenChange(false);
      setRating(0);
      onRated?.();
    } catch (error: unknown) {
      console.error("Error rating student:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit rating";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Student Performance</DialogTitle>
          <DialogDescription>
            Rate {studentEmail || "this student"}'s performance on "{projectTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    star <= displayRating
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-center mt-4 text-sm text-muted-foreground">
            {displayRating === 0 && "Click to rate"}
            {displayRating === 1 && "Needs Improvement"}
            {displayRating === 2 && "Below Expectations"}
            {displayRating === 3 && "Meets Expectations"}
            {displayRating === 4 && "Exceeds Expectations"}
            {displayRating === 5 && "Outstanding"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Rating"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
