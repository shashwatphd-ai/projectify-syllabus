import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import MyOpportunities from "./pages/MyOpportunities";
import MyCompetencies from "./pages/MyCompetencies";
import EmployerDashboard from "./pages/EmployerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/review-syllabus" element={<ReviewSyllabus />} />
          <Route path="/configure" element={<Configure />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/demand-board" element={<DemandBoard />} />
          <Route path="/admin-hub" element={<AdminHub />} />
          <Route path="/admin-hub/metrics" element={<AdminMetrics />} />
          <Route path="/my-opportunities" element={<MyOpportunities />} />
          <Route path="/my-competencies" element={<MyCompetencies />} />
          <Route path="/employer/dashboard" element={<EmployerDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
