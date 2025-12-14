import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { RealtimeNotificationListener } from "@/components/notifications/RealtimeNotificationListener";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes - Require Authentication */}
            <Route path="/upload" element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            } />
            <Route path="/review-syllabus" element={
              <ProtectedRoute>
                <ReviewSyllabus />
              </ProtectedRoute>
            } />
            <Route path="/configure" element={
              <ProtectedRoute>
                <Configure />
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            } />
            
            {/* Public Route */}
            <Route path="/demand-board" element={<DemandBoard />} />
            
            {/* Unified Dashboard Route */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Admin Only Routes */}
            <Route path="/admin-hub" element={
              <ProtectedRoute requiredRole="admin">
                <AdminHub />
              </ProtectedRoute>
            } />
            <Route path="/admin-hub/metrics" element={
              <ProtectedRoute requiredRole="admin">
                <AdminMetrics />
              </ProtectedRoute>
            } />
            <Route path="/admin-hub/roles" element={
              <ProtectedRoute requiredRole="admin">
                <RoleManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin-hub/import-universities" element={
              <ProtectedRoute requiredRole="admin">
                <AdminImportUniversities />
              </ProtectedRoute>
            } />
            
            {/* Student Routes */}
            <Route path="/my-opportunities" element={
              <ProtectedRoute requiredRole="student">
                <MyOpportunities />
              </ProtectedRoute>
            } />
            <Route path="/my-competencies" element={
              <ProtectedRoute requiredRole="student">
                <MyCompetencies />
              </ProtectedRoute>
            } />
            
            {/* Employer Routes */}
            <Route path="/employer/dashboard" element={
              <ProtectedRoute requiredRole="employer">
                <EmployerDashboard />
              </ProtectedRoute>
            } />
            
            {/* Faculty Routes */}
            <Route path="/instructor/dashboard" element={
              <ProtectedRoute requiredRole="faculty">
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
