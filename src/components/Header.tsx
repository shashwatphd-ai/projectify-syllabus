import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import logo from "@/assets/logo-eduthree.jpg";

export const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
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
              Marketplace
            </Button>
            {user && (
              <>
                <Button onClick={() => navigate("/upload")} variant="ghost" size="sm">
                  Upload
                </Button>
                <Button onClick={() => navigate("/projects")} variant="ghost" size="sm">
                  Projects
                </Button>
                <Button onClick={() => navigate("/my-opportunities")} variant="ghost" size="sm">
                  My Opportunities
                </Button>
                <Button onClick={() => navigate("/my-competencies")} variant="ghost" size="sm">
                  My Skills
                </Button>
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