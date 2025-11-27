import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import StudentDashboard from "./StudentDashboard";
import InstructorDashboard from "./InstructorDashboard";
import EmployerDashboard from "./EmployerDashboard";
import AdminMetrics from "./AdminMetrics";

export default function Dashboard() {
  const { user, loading, isAdmin, isFaculty, isEmployer, isStudent } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Priority order: Admin > Faculty > Employer > Student
  if (isAdmin) {
    return <AdminMetrics />;
  }

  if (isFaculty) {
    return <InstructorDashboard />;
  }

  if (isEmployer) {
    return <EmployerDashboard />;
  }

  if (isStudent) {
    return <StudentDashboard />;
  }

  // Fallback for users without roles
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome to EduThree</h1>
        <p className="text-muted-foreground">
          Your account is being set up. Please contact an administrator if this persists.
        </p>
      </div>
    </div>
  );
}
