import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield, Building2, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNewJobMatchCount } from "@/hooks/useNewJobMatchCount";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import logo from "@/assets/logo-eduthree.jpg";

export const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployer, setIsEmployer] = useState(false);
  const [isFaculty, setIsFaculty] = useState(false);
  const { data: newMatchCount } = useNewJobMatchCount();

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      checkEmployerStatus();
      checkFacultyStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Admin check error:', error);
    }
  };

  const checkEmployerStatus = async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'employer')
        .maybeSingle();
      
      setIsEmployer(!!data);
    } catch (error) {
      console.error('Employer check error:', error);
    }
  };

  const checkFacultyStatus = async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .in('role', ['faculty', 'admin'])
        .maybeSingle();
      
      setIsFaculty(!!data);
    } catch (error) {
      console.error('Faculty check error:', error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await authService.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="EduThree" className="h-8 md:h-10" />
          </button>
          
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/demand-board")} variant="ghost" size="sm">
              TalentRadar
            </Button>
            {user && (
              <>
                <Button onClick={() => navigate("/upload")} variant="ghost" size="sm">
                  Upload
                </Button>
                <Button onClick={() => navigate("/projects")} variant="ghost" size="sm">
                  Projects
                </Button>
                <Button onClick={() => navigate("/my-opportunities")} variant="ghost" size="sm" className="relative">
                  JobLines
                  {newMatchCount && newMatchCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                      {newMatchCount}
                    </Badge>
                  )}
                </Button>
                <Button onClick={() => navigate("/my-competencies")} variant="ghost" size="sm">
                  My Skills
                </Button>
                {isFaculty && (
                  <Button onClick={() => navigate("/instructor/dashboard")} variant="ghost" size="sm">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Instructor Portal
                  </Button>
                )}
                {isEmployer && (
                  <Button onClick={() => navigate("/employer/dashboard")} variant="ghost" size="sm">
                    <Building2 className="mr-2 h-4 w-4" />
                    Employer Portal
                  </Button>
                )}
                {isAdmin && (
                  <Button onClick={() => navigate("/admin-hub")} variant="ghost" size="sm">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Hub
                  </Button>
                )}
                <Button onClick={handleSignOut} variant="ghost" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            )}
            {!user && (
              <Button onClick={() => navigate("/auth")} variant="default" size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};