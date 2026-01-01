import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackDashboardEvent } from "@/lib/analytics";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { employerInterestSchema, type EmployerInterestFormData } from "@/lib/validation-schemas";

interface EmployerCTAModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandSignalId: string;
  signalCategory?: string;
}

export const EmployerCTAModal = ({
  open,
  onOpenChange,
  demandSignalId,
  signalCategory,
}: EmployerCTAModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<EmployerInterestFormData>({
    resolver: zodResolver(employerInterestSchema),
    defaultValues: {
      companyName: "",
      contactEmail: "",
      contactName: "",
      companyDomain: "",
      proposedProjectTitle: "",
      projectDescription: "",
      preferredTimeline: "",
      referralSource: "",
    },
  });

  const onSubmit = async (data: EmployerInterestFormData) => {
    setIsSubmitting(true);

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "submit-employer-interest",
        {
          body: {
            demandSignalId,
            ...data,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (result?.error) {
        // Handle business logic errors (validation, duplicates, etc.)
        toast({
          title: "Submission Failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Success
      toast({
        title: "Interest Submitted Successfully",
        description: result.message || "Our team will review and contact you within 48 hours.",
      });

      // Track successful submission
      await trackDashboardEvent('submission', {
        demandSignalId,
        resultedInSubmission: true,
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting interest:", error);
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Express Interest in Partnership</DialogTitle>
          <DialogDescription>
            {signalCategory && `Project Category: ${signalCategory.charAt(0).toUpperCase() + signalCategory.slice(1)}`}
            <br />
            Fill out the form below to connect with students for real-world projects.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Company Information</h3>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Website</FormLabel>
                    <FormControl>
                      <Input placeholder="acme.com" {...field} />
                    </FormControl>
                    <FormDescription>Optional - helps us learn more about your company</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Contact Information</h3>

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@acme.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Project Details</h3>

              <FormField
                control={form.control}
                name="proposedProjectTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer Analytics Dashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project, expected outcomes, and any specific requirements..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Minimum 10 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredTimeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Timeline</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Spring 2025, 8-10 weeks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referralSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How did you hear about us?</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., LinkedIn, colleague referral, search" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Interest
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
