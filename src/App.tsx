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
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import ReviewSyllabus from "./pages/ReviewSyllabus";
import Configure from "./pages/Configure";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import DemandBoard from "./pages/DemandBoard";
import AdminHub from "./pages/AdminHub";
import AdminMetrics from "./pages/AdminMetrics";
import AdminImportUniversities from "./pages/AdminImportUniversities";
import RoleManagement from "./pages/RoleManagement";
import MyOpportunities from "./pages/MyOpportunities";
import MyCompetencies from "./pages/MyCompetencies";
import EmployerDashboard from "./pages/EmployerDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            </ErrorBoundary>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
