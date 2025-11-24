import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, TestTube, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Header } from "@/components/Header";

interface TestResult {
  success: boolean;
  provider: string;
  companies: number;
  processingTime: number;
  diagnostics?: any;
  error?: string;
  rawResponse?: any;
}

const AdminProviderTest = () => {
  const [location, setLocation] = useState("Kansas City, Missouri");
  const [keywords, setKeywords] = useState("engineering, manufacturing");
  const [apolloTesting, setApolloTesting] = useState(false);
  const [adzunaTesting, setAdzunaTesting] = useState(false);
  const [apolloResult, setApolloResult] = useState<TestResult | null>(null);
  const [adzunaResult, setAdzunaResult] = useState<TestResult | null>(null);

  const testApolloDirectly = async () => {
    setApolloTesting(true);
    setApolloResult(null);

    const startTime = Date.now();

    try {
      // This would need a dedicated admin endpoint that calls Apollo directly
      // For now, we'll create a test endpoint
      const response = await fetch('/api/test-apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          keywords: keywords.split(',').map(k => k.trim()),
          perPage: 10
        })
      });

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      if (data.success) {
        setApolloResult({
          success: true,
          provider: 'Apollo.io',
          companies: data.companies?.length || 0,
          processingTime,
          rawResponse: data,
          diagnostics: {
            totalEntries: data.pagination?.total_entries,
            httpStatus: response.status,
            locationUsed: location,
            keywordsUsed: keywords
          }
        });
        toast.success(`Apollo test successful: ${data.companies?.length || 0} companies found`);
      } else {
        throw new Error(data.error || 'Apollo test failed');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      setApolloResult({
        success: false,
        provider: 'Apollo.io',
        companies: 0,
        processingTime,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error(`Apollo test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApolloTesting(false);
    }
  };

  const testAdzunaDirectly = async () => {
    setAdzunaTesting(true);
    setAdzunaResult(null);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/test-adzuna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          keywords: keywords.split(',').map(k => k.trim())
        })
      });

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      if (data.success) {
        setAdzunaResult({
          success: true,
          provider: 'Adzuna',
          companies: data.companies?.length || 0,
          processingTime,
          rawResponse: data,
          diagnostics: {
            totalJobs: data.jobCount,
            httpStatus: response.status,
            locationUsed: location,
            keywordsUsed: keywords
          }
        });
        toast.success(`Adzuna test successful: ${data.companies?.length || 0} companies found`);
      } else {
        throw new Error(data.error || 'Adzuna test failed');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      setAdzunaResult({
        success: false,
        provider: 'Adzuna',
        companies: 0,
        processingTime,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error(`Adzuna test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAdzunaTesting(false);
    }
  };

  const renderResult = (result: TestResult | null, testing: boolean) => {
    if (testing) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Testing provider...</span>
        </div>
      );
    }

    if (!result) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No test has been run yet. Click "Test Provider" to begin.
          </AlertDescription>
        </Alert>
      );
    }

    const StatusIcon = result.success ? CheckCircle : XCircle;
    const statusColor = result.success ? 'text-green-600' : 'text-red-600';

    return (
      <div className="space-y-4">
        <Alert className={result.success ? 'border-green-600' : 'border-red-600'}>
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          <AlertDescription>
            <strong>{result.success ? 'Success' : 'Failed'}:</strong>{' '}
            {result.success
              ? `Found ${result.companies} companies in ${result.processingTime}ms`
              : result.error}
          </AlertDescription>
        </Alert>

        {result.diagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Diagnostics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(result.diagnostics).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-mono">{JSON.stringify(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {result.rawResponse && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Raw Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-x-auto bg-muted p-4 rounded">
                {JSON.stringify(result.rawResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <TestTube className="h-8 w-8 text-primary" />
            Provider Test Console
          </h1>
          <p className="text-muted-foreground">
            Test Apollo.io and Adzuna providers directly with custom parameters
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
            <CardDescription>
              Configure location and keywords to test provider responses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Kansas City, Missouri"
              />
              <p className="text-sm text-muted-foreground">
                Use 2-part format: "City, State" (NOT 3-part with country)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="engineering, manufacturing, automation"
              />
              <p className="text-sm text-muted-foreground">
                Simple, generic keywords work best with Apollo
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="apollo" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apollo">Apollo.io</TabsTrigger>
            <TabsTrigger value="adzuna">Adzuna</TabsTrigger>
          </TabsList>

          <TabsContent value="apollo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Apollo.io Direct Test</CardTitle>
                <CardDescription>
                  Test Apollo's `/mixed_companies/search` endpoint directly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={testApolloDirectly}
                  disabled={apolloTesting || !location}
                  className="w-full"
                >
                  {apolloTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing Apollo...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Apollo Provider
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {renderResult(apolloResult, apolloTesting)}
          </TabsContent>

          <TabsContent value="adzuna" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adzuna Direct Test</CardTitle>
                <CardDescription>
                  Test Adzuna's job search API for company discovery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={testAdzunaDirectly}
                  disabled={adzunaTesting || !location}
                  className="w-full"
                >
                  {adzunaTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing Adzuna...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Adzuna Provider
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {renderResult(adzunaResult, adzunaTesting)}
          </TabsContent>
        </Tabs>

        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> This console requires admin privileges. The test endpoints
            (`/api/test-apollo` and `/api/test-adzuna`) need to be implemented as Edge Functions
            that directly call the provider APIs with the same credentials used in production.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default AdminProviderTest;
