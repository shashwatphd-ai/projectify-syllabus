import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalyzeValueButtonProps {
  projectId: string;
  companyProfile: any;
  project: any;
  courseProfile: any;
  onAnalysisComplete: () => void;
}

export const AnalyzeValueButton = ({ 
  projectId, 
  companyProfile, 
  project, 
  courseProfile,
  onAnalysisComplete 
}: AnalyzeValueButtonProps) => {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!companyProfile) {
      toast.error("Company profile data not available");
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-project-value', {
        body: {
          projectId,
          companyProfile,
          projectData: project,
          courseProfile
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Value analysis completed! Refresh to see insights.");
        onAnalysisComplete();
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Value analysis error:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Button 
      onClick={handleAnalyze} 
      disabled={analyzing}
      className="gap-2"
    >
      {analyzing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing Value...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Analyze Partnership Value
        </>
      )}
    </Button>
  );
};
