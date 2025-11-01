import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload as UploadIcon, FileText, Loader2 } from "lucide-react";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [cityZip, setCityZip] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    
    if (!file) {
      toast.error("Please select a syllabus file");
      return;
    }

    setLoading(true);

    // TODO: Implement actual file upload and parsing with Lovable Cloud
    setTimeout(() => {
      toast.success("Syllabus parsed successfully!");
      navigate("/configure");
      setLoading(false);
    }, 2000);
  };

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
                <Input
                  id="cityZip"
                  placeholder="Kansas City, MO 64110"
                  value={cityZip}
                  onChange={(e) => setCityZip(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  For location-based project matching
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
