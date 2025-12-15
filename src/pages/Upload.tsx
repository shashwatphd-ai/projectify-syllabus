import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload as UploadIcon, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { validateLocationFormat, needsManualLocationEntry } from "@/utils/locationValidation";

const Upload = () => {
  const { user, loading: authLoading, requireAuth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(() => 
    sessionStorage.getItem('uploadedSyllabusPath')
  );
  const [storedFileName, setStoredFileName] = useState<string | null>(() =>
    sessionStorage.getItem('uploadedSyllabusName')
  );
  const [storedFileSize, setStoredFileSize] = useState<number | null>(() => {
    const size = sessionStorage.getItem('uploadedSyllabusSize');
    return size ? parseInt(size, 10) : null;
  });
  const [cityZip, setCityZip] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [locationData, setLocationData] = useState({
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualZip, setManualZip] = useState("");
  const detectionAttemptedRef = useRef(false);
  const navigate = useNavigate();

  const processFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setFile(selectedFile);
  };

  useEffect(() => {
    // Only redirect if auth is fully loaded and user is definitely not logged in
    // Give a small delay to prevent race conditions during navigation
    if (!authLoading && !user) {
      const timer = setTimeout(() => {
        navigate("/auth?mode=signin");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, navigate]);

  // Auto-detect location on mount if user email is available
  useEffect(() => {
    const shouldDetect = user?.email && !cityZip && !detectionAttemptedRef.current;

    console.log('Location detection check:', {
      hasEmail: !!user?.email,
      currentLocation: cityZip,
      alreadyAttempted: detectionAttemptedRef.current,
      willDetect: shouldDetect
    });

    if (shouldDetect) {
      console.log('🔍 Auto-detecting location for:', user.email);
      detectionAttemptedRef.current = true;
      detectLocationFromEmail(user.email);
    }
  }, [user?.email, cityZip]);

  const detectLocationFromEmail = async (email: string) => {
    console.log('🌍 Starting backend location detection for:', email);
    setLocationLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('detect-location', {
        body: { email }
      });

      if (error) {
        console.error('❌ Location detection error:', error);
        toast.error('Failed to detect location. Please enter manually.');
        return;
      }

      if (data.success && data.location) {
        console.log('📍 Location detected:', data.location);
        console.log('🔍 Search location format:', data.searchLocation);
        console.log('📦 Full location data:', { city: data.city, state: data.state, zip: data.zip, country: data.country });

        // P0-2 FIX: Validate location format before storing
        const locationToValidate = data.searchLocation || data.location;
        const validation = validateLocationFormat(locationToValidate);

        if (!validation.isValid) {
          console.warn('⚠️ Location format invalid:', validation.error);
          toast.error(`Location format invalid: ${validation.error}. Please enter manually.`);
          setManualEntry(true);
          return;
        }

        // Check if location looks suspicious (institution name, URL, etc.)
        if (needsManualLocationEntry(locationToValidate)) {
          console.warn('⚠️ Location needs manual entry:', locationToValidate);
          toast.error('Location format unclear. Please enter manually.');
          setManualEntry(true);
          return;
        }

        console.log('✅ Location validation passed:', validation.normalized);

        setCityZip(data.location); // Display format
        setSearchLocation(validation.normalized || locationToValidate); // Validated Apollo format
        setLocationData({
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          country: data.country || 'US'
        });
        toast.success(`Location detected: ${data.city}, ${data.state || data.country}`);
      } else {
        console.log('⚠️ Location detection unsuccessful:', data.error);
        toast.error(data.error || 'Could not find location for your institution');
      }
    } catch (error) {
      console.error('❌ Location detection error:', error);
      toast.error('Failed to detect location. Please enter manually.');
    } finally {
      setLocationLoading(false);
      console.log('🏁 Location detection completed');
    }
  };

  const uploadFileToStorage = async (selectedFile: File) => {
    if (!user) return;
    
    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { data, error } = await supabase.storage
        .from('syllabi')
        .upload(fileName, selectedFile, { upsert: true });
      
      if (error) throw error;
      
      // Store path, name, and size in sessionStorage to survive Android reload
      sessionStorage.setItem('uploadedSyllabusPath', data.path);
      sessionStorage.setItem('uploadedSyllabusName', selectedFile.name);
      sessionStorage.setItem('uploadedSyllabusSize', selectedFile.size.toString());
      setStoragePath(data.path);
      setStoredFileName(selectedFile.name);
      setStoredFileSize(selectedFile.size);
      setFile(selectedFile);
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
      uploadFileToStorage(selectedFile);
    }
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!file && !storagePath) || !user) {
      toast.error("Please select a syllabus file");
      return;
    }

    // Phase 4: Use manual entry if provided, otherwise use auto-detected
    const finalLocation = manualEntry && manualCity && manualZip
      ? `${manualCity}${manualState ? ', ' + manualState : ''} ${manualZip}`
      : cityZip;

    if (!finalLocation) {
      toast.error("Please enter or detect your location");
      return;
    }

    setLoading(true);

    try {
      console.log('Starting file upload...');

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('Session valid, processing file...');

      const locationPayload = {
        location: finalLocation,
        searchLocation: searchLocation || finalLocation,
        city: manualEntry ? manualCity : locationData.city,
        state: manualEntry ? manualState : locationData.state,
        zip: manualEntry ? manualZip : locationData.zip,
        country: locationData.country || 'US'
      };

      let invokeBody: FormData | object;
      
      // Use storagePath if file was already uploaded (survives Android reload)
      if (storagePath) {
        invokeBody = { storagePath, cityZip: locationPayload };
      } else if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('cityZip', JSON.stringify(locationPayload));
        invokeBody = formData;
      } else {
        throw new Error('No file available');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('parse-syllabus', {
        body: invokeBody,
      });

      if (invokeError) {
        console.error('Error response:', invokeError);
        throw new Error(invokeError.message || 'Failed to parse syllabus');
      }

      if (!data) {
        throw new Error('No data returned from parse-syllabus');
      }
      console.log('Parse successful:', data);

      // Clear sessionStorage after successful parse
      sessionStorage.removeItem('uploadedSyllabusPath');
      sessionStorage.removeItem('uploadedSyllabusName');
      sessionStorage.removeItem('uploadedSyllabusSize');
      
      toast.success("Syllabus parsed successfully!");

      // Navigate to review page with parsed data
      const params = new URLSearchParams({
        courseId: data.course.id,
        parsed: encodeURIComponent(JSON.stringify(data.parsed))
      });

      if (data.rawText) {
        params.append('rawText', encodeURIComponent(data.rawText));
      }

      navigate(`/review-syllabus?${params.toString()}`);
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
      <Header />
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
              {/* Phase 4: Manual Location Override */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="manual-location"
                    checked={manualEntry}
                    onCheckedChange={(checked) => setManualEntry(checked as boolean)}
                  />
                  <Label
                    htmlFor="manual-location"
                    className="text-sm font-normal cursor-pointer"
                  >
                    My location was not detected correctly
                  </Label>
                </div>

                {!manualEntry ? (
                  // Auto-detected location
                  <div className="space-y-2">
                    <Label htmlFor="cityZip">Location (Auto-detected)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cityZip"
                        placeholder="Will be detected from your email..."
                        value={cityZip}
                        onChange={(e) => setCityZip(e.target.value)}
                        disabled={locationLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (user?.email) {
                            detectionAttemptedRef.current = true;
                            detectLocationFromEmail(user.email);
                          }
                        }}
                        disabled={locationLoading || !user?.email}
                      >
                        {locationLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Re-detect"
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {locationLoading ? 'Detecting location from your university email...' : 'Supports universities worldwide'}
                    </p>
                  </div>
                ) : (
                  // Manual entry
                  <div className="space-y-3">
                    <Label>Enter Your Location Manually</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Input
                          placeholder="City (required)"
                          value={manualCity}
                          onChange={(e) => setManualCity(e.target.value)}
                          required={manualEntry}
                        />
                      </div>
                      <Input
                        placeholder="State/Province"
                        value={manualState}
                        onChange={(e) => setManualState(e.target.value)}
                      />
                      <Input
                        placeholder="ZIP/Postal Code (required)"
                        value={manualZip}
                        onChange={(e) => setManualZip(e.target.value)}
                        required={manualEntry}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter your institution's location in any format
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Syllabus PDF</Label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
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
                    {uploading ? (
                      <>
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-medium">Uploading file...</p>
                      </>
                    ) : file || storagePath ? (
                      <>
                        <FileText className="h-12 w-12 text-primary" />
                        <p className="font-medium">{file?.name || storedFileName || 'File uploaded'}</p>
                        <p className="text-sm text-muted-foreground">
                          {((file?.size || storedFileSize || 0) / 1024 / 1024).toFixed(2)} MB
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

              <Button type="submit" className="w-full" disabled={loading || uploading || (!file && !storagePath)}>
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
