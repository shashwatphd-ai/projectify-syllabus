import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload as UploadIcon, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Upload = () => {
  const { user, loading: authLoading, requireAuth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [cityZip, setCityZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    requireAuth();
  }, [authLoading]);

  useEffect(() => {
    // Auto-detect location on mount
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setLocationLoading(true);
    try {
      // Use browser geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode using OpenStreetMap Nominatim (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();

      if (data.address) {
        const city = data.address.city || data.address.town || data.address.village || '';
        const state = data.address.state || '';
        const postcode = data.address.postcode || '';
        
        if (city && postcode) {
          setCityZip(`${city}, ${state} ${postcode}`);
        }
      }
    } catch (error) {
      console.log('Could not auto-detect location:', error);
      // Silently fail - user can enter manually
    } finally {
      setLocationLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !user) {
      toast.error("Please select a syllabus file");
      return;
    }

    setLoading(true);

    try {
      console.log('Starting file upload...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('Session valid, uploading file...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('cityZip', cityZip);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-syllabus`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorMessage = `Failed to parse syllabus (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Parse successful:', data);

      toast.success("Syllabus parsed successfully!");
      navigate("/configure", { 
        state: { 
          courseId: data.course.id,
          courseData: data.parsed 
        } 
      });
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || "Failed to parse syllabus");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Upload Your Syllabus</h1>
          <p className="text-muted-foreground">
            We'll extract learning outcomes, course structure, and more
          </p>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Course Syllabus</CardTitle>
            <CardDescription>
              Upload a PDF file containing your course syllabus (max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cityZip">City & ZIP Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="cityZip"
                    placeholder="Kansas City, MO 64110"
                    value={cityZip}
                    onChange={(e) => setCityZip(e.target.value)}
                    required
                    disabled={locationLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={detectLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Auto-detect"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Location auto-detected from your browser
                </p>
              </div>

              <div className="space-y-2">
                <Label>Syllabus PDF</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {file ? (
                      <>
                        <FileText className="h-12 w-12 text-primary" />
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <UploadIcon className="h-12 w-12 text-muted-foreground" />
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">
                          PDF files only, max 10MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing Syllabus...
                  </>
                ) : (
                  "Parse Syllabus"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
