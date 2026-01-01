import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { RealtimeNotificationListener } from "@/components/notifications/RealtimeNotificationListener";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy-loaded route components for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Upload = lazy(() => import("./pages/Upload"));
const ReviewSyllabus = lazy(() => import("./pages/ReviewSyllabus"));
const Configure = lazy(() => import("./pages/Configure"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const DemandBoard = lazy(() => import("./pages/DemandBoard"));
const AdminHub = lazy(() => import("./pages/AdminHub"));
const AdminMetrics = lazy(() => import("./pages/AdminMetrics"));
const AdminImportUniversities = lazy(() => import("./pages/AdminImportUniversities"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const MyOpportunities = lazy(() => import("./pages/MyOpportunities"));
const MyCompetencies = lazy(() => import("./pages/MyCompetencies"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Optimized React Query configuration for reduced API calls and better UX
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 2 minutes - prevents immediate refetches
      staleTime: 1000 * 60 * 2,
      // Keep unused data in cache for 5 minutes
      gcTime: 1000 * 60 * 5,
      // Retry failed requests up to 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus by default (reduces API pressure)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <RealtimeNotificationListener />
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Protected Routes - Require Authentication */}
                  <Route path="/upload" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Upload />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/review-syllabus" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <ReviewSyllabus />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/configure" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Configure />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/projects" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Projects />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/projects/:id" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <ProjectDetail />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  {/* Protected Route - Requires Authentication */}
                  <Route path="/demand-board" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <DemandBoard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  {/* Unified Dashboard Route */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Dashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin Only Routes */}
                  <Route path="/admin-hub" element={
                    <ProtectedRoute requiredRole="admin">
                      <ErrorBoundary>
                        <AdminHub />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin-hub/metrics" element={
                    <ProtectedRoute requiredRole="admin">
                      <ErrorBoundary>
                        <AdminMetrics />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin-hub/roles" element={
                    <ProtectedRoute requiredRole="admin">
                      <ErrorBoundary>
                        <RoleManagement />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin-hub/import-universities" element={
                    <ProtectedRoute requiredRole="admin">
                      <ErrorBoundary>
                        <AdminImportUniversities />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  {/* Student Routes */}
                  <Route path="/my-opportunities" element={
                    <ProtectedRoute requiredRole="student">
                      <ErrorBoundary>
                        <MyOpportunities />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/my-competencies" element={
                    <ProtectedRoute requiredRole="student">
                      <ErrorBoundary>
                        <MyCompetencies />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  {/* Employer Routes */}
                  <Route path="/employer/dashboard" element={
                    <ProtectedRoute requiredRole="employer">
                      <ErrorBoundary>
                        <EmployerDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  {/* Faculty Routes */}
                  <Route path="/instructor/dashboard" element={
                    <ProtectedRoute requiredRole="faculty">
                      <ErrorBoundary>
                        <InstructorDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
