import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Globe, MessageSquare, Building2, Linkedin, Twitter, MapPin, Briefcase, Package, MapPinned, FileText, Wrench, Laptop } from "lucide-react";
import { ProposePartnershipDialog } from "@/components/ProposePartnershipDialog";
import { EnrichmentPanel } from "./EnrichmentPanel";

interface PartnershipContactTabProps {
  forms: any;
  companyProfile?: any;
  projectId: string;
  projectTitle: string;
  onDataRefresh?: () => void;
}

export const PartnershipContactTab = ({ forms, companyProfile, projectId, projectTitle, onDataRefresh }: PartnershipContactTabProps) => {
  const form2 = forms.form2 || {};
  const form5 = forms.form5 || {};
  
  // Prioritize real company profile data over AI-generated form data
  const displayData = {
    company: companyProfile?.name || form2.company,
    sector: companyProfile?.sector || form2.sector,
    website: companyProfile?.website || form2.website,
    
    // Contact fields
    contact_name: companyProfile?.contact_person || form2.contact_name,
    contact_email: companyProfile?.contact_email || form2.contact_email,
    contact_phone: companyProfile?.contact_phone || form2.contact_phone,
    contact_title: companyProfile?.contact_title || form2.contact_title,
    
    // Apollo enriched contact fields
    contact_first_name: companyProfile?.contact_first_name,
    contact_last_name: companyProfile?.contact_last_name,
    contact_headline: companyProfile?.contact_headline,
    contact_photo_url: companyProfile?.contact_photo_url,
    contact_city: companyProfile?.contact_city,
    contact_state: companyProfile?.contact_state,
    contact_country: companyProfile?.contact_country,
    contact_email_status: companyProfile?.contact_email_status,
    contact_employment_history: companyProfile?.contact_employment_history,
    linkedin_profile: companyProfile?.linkedin_profile,
    contact_twitter_url: companyProfile?.contact_twitter_url,
    
    // Data quality
    data_enrichment_level: companyProfile?.data_enrichment_level || 'basic',
    data_completeness_score: companyProfile?.data_completeness_score || 0,
    
    preferred_communication: form2.preferred_communication
  };

  // Get enrichment badge variant
  const getEnrichmentBadge = (level: string) => {
    switch (level) {
      case 'fully_enriched':
        return { variant: 'default' as const, label: 'Fully Verified', color: 'text-green-600' };
      case 'apollo_verified':
        return { variant: 'secondary' as const, label: 'Apollo Verified', color: 'text-blue-600' };
      default:
        return { variant: 'outline' as const, label: 'Basic Info', color: 'text-gray-600' };
    }
  };

  const enrichmentBadge = getEnrichmentBadge(displayData.data_enrichment_level);
  
  return (
    <div className="space-y-6">
      {/* Enrichment Panel */}
      {companyProfile && (
        <EnrichmentPanel 
          companyProfile={companyProfile} 
          onEnrichmentComplete={onDataRefresh}
        />
      )}

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle>Partnership Contact</CardTitle>
                <Badge variant={enrichmentBadge.variant} className={enrichmentBadge.color}>
                  {enrichmentBadge.label}
                </Badge>
              </div>
              <CardDescription>Primary point of contact for this partnership</CardDescription>
              {displayData.data_enrichment_level !== 'basic' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Data Quality:</span>
                  <Progress value={displayData.data_completeness_score} className="w-32" />
                  <span className="text-sm font-medium">{displayData.data_completeness_score}%</span>
                </div>
              )}
            </div>
            <ProposePartnershipDialog
              projectId={projectId}
              companyName={displayData.company}
              companyProfileId={companyProfile?.id}
              projectTitle={projectTitle}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Company Basic Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Details
              </h3>
              <div>
                <p className="font-medium">{displayData.company}</p>
                <Badge variant="outline" className="mt-1">{displayData.sector}</Badge>
              </div>
              {displayData.website && (
                <a 
                  href={displayData.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline text-sm"
                >
                  <Globe className="h-4 w-4" />
                  {displayData.website}
                </a>
              )}
            </div>

            {/* Contact Person */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Person
              </h3>
              
              {displayData.contact_name && displayData.contact_name !== 'TBD' && displayData.contact_name !== 'General Manager' ? (
                <>
                  {/* Contact Profile */}
                  <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
                    <Avatar className="h-10 w-10">
                      {displayData.contact_photo_url && (
                        <AvatarImage src={displayData.contact_photo_url} alt={displayData.contact_name} />
                      )}
                      <AvatarFallback>
                        {displayData.contact_first_name?.[0]}{displayData.contact_last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{displayData.contact_name}</p>
                      {displayData.contact_title && (
                        <p className="text-sm text-muted-foreground">{displayData.contact_title}</p>
                      )}
                      {(displayData.contact_city || displayData.contact_state) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {[displayData.contact_city, displayData.contact_state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Contact Methods */}
                  <div className="space-y-2">
                    {displayData.contact_email && displayData.contact_email !== '' && (
                      <a 
                        href={`mailto:${displayData.contact_email}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {displayData.contact_email}
                      </a>
                    )}
                    
                    {displayData.contact_phone && displayData.contact_phone !== '' && (
                      <a 
                        href={`tel:${displayData.contact_phone}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {displayData.contact_phone}
                      </a>
                    )}
                    
                    {displayData.linkedin_profile && (
                      <a 
                        href={displayData.linkedin_profile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn Profile
                      </a>
                    )}
                  </div>
                  
                  {/* Employment History */}
                  {displayData.contact_employment_history && Array.isArray(displayData.contact_employment_history) && displayData.contact_employment_history.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        Professional Background
                      </p>
                      <div className="space-y-2">
                        {displayData.contact_employment_history.slice(0, 2).map((job: any, idx: number) => (
                          <div key={idx} className="text-sm border-l-2 border-primary/20 pl-3">
                            <p className="font-medium">{job.title}</p>
                            <p className="text-muted-foreground text-xs">{job.organization_name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                  <p className="font-semibold">ℹ️ Contact Information Unavailable</p>
                  <p className="text-muted-foreground mt-1">Use the "Propose Partnership" button to reach out.</p>
                </div>
              )}
            </div>
          </div>

          {displayData.preferred_communication && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Preferred Communication:</span>
                <Badge variant="secondary">{displayData.preferred_communication}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Logistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Project Logistics
          </CardTitle>
          <CardDescription>Practical details and requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Type & Scope */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Project Type</p>
                <Badge variant="secondary">{form5.type || 'N/A'}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Scope</p>
                <p className="text-sm">{form5.scope || 'N/A'}</p>
              </div>
            </div>

            {/* Location & IP */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  <MapPinned className="h-4 w-4" />
                  Location Requirements
                </p>
                <p className="text-sm">{form5.location || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Intellectual Property
                </p>
                <p className="text-sm">{form5.ip || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Equipment & Software */}
          {(form5.equipment_provided || form5.equipment_needed || form5.software_required) && (
            <div className="pt-4 border-t space-y-4">
              {form5.equipment_provided && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Equipment Provided
                  </p>
                  <p className="text-sm">{form5.equipment_provided}</p>
                </div>
              )}
              
              {form5.equipment_needed && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Equipment Needed
                  </p>
                  <p className="text-sm">{form5.equipment_needed}</p>
                </div>
              )}
              
              {form5.software_required && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Laptop className="h-4 w-4" />
                    Software Requirements
                  </p>
                  <p className="text-sm">{form5.software_required}</p>
                </div>
              )}
            </div>
          )}

          {/* Past Experience & Follow-up */}
          {(form5.past_experience || form5.followup_opportunity) && (
            <div className="pt-4 border-t space-y-4">
              {form5.past_experience && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Past Project Experience</p>
                  <p className="text-sm">{form5.past_experience}</p>
                </div>
              )}
              
              {form5.followup_opportunity && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Follow-up Opportunities</p>
                  <p className="text-sm">{form5.followup_opportunity}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};