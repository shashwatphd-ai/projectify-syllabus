import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload as UploadIcon, FileText, Loader2, X, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { validateLocationFormat, needsManualLocationEntry } from "@/utils/locationValidation";

// SessionStorage keys for persistence across mobile reloads
const STORAGE_KEYS = {
  PENDING_FILE: 'upload_pendingFile',
  CITY_ZIP: 'upload_cityZip',
  SEARCH_LOCATION: 'upload_searchLocation',
  LOCATION_DATA: 'upload_locationData',
  MANUAL_ENTRY: 'upload_manualEntry',
  MANUAL_CITY: 'upload_manualCity',
  MANUAL_STATE: 'upload_manualState',
  MANUAL_ZIP: 'upload_manualZip',
  DETECTION_ATTEMPTED: 'upload_detectionAttempted',
};

interface PendingFile {
  storagePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

const Upload = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // File state - now stores reference to uploaded file, not the File object
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Location state
  const [cityZip, setCityZip] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [locationData, setLocationData] = useState({
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualZip, setManualZip] = useState("");
  
  // Parsing state
  const [parsing, setParsing] = useState(false);
  
  const detectionAttemptedRef = useRef(false);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const savedPendingFile = sessionStorage.getItem(STORAGE_KEYS.PENDING_FILE);
      if (savedPendingFile) {
        setPendingFile(JSON.parse(savedPendingFile));
      }
      
      const savedCityZip = sessionStorage.getItem(STORAGE_KEYS.CITY_ZIP);
      if (savedCityZip) setCityZip(savedCityZip);
      
      const savedSearchLocation = sessionStorage.getItem(STORAGE_KEYS.SEARCH_LOCATION);
      if (savedSearchLocation) setSearchLocation(savedSearchLocation);
      
      const savedLocationData = sessionStorage.getItem(STORAGE_KEYS.LOCATION_DATA);
      if (savedLocationData) setLocationData(JSON.parse(savedLocationData));
      
      const savedManualEntry = sessionStorage.getItem(STORAGE_KEYS.MANUAL_ENTRY);
      if (savedManualEntry) setManualEntry(savedManualEntry === 'true');
      
      const savedManualCity = sessionStorage.getItem(STORAGE_KEYS.MANUAL_CITY);
      if (savedManualCity) setManualCity(savedManualCity);
      
      const savedManualState = sessionStorage.getItem(STORAGE_KEYS.MANUAL_STATE);
      if (savedManualState) setManualState(savedManualState);
      
      const savedManualZip = sessionStorage.getItem(STORAGE_KEYS.MANUAL_ZIP);
      if (savedManualZip) setManualZip(savedManualZip);
      
      const savedDetectionAttempted = sessionStorage.getItem(STORAGE_KEYS.DETECTION_ATTEMPTED);
      if (savedDetectionAttempted === 'true') {
        detectionAttemptedRef.current = true;
      }
    } catch (e) {
      console.warn('Failed to restore upload state:', e);
    }
  }, []);

  // Persist state changes to sessionStorage
  useEffect(() => {
    if (pendingFile) {
      sessionStorage.setItem(STORAGE_KEYS.PENDING_FILE, JSON.stringify(pendingFile));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PENDING_FILE);
    }
  }, [pendingFile]);

  useEffect(() => {
    if (cityZip) sessionStorage.setItem(STORAGE_KEYS.CITY_ZIP, cityZip);
  }, [cityZip]);

  useEffect(() => {
    if (searchLocation) sessionStorage.setItem(STORAGE_KEYS.SEARCH_LOCATION, searchLocation);
  }, [searchLocation]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.LOCATION_DATA, JSON.stringify(locationData));
  }, [locationData]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.MANUAL_ENTRY, String(manualEntry));
  }, [manualEntry]);

  useEffect(() => {
    if (manualCity) sessionStorage.setItem(STORAGE_KEYS.MANUAL_CITY, manualCity);
  }, [manualCity]);

  useEffect(() => {
    if (manualState) sessionStorage.setItem(STORAGE_KEYS.MANUAL_STATE, manualState);
  }, [manualState]);

  useEffect(() => {
    if (manualZip) sessionStorage.setItem(STORAGE_KEYS.MANUAL_ZIP, manualZip);
  }, [manualZip]);

  // Clear all persisted state after successful navigation
  const clearPersistedState = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
  }, []);

  // Auth redirect
  useEffect(() => {
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

    if (shouldDetect) {
      console.log('🔍 Auto-detecting location for:', user.email);
      detectionAttemptedRef.current = true;
      sessionStorage.setItem(STORAGE_KEYS.DETECTION_ATTEMPTED, 'true');
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
        const locationToValidate = data.searchLocation || data.location;
        const validation = validateLocationFormat(locationToValidate);

        if (!validation.isValid) {
          console.warn('⚠️ Location format invalid:', validation.error);
          toast.error(`Location format invalid: ${validation.error}. Please enter manually.`);
          setManualEntry(true);
          return;
        }

        if (needsManualLocationEntry(locationToValidate)) {
          console.warn('⚠️ Location needs manual entry:', locationToValidate);
          toast.error('Location format unclear. Please enter manually.');
          setManualEntry(true);
          return;
        }

        setCityZip(data.location);
        setSearchLocation(validation.normalized || locationToValidate);
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
    }
  };

  // Immediately upload file to storage when selected
  const handleFileSelect = async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setUploading(true);
    
    try {
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;
      
      console.log('📤 Uploading file to storage:', storagePath);
      
      const { error: uploadError } = await supabase.storage
        .from('syllabi')
        .upload(storagePath, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const fileInfo: PendingFile = {
        storagePath,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadedAt: new Date().toISOString()
      };

      setPendingFile(fileInfo);
      toast.success("File uploaded successfully");
      console.log('✅ File uploaded and reference saved:', fileInfo);
      
    } catch (error: any) {
      console.error('❌ File upload error:', error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemoveFile = async () => {
    if (pendingFile) {
      try {
        // Delete from storage
        await supabase.storage.from('syllabi').remove([pendingFile.storagePath]);
      } catch (e) {
        console.warn('Failed to delete file from storage:', e);
      }
      setPendingFile(null);
      sessionStorage.removeItem(STORAGE_KEYS.PENDING_FILE);
      toast.info("File removed");
    }
  };

  const handleSubmit = async () => {
    if (!pendingFile || !user) {
      toast.error("Please select a syllabus file");
      return;
    }

    const finalLocation = manualEntry && manualCity && manualZip
      ? `${manualCity}${manualState ? ', ' + manualState : ''} ${manualZip}`
      : cityZip;

    if (!finalLocation) {
      toast.error("Please enter or detect your location");
      return;
    }

    setParsing(true);

    try {
      console.log('Starting syllabus parsing with storagePath:', pendingFile.storagePath);

      // Call parse-syllabus with storagePath instead of file
      const { data, error: invokeError } = await supabase.functions.invoke('parse-syllabus', {
        body: {
          storagePath: pendingFile.storagePath,
          cityZipData: {
            location: finalLocation,
            searchLocation: searchLocation || finalLocation,
            city: manualEntry ? manualCity : locationData.city,
            state: manualEntry ? manualState : locationData.state,
            zip: manualEntry ? manualZip : locationData.zip,
            country: locationData.country || 'US'
          }
        }
      });

      if (invokeError) {
        console.error('Error response:', invokeError);
        throw new Error(invokeError.message || 'Failed to parse syllabus');
      }

      if (!data) {
        throw new Error('No data returned from parse-syllabus');
      }
      console.log('Parse successful:', data);

      toast.success("Syllabus parsed successfully!");
      
      // Clear persisted state after successful parse
      clearPersistedState();

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
      setParsing(false);
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
            <div className="space-y-6">
              {/* Location Section */}
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
                            sessionStorage.setItem(STORAGE_KEYS.DETECTION_ATTEMPTED, 'true');
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
                  <div className="space-y-3">
                    <Label>Enter Your Location Manually</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Input
                          placeholder="City (required)"
                          value={manualCity}
                          onChange={(e) => setManualCity(e.target.value)}
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
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter your institution's location in any format
                    </p>
                  </div>
                )}
              </div>

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label>Syllabus PDF</Label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                
                {pendingFile ? (
                  // File uploaded - show success state
                  <div className="border-2 border-primary/50 bg-primary/5 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{pendingFile.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {(pendingFile.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      ✓ Your file is saved and won't be lost if the page refreshes
                    </p>
                  </div>
                ) : uploading ? (
                  // Uploading state
                  <div className="border-2 border-dashed border-primary/50 rounded-lg p-8 text-center">
                    <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                    <p className="font-medium mt-3">Uploading to cloud...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please wait, this ensures your file is saved
                    </p>
                  </div>
                ) : (
                  // No file - show upload prompt
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      document.getElementById('file-upload')?.click();
                    }}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <UploadIcon className="h-12 w-12 text-muted-foreground" />
                      <p className="font-medium">Tap to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">
                        PDF files only, max 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                className="w-full"
                disabled={parsing || !pendingFile}
                onClick={handleSubmit}
              >
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing Syllabus...
                  </>
                ) : (
                  "Parse Syllabus"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
