import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Shield,
  Rocket,
  Building2,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  runAllCriticalPathTests,
  runAuthFlowTests,
  runProjectGenerationTests,
  runCompanyDiscoveryTests,
  type TestSuite,
  type ValidationResult
} from "@/lib/testing/critical-path-validators";

const AdminTestDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTest, setRunningTest] = useState<string | null>(null);

  const runAllTests = async () => {
    setIsRunning(true);
    setRunningTest("all");
    setTestResults([]);
    
    try {
      const results = await runAllCriticalPathTests();
      setTestResults(results);
      
      const totalPassed = results.reduce((sum, suite) => sum + suite.passed, 0);
      const totalTests = results.reduce((sum, suite) => sum + suite.results.length, 0);
      
      if (totalPassed === totalTests) {
        toast.success(`All ${totalTests} tests passed!`);
      } else {
        toast.warning(`${totalPassed}/${totalTests} tests passed`);
      }
    } catch (error) {
      console.error("Test execution error:", error);
      toast.error("Test execution failed");
    } finally {
      setIsRunning(false);
      setRunningTest(null);
    }
  };

  const runSingleSuite = async (suiteName: string, runner: () => Promise<TestSuite>) => {
    setIsRunning(true);
    setRunningTest(suiteName);
    
    try {
      const suite = await runner();
      
      // Update or add suite results
      setTestResults(prev => {
        const existing = prev.findIndex(s => s.name === suiteName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = suite;
          return updated;
        }
        return [...prev, suite];
      });
      
      if (suite.failed === 0) {
        toast.success(`${suiteName}: All ${suite.results.length} tests passed!`);
      } else {
        toast.warning(`${suiteName}: ${suite.passed}/${suite.results.length} tests passed`);
      }
    } catch (error) {
      console.error(`${suiteName} test error:`, error);
      toast.error(`${suiteName} test failed`);
    } finally {
      setIsRunning(false);
      setRunningTest(null);
    }
  };

  const getSuiteIcon = (name: string) => {
    if (name.includes("Auth")) return <Shield className="h-5 w-5" />;
    if (name.includes("Generation")) return <Rocket className="h-5 w-5" />;
    if (name.includes("Discovery")) return <Building2 className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const getSuiteStatus = (suite: TestSuite) => {
    if (suite.failed === 0) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">PASSED</Badge>;
    }
    if (suite.passed === 0) {
      return <Badge variant="destructive">FAILED</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">PARTIAL</Badge>;
  };

  const getOverallStats = () => {
    const totalPassed = testResults.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = testResults.reduce((sum, suite) => sum + suite.failed, 0);
    const totalTests = totalPassed + totalFailed;
    const totalDuration = testResults.reduce((sum, suite) => sum + suite.totalDuration, 0);
    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    return { totalPassed, totalFailed, totalTests, totalDuration, passRate };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = getOverallStats();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-hub')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Critical Path Test Dashboard</h1>
            <p className="text-muted-foreground">
              Module 5 - Runtime validation for auth, generation, and discovery flows
            </p>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            size="lg"
            className="gap-2"
          >
            {isRunning && runningTest === "all" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {/* Overall Stats */}
        {testResults.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Test Summary</span>
                {stats.passRate === 100 ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-lg px-4 py-1">
                    ALL PASSED
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {stats.totalPassed}/{stats.totalTests} Passed
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={stats.passRate} className="h-3" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.totalPassed}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalDuration.toFixed(0)}ms</div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Suites */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Auth Flow Tests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Auth Flow (5.1.1)</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => runSingleSuite("Auth Flow (5.1.1)", runAuthFlowTests)}
                  disabled={isRunning}
                >
                  {isRunning && runningTest === "Auth Flow (5.1.1)" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Session management, RLS enforcement, role validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestResultsList 
                results={testResults.find(s => s.name === "Auth Flow (5.1.1)")?.results || []}
              />
            </CardContent>
          </Card>

          {/* Project Generation Tests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Generation (5.1.2)</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => runSingleSuite("Project Generation (5.1.2)", runProjectGenerationTests)}
                  disabled={isRunning}
                >
                  {isRunning && runningTest === "Project Generation (5.1.2)" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Generation runs, queue, and projects table access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestResultsList 
                results={testResults.find(s => s.name === "Project Generation (5.1.2)")?.results || []}
              />
            </CardContent>
          </Card>

          {/* Company Discovery Tests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Discovery (5.1.3)</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => runSingleSuite("Company Discovery (5.1.3)", runCompanyDiscoveryTests)}
                  disabled={isRunning}
                >
                  {isRunning && runningTest === "Company Discovery (5.1.3)" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Company profiles and course profiles access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestResultsList 
                results={testResults.find(s => s.name === "Company Discovery (5.1.3)")?.results || []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
              <CardDescription>
                Full breakdown of all test executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {testResults.map((suite, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getSuiteIcon(suite.name)}
                          <h3 className="font-semibold">{suite.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSuiteStatus(suite)}
                          <span className="text-sm text-muted-foreground">
                            ({suite.passed}/{suite.results.length}) • {suite.totalDuration.toFixed(1)}ms
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 pl-7">
                        {suite.results.map((result, ridx) => (
                          <div 
                            key={ridx}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              result.passed 
                                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {result.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">{result.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              {result.details && (
                                <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                  {JSON.stringify(result.details)}
                                </span>
                              )}
                              {result.error && (
                                <span className="text-xs text-red-600 max-w-[200px] truncate">
                                  {result.error}
                                </span>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {result.duration.toFixed(1)}ms
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {idx < testResults.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {testResults.length === 0 && !isRunning && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No Tests Run Yet</h3>
                  <p className="text-muted-foreground">
                    Click "Run All Tests" or run individual test suites to validate critical paths
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Component for displaying test results list
const TestResultsList = ({ results }: { results: ValidationResult[] }) => {
  if (results.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Not run yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((result, idx) => (
        <div key={idx} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={result.passed ? "" : "text-red-600"}>{result.name}</span>
          </div>
          <span className="text-muted-foreground">{result.duration.toFixed(0)}ms</span>
        </div>
      ))}
    </div>
  );
};

export default AdminTestDashboard;
