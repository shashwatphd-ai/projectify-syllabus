import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Handshake, Mail, Linkedin, UserCheck, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface ProposePartnershipDialogProps {
  projectId: string;
  companyName: string;
  companyProfileId?: string;
  projectTitle: string;
}

// Use extended schema with additional pitch types specific to this dialog
const proposalSchema = z.object({
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
  pitchType: z.enum(['email', 'linkedin', 'anonymous'], {
    errorMap: () => ({ message: 'Please select how you want to reach out' })
  })
});

export const ProposePartnershipDialog = ({ 
  projectId, 
  companyName, 
  companyProfileId,
  projectTitle 
}: ProposePartnershipDialogProps) => {
  const [open, setOpen] = useState(false);
  const [pitchType, setPitchType] = useState<'email' | 'linkedin' | 'anonymous'>('email');
  const [message, setMessage] = useState(`Hello ${companyName} team,

I'm reaching out regarding a potential educational partnership opportunity. We have students interested in working on real-world projects, and your company aligns well with our curriculum goals.

Project: ${projectTitle}

This would provide valuable industry experience for our students while delivering tangible results for your organization. Would you be open to discussing this opportunity?

Best regards`);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationResult = proposalSchema.safeParse({ message, pitchType });
    
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0]?.message || "Invalid proposal data");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('partnership_proposals')
        .insert({
          project_id: projectId,
          company_profile_id: companyProfileId || null,
          proposer_id: user.id,
          proposer_email: profile?.email || user.email || '',
          message: validationResult.data.message,
          pitch_type: validationResult.data.pitchType,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Partnership proposal saved! You can now share it with the company.");
      
      // Generate shareable content based on type
      if (pitchType === 'email') {
        const emailBody = encodeURIComponent(validationResult.data.message);
        const subject = encodeURIComponent(`Partnership Opportunity: ${projectTitle}`);
        window.open(`mailto:?subject=${subject}&body=${emailBody}`, '_blank');
      } else if (pitchType === 'linkedin') {
        const linkedinText = encodeURIComponent(`Exploring a partnership opportunity with ${companyName} for an educational project. Interested in connecting industry expertise with academic learning.`);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${linkedinText}`, '_blank');
      }

      setOpen(false);
      setMessage('');
    } catch (error: unknown) {
      console.error('Submit proposal error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save proposal";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Handshake className="h-4 w-4" />
          Propose Partnership
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Propose Partnership with {companyName}
          </DialogTitle>
          <DialogDescription>
            Reach out to this company about a collaborative project opportunity. Choose how you'd like to connect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>How would you like to reach out?</Label>
            <RadioGroup value={pitchType} onValueChange={(value) => setPitchType(value as any)}>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="email" id="email" className="mt-1" />
                <Label htmlFor="email" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <Mail className="h-4 w-4" />
                    Email Template
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We'll open your email client with a pre-filled message
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="linkedin" id="linkedin" className="mt-1" />
                <Label htmlFor="linkedin" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Share
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share on LinkedIn to reach company representatives
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="anonymous" id="anonymous" className="mt-1" />
                <Label htmlFor="anonymous" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <UserCheck className="h-4 w-4" />
                    Save for Later
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Save your interest without immediately reaching out
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Customize your pitch..."
              rows={10}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 characters
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">💡 Tip</p>
            <p className="text-sm text-muted-foreground">
              Keep your message concise and highlight mutual benefits. Companies appreciate specific, actionable proposals that show you've researched their needs.
            </p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || message.trim().length < 10}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Saving..." : "Save & Share Proposal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};