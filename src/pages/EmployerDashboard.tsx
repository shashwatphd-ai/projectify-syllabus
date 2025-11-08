import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Mail, Globe, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyProfile {
  id: string;
  name: string;
  website: string | null;
  sector: string | null;
  city: string | null;
  full_address: string | null;
  contact_email: string | null;
  organization_logo_url: string | null;
}

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCompanyProfile();
    }
  }, [user]);

  const fetchCompanyProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("company_profiles")
        .select("id, name, website, sector, city, full_address, contact_email, organization_logo_url")
        .eq("owner_user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.info("No company profile found. Contact support to link your company.");
      }

      setCompanyProfile(data);
    } catch (error: any) {
      console.error("Error fetching company profile:", error);
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!companyProfile) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Employer Dashboard</h1>
          <Card>
            <CardHeader>
              <CardTitle>No Company Profile</CardTitle>
              <CardDescription>
                Your account is not linked to a company profile. Please contact support to get started.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Employer Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Welcome back, {companyProfile.name}
        </p>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Your company information and details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {companyProfile.organization_logo_url && (
                <div className="flex items-center gap-4">
                  <img
                    src={companyProfile.organization_logo_url}
                    alt={`${companyProfile.name} logo`}
                    className="h-16 w-16 object-contain rounded"
                  />
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Company Name</p>
                  <p className="font-medium">{companyProfile.name}</p>
                </div>

                {companyProfile.sector && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Industry Sector</p>
                    <p className="font-medium">{companyProfile.sector}</p>
                  </div>
                )}

                {companyProfile.website && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      Website
                    </p>
                    <a
                      href={companyProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {companyProfile.website}
                    </a>
                  </div>
                )}

                {companyProfile.contact_email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Contact Email
                    </p>
                    <p className="font-medium">{companyProfile.contact_email}</p>
                  </div>
                )}

                {(companyProfile.city || companyProfile.full_address) && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </p>
                    <p className="font-medium">
                      {companyProfile.full_address || companyProfile.city}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Projects</CardTitle>
              <CardDescription>
                Student projects and partnership opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Coming soon: View and manage your project partnerships with students.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Applicants</CardTitle>
              <CardDescription>
                Students interested in working with your company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Coming soon: View students who have applied or expressed interest.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
