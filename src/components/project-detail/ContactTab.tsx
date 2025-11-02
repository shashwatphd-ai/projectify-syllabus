import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Globe, MessageSquare, Building2, Users as UsersIcon } from "lucide-react";

interface ContactTabProps {
  forms: any;
}

export const ContactTab = ({ forms }: ContactTabProps) => {
  const form2 = forms.form2 || {};
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Partner organization details and contact</CardDescription>
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
                  <p className="font-medium">{form2.company}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sector</p>
                  <Badge variant="outline">{form2.sector}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company Size</p>
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <p>{form2.size}</p>
                  </div>
                </div>
                {form2.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a 
                      href={form2.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      {form2.website}
                    </a>
                  </div>
                )}
                {form2.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{form2.description}</p>
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
                {form2.contact_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <p className="font-medium">{form2.contact_name}</p>
                    {form2.contact_title && (
                      <p className="text-sm text-muted-foreground">{form2.contact_title}</p>
                    )}
                  </div>
                )}
                {form2.contact_email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a 
                      href={`mailto:${form2.contact_email}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {form2.contact_email}
                    </a>
                  </div>
                )}
                {form2.contact_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a 
                      href={`tel:${form2.contact_phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {form2.contact_phone}
                    </a>
                  </div>
                )}
                {form2.preferred_communication && (
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Communication</p>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <p>{form2.preferred_communication}</p>
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
