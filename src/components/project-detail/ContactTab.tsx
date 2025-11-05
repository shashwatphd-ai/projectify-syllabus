import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Globe, MessageSquare, Building2, Users as UsersIcon, Linkedin, Twitter, Facebook, Calendar, Award, Briefcase, MapPin, Target, AlertCircle, Code, TrendingUp } from "lucide-react";
import { ProposePartnershipDialog } from "@/components/ProposePartnershipDialog";
import { EnrichmentPanel } from "./EnrichmentPanel";

interface ContactTabProps {
  forms: any;
  companyProfile?: any;
  projectId: string;
  projectTitle: string;
  onDataRefresh?: () => void;
}

export const ContactTab = ({ forms, companyProfile, projectId, projectTitle, onDataRefresh }: ContactTabProps) => {
  const form2 = forms.form2 || {};
  
  // Prioritize real company profile data over AI-generated form data
  const displayData = {
    company: companyProfile?.name || form2.company,
    sector: companyProfile?.sector || form2.sector,
    size: companyProfile?.size || form2.size,
    website: companyProfile?.website || form2.website,
    description: companyProfile?.recent_news || form2.description,
    full_address: companyProfile?.full_address,
    city: companyProfile?.city,
    zip: companyProfile?.zip,
    
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
    
    // Apollo enriched organization fields
    organization_linkedin_url: companyProfile?.organization_linkedin_url,
    organization_twitter_url: companyProfile?.organization_twitter_url,
    organization_facebook_url: companyProfile?.organization_facebook_url,
    organization_founded_year: companyProfile?.organization_founded_year,
    organization_logo_url: companyProfile?.organization_logo_url,
    organization_employee_count: companyProfile?.organization_employee_count,
    organization_revenue_range: companyProfile?.organization_revenue_range,
    
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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle>Company Information</CardTitle>
                <Badge variant={enrichmentBadge.variant} className={enrichmentBadge.color}>
                  {enrichmentBadge.label}
                </Badge>
              </div>
              <CardDescription>Partner organization details and contact</CardDescription>
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
            {/* Company Details */}
            <div className="space-y-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Details
              </h3>
              
              {displayData.organization_logo_url && (
                <div className="flex items-center gap-3 pb-2">
                  <img 
                    src={displayData.organization_logo_url} 
                    alt={`${displayData.company} logo`}
                    className="h-12 w-12 object-contain rounded"
                  />
                  <div>
                    <p className="font-medium">{displayData.company}</p>
                    {displayData.organization_founded_year && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Founded {displayData.organization_founded_year}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {!displayData.organization_logo_url && (
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium">{displayData.company}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground">Sector</p>
                <Badge variant="outline">{displayData.sector}</Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Company Size</p>
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <p>{displayData.organization_employee_count || displayData.size}</p>
                </div>
              </div>
              
              {displayData.organization_revenue_range && (
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="font-medium">{displayData.organization_revenue_range}</p>
                </div>
              )}
              
              {displayData.full_address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-sm">{displayData.full_address}</p>
                  {displayData.city && displayData.zip && (
                    <p className="text-sm text-muted-foreground">{displayData.city} {displayData.zip}</p>
                  )}
                </div>
              )}
              
              {displayData.website && (
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a 
                    href={displayData.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {displayData.website}
                  </a>
                </div>
              )}
              
              {/* Social Links */}
              {(displayData.organization_linkedin_url || displayData.organization_twitter_url || displayData.organization_facebook_url) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Social Media</p>
                  <div className="flex gap-2">
                    {displayData.organization_linkedin_url && (
                      <a 
                        href={displayData.organization_linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {displayData.organization_twitter_url && (
                      <a 
                        href={displayData.organization_twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {displayData.organization_facebook_url && (
                      <a 
                        href={displayData.organization_facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {displayData.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{displayData.description}</p>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h3>
              
              {displayData.contact_name && displayData.contact_name !== 'TBD' && displayData.contact_name !== 'General Manager' ? (
                <>
                  {/* Contact Profile */}
                  <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
                    <Avatar className="h-12 w-12">
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
                      {displayData.contact_headline && (
                        <p className="text-sm text-muted-foreground mt-1">{displayData.contact_headline}</p>
                      )}
                      {(displayData.contact_city || displayData.contact_state || displayData.contact_country) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {[displayData.contact_city, displayData.contact_state, displayData.contact_country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Contact Details */}
                  {displayData.contact_email && displayData.contact_email !== '' && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <a 
                        href={`mailto:${displayData.contact_email}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {displayData.contact_email}
                        {displayData.contact_email_status && (
                          <Badge variant="outline" className="text-xs">
                            {displayData.contact_email_status}
                          </Badge>
                        )}
                      </a>
                    </div>
                  )}
                  
                  {displayData.contact_phone && displayData.contact_phone !== '' && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <a 
                        href={`tel:${displayData.contact_phone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {displayData.contact_phone}
                      </a>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {(displayData.linkedin_profile || displayData.contact_twitter_url) && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Professional Profiles</p>
                      <div className="flex gap-2">
                        {displayData.linkedin_profile && (
                          <a 
                            href={displayData.linkedin_profile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {displayData.contact_twitter_url && (
                          <a 
                            href={displayData.contact_twitter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                          >
                            <Twitter className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Employment History */}
                  {displayData.contact_employment_history && Array.isArray(displayData.contact_employment_history) && displayData.contact_employment_history.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        Professional Experience
                      </p>
                      <div className="space-y-2">
                        {displayData.contact_employment_history.slice(0, 3).map((job: any, idx: number) => (
                          <div key={idx} className="text-sm border-l-2 border-primary/20 pl-3">
                            <p className="font-medium">{job.title}</p>
                            <p className="text-muted-foreground">{job.organization_name}</p>
                            {job.start_date && (
                              <p className="text-xs text-muted-foreground">
                                {job.start_date} - {job.end_date || 'Present'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm space-y-1">
                    <p className="font-semibold">ℹ️ Contact Information Unavailable</p>
                    <p>Specific contact details are not publicly available. Use the "Propose Partnership" button above to reach out, or visit the company website for contact options.</p>
                  </div>
                </div>
              )}
              
              {displayData.preferred_communication && (
                <div>
                  <p className="text-sm text-muted-foreground">Preferred Communication</p>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <p>{displayData.preferred_communication}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Challenges & Needs */}
      {companyProfile?.inferred_needs && companyProfile.inferred_needs.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Current Business Challenges
            </CardTitle>
            <CardDescription>
              Market-verified needs this company is actively addressing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {companyProfile.inferred_needs.map((need: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{need}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Active Job Postings */}
      {companyProfile?.job_postings && companyProfile.job_postings.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Active Hiring ({companyProfile.job_postings.length} Open Roles)
            </CardTitle>
            <CardDescription>
              Current talent needs - potential project alignment opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companyProfile.job_postings.slice(0, 5).map((job: any, i: number) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{job.title}</p>
                      {(job.city || job.state) && (
                        <p className="text-xs text-muted-foreground">
                          {job.city}{job.city && job.state ? ', ' : ''}{job.state}
                          {job.posted_at && ` • Posted ${new Date(job.posted_at).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    {job.url && (
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex-shrink-0"
                      >
                        View →
                      </a>
                    )}
                  </div>
                  {job.skills_needed && job.skills_needed.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.skills_needed.slice(0, 5).map((skill: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {companyProfile.job_postings.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  + {companyProfile.job_postings.length - 5} more positions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technology Stack */}
      {companyProfile?.technologies_used && companyProfile.technologies_used.length > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Technology Stack
            </CardTitle>
            <CardDescription>
              {companyProfile.technologies_used.length} technologies tracked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {companyProfile.technologies_used.map((tech: string, i: number) => (
                <Badge key={i} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funding & Market Position */}
      {(companyProfile?.funding_stage || companyProfile?.total_funding_usd || companyProfile?.recent_news) && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Position & Funding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {companyProfile.funding_stage && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Funding Stage</p>
                <Badge variant="default">{companyProfile.funding_stage}</Badge>
              </div>
            )}
            {companyProfile.total_funding_usd && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Funding</p>
                <p className="font-bold text-lg">
                  ${(companyProfile.total_funding_usd / 1000000).toFixed(1)}M
                </p>
              </div>
            )}
            {companyProfile.organization_revenue_range && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Revenue Range</p>
                <p className="text-sm font-medium">{companyProfile.organization_revenue_range}</p>
              </div>
            )}
            {companyProfile.organization_employee_count && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Employee Count</p>
                <p className="text-sm font-medium">{companyProfile.organization_employee_count}</p>
              </div>
            )}
            {companyProfile.recent_news && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Recent Activity</p>
                <p className="text-sm">{companyProfile.recent_news}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};