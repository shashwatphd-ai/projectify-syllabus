import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Navigation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
            <span className="text-2xl font-bold">
              <span className="text-foreground">Edu</span>
              <span className="text-primary">Three</span>
            </span>
          </button>
          
          <div className="flex items-center gap-4">
            {user && (
              <>
                <Button onClick={() => navigate("/upload")} variant="ghost" size="sm">
                  Upload
                </Button>
                <Button onClick={() => navigate("/projects")} variant="ghost" size="sm">
                  Projects
                </Button>
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