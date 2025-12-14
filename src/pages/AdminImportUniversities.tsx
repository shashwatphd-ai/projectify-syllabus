import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportResult {
  success: boolean;
  totalReceived: number;
  totalTransformed: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
}

export default function AdminImportUniversities() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData(null);
    setImportResult(null);
    setIsParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      setParsedData(jsonData);
      toast.success(`Parsed ${jsonData.length} rows from ${selectedFile.name}`);
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse file. Please ensure it's a valid Excel file.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error("No data to import");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Split into chunks for progress tracking
      const CHUNK_SIZE = 1000;
      const chunks = [];
      for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
        chunks.push(parsedData.slice(i, i + CHUNK_SIZE));
      }

      let totalSuccess = 0;
      let totalError = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setProgress(Math.round(((i + 1) / chunks.length) * 100));

        const { data, error } = await supabase.functions.invoke("import-university-data", {
          body: { rows: chunk },
        });

        if (error) {
          console.error("Import chunk error:", error);
          allErrors.push(`Chunk ${i + 1}: ${error.message}`);
          totalError += chunk.length;
        } else if (data) {
          totalSuccess += data.successCount || 0;
          totalError += data.errorCount || 0;
          if (data.errors) {
            allErrors.push(...data.errors);
          }
        }
      }

      const result: ImportResult = {
        success: totalError === 0,
        totalReceived: parsedData.length,
        totalTransformed: totalSuccess + totalError,
        successCount: totalSuccess,
        errorCount: totalError,
        errors: allErrors.slice(0, 10),
      };

      setImportResult(result);

      if (totalError === 0) {
        toast.success(`Successfully imported ${totalSuccess} universities!`);
      } else {
        toast.warning(`Imported ${totalSuccess} universities with ${totalError} errors`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Import failed. Check console for details.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, [parsedData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/admin-hub")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Hub
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Import University Data
            </CardTitle>
            <CardDescription>
              Upload an Excel file with Apollo university data to populate the university_domains table.
              This will update existing records and add new ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Excel File</label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </div>

            {/* Parsing Status */}
            {isParsing && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Parsing file...</span>
              </div>
            )}

            {/* Preview */}
            {parsedData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{parsedData.length} rows</Badge>
                    <span className="text-sm text-muted-foreground">
                      Ready to import
                    </span>
                  </div>
                </div>

                {/* Sample Preview */}
                <div className="rounded-md border p-4 bg-muted/50">
                  <h4 className="text-sm font-medium mb-2">Sample Data (First 3 rows)</h4>
                  <div className="space-y-2 text-xs">
                    {parsedData.slice(0, 3).map((row, idx) => (
                      <div key={idx} className="flex gap-4">
                        <span className="font-medium min-w-[200px] truncate">
                          {String(row["Company Name"] || "N/A")}
                        </span>
                        <span className="text-muted-foreground truncate">
                          {String(row["Website"] || "N/A")}
                        </span>
                        <span className="text-muted-foreground">
                          {String(row["Company City"] || "")}, {String(row["Company State"] || "")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Import Button */}
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing... {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {parsedData.length} Universities
                    </>
                  )}
                </Button>

                {/* Progress */}
                {isProcessing && (
                  <Progress value={progress} className="h-2" />
                )}
              </div>
            )}

            {/* Results */}
            {importResult && (
              <Alert variant={importResult.errorCount === 0 ? "default" : "destructive"}>
                {importResult.errorCount === 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {importResult.errorCount === 0 ? "Import Complete" : "Import Completed with Errors"}
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Total rows received: {importResult.totalReceived}</p>
                    <p>Successfully imported: {importResult.successCount}</p>
                    {importResult.errorCount > 0 && (
                      <p className="text-destructive">Errors: {importResult.errorCount}</p>
                    )}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Error details:</p>
                        <ul className="list-disc list-inside">
                          {importResult.errors.map((err, idx) => (
                            <li key={idx} className="text-xs">{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
