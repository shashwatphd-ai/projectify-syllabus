import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "faculty" | "employer" | "student";
  requireAuth?: boolean;
  fallbackPath?: string;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  requireAuth = true,
  fallbackPath = "/auth?mode=signin",
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isFaculty, isEmployer, isStudent, roles } = useAuth();
  const navigate = useNavigate();

  // Wait for roles to load when a role is required
  const isStillLoading = loading || (requiredRole && user && roles.length === 0);

  useEffect(() => {
    // Wait for auth and roles to load
    if (isStillLoading) return;

    // Check authentication requirement
    if (requireAuth && !user) {
      toast.error("Please sign in to access this page");
      navigate(fallbackPath);
      return;
    }

    // Check role requirement
    if (requiredRole && user) {
      let hasRequiredRole = false;

      switch (requiredRole) {
        case "admin":
          hasRequiredRole = isAdmin;
          break;
        case "faculty":
          hasRequiredRole = isFaculty;
          break;
        case "employer":
          hasRequiredRole = isEmployer;
          break;
        case "student":
          hasRequiredRole = isStudent;
          break;
      }

      if (!hasRequiredRole) {
        toast.error(`Access denied. ${requiredRole} privileges required.`);
        navigate("/projects");
        return;
      }
    }
  }, [user, loading, requiredRole, requireAuth, isAdmin, isFaculty, isEmployer, isStudent, navigate, fallbackPath]);

  // Show loader while checking auth or loading roles
  if (isStillLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth check fails, don't render children (redirect will happen)
  if (requireAuth && !user) {
    return null;
  }

  // If role check fails, don't render children (redirect will happen)
  if (requiredRole && user) {
    let hasRequiredRole = false;

    switch (requiredRole) {
      case "admin":
        hasRequiredRole = isAdmin;
        break;
      case "faculty":
        hasRequiredRole = isFaculty;
        break;
      case "employer":
        hasRequiredRole = isEmployer;
        break;
      case "student":
        hasRequiredRole = isStudent;
        break;
    }

    if (!hasRequiredRole) {
      return null;
    }
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};
