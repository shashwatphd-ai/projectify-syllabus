import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Globe, MessageSquare, Building2, Users as UsersIcon } from "lucide-react";
import { ProposePartnershipDialog } from "@/components/ProposePartnershipDialog";

interface ContactTabProps {
  forms: any;
  companyProfile?: any;
  projectId: string;
  projectTitle: string;
}

export const ContactTab = ({ forms, companyProfile, projectId, projectTitle }: ContactTabProps) => {
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
    contact_name: companyProfile?.contact_person || form2.contact_name,
    contact_email: companyProfile?.contact_email || form2.contact_email,
    contact_phone: companyProfile?.contact_phone || form2.contact_phone,
    contact_title: form2.contact_title,
    preferred_communication: form2.preferred_communication
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Partner organization details and contact</CardDescription>
            </div>
            <ProposePartnershipDialog
              projectId={projectId}
              companyName={displayData.company}
              companyProfileId={companyProfile?.id}
              projectTitle={projectTitle}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium">{displayData.company}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sector</p>
                  <Badge variant="outline">{displayData.sector}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company Size</p>
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <p>{displayData.size}</p>
                  </div>
                </div>
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
                {displayData.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{displayData.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="space-y-3">
                {displayData.contact_name && displayData.contact_name !== 'TBD' ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <p className="font-medium">{displayData.contact_name}</p>
                    {displayData.contact_title && (
                      <p className="text-sm text-muted-foreground">{displayData.contact_title}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm space-y-1">
                      <p className="font-semibold">ℹ️ Contact Information Unavailable</p>
                      <p>Real company contact details require a location (city & zip code) in your syllabus. This enables our system to find companies near you with verified addresses and contacts.</p>
                      <p className="text-xs">You can reach out via the company website above or request contact information directly from the company.</p>
                    </div>
                  </div>
                )}
                {displayData.contact_email && displayData.contact_email !== '' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a 
                      href={`mailto:${displayData.contact_email}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {displayData.contact_email}
                    </a>
                  </div>
                )}
                {displayData.contact_phone && displayData.contact_phone !== '' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a 
                      href={`tel:${displayData.contact_phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {displayData.contact_phone}
                    </a>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
