import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface EnrichmentPanelProps {
  companyProfile: any;
  contactInfo?: any;
  onEnrichmentComplete?: () => void;
}

export const EnrichmentPanel = ({ companyProfile, contactInfo, onEnrichmentComplete }: EnrichmentPanelProps) => {
  const [enriching, setEnriching] = useState(false);

  if (!companyProfile) return null;

  // Use nested enrichment_status from get-project-detail edge function
  const enrichmentStatus = companyProfile.enrichment_status || {};
  const enrichmentLevel = enrichmentStatus.level || 'basic';
  const completeness = enrichmentStatus.completeness_score || 0;
  const lastEnriched = enrichmentStatus.apollo_date 
    ? new Date(enrichmentStatus.apollo_date).toLocaleDateString()
    : 'Never';

  const getEnrichmentStatus = () => {
    switch (enrichmentLevel) {
      case 'fully_enriched':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
          label: 'Fully Verified',
          color: 'bg-green-50 border-green-200 text-green-700',
          description: 'All available data has been professionally verified'
        };
      case 'apollo_verified':
        return {
          icon: <Sparkles className="h-4 w-4 text-blue-600" />,
          label: 'Enhanced Data',
          color: 'bg-blue-50 border-blue-200 text-blue-700',
          description: 'Partially enriched with verified data'
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-gray-600" />,
          label: 'Basic Info',
          color: 'bg-gray-50 border-gray-200 text-gray-700',
          description: 'Only basic information available'
        };
    }
  };

  const status = getEnrichmentStatus();
  const needsEnrichment = completeness < 80;

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      toast.info('Enhancing company data...', { duration: 3000 });

      const { data, error } = await supabase.functions.invoke('enrich-apollo', {
        body: { companyProfileId: companyProfile.id }
      });

      if (error) throw error;

      toast.success(`Enrichment complete! Data quality: ${data.details[0]?.completeness}%`, {
        duration: 5000
      });

      // Trigger refresh
      if (onEnrichmentComplete) {
        onEnrichmentComplete();
      }
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast.error(error.message || 'Failed to enrich company data');
    } finally {
      setEnriching(false);
    }
  };

  return (
    <Card className={`border-2 ${status.color}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {status.icon}
              Data Enrichment Status
            </CardTitle>
            <CardDescription>{status.description}</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Data Quality</span>
            <span className="text-sm font-semibold">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Last Enriched</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastEnriched}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Contact Info</p>
            <p className="font-medium">
              {contactInfo?.email && contactInfo?.phone ? 'Complete' : 'Partial'}
            </p>
          </div>
        </div>

        {needsEnrichment && (
          <div className="pt-2">
            <Button 
              onClick={handleEnrich}
              disabled={enriching}
              className="w-full"
              variant="default"
            >
              {enriching ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Enhancing company data...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance Company Data
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Enhance with verified contact info, company details & insights
            </p>
          </div>
        )}

        {!needsEnrichment && (
          <div className="pt-2 text-center">
            <Button 
              onClick={handleEnrich}
              disabled={enriching}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
