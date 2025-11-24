import logo from "@/assets/logo-eduthree.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNewJobMatchCount } from "@/hooks/useNewJobMatchCount";
import { Building2, GraduationCap, LogOut, MenuIcon, Shield } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
export const Header = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isEmployer, isFaculty, signOut } = useAuth();
  const { data: newMatchCount } = useNewJobMatchCount();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to sign out");
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

          <div className="flex items-center gap-1">
            <Button onClick={() => navigate("/demand-board")} variant="ghost" size="sm">
              TalentRadar
            </Button>
            {user && (
              <div className="flex items-center gap-1">
                <div className="md:hidden">
                  <DropdownMenu
                    open={dropdownOpen}
                    onOpenChange={(open) => setDropdownOpen(open)}
                    modal
                  >
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MenuIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => navigate("/upload")}>Upload</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/projects")}>Projects</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-opportunities")}>Job Lines</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-competencies")}>My Skills</DropdownMenuItem>

                      {isFaculty && (
                        <DropdownMenuItem onClick={() => navigate("/instructor/dashboard")} >
                          <GraduationCap className="mr-2 h-4 w-4" />
                          Instructor Portal
                        </DropdownMenuItem>
                      )}
                      {isEmployer && (
                        <DropdownMenuItem onClick={() => navigate("/employer/dashboard")} >
                          <Building2 className="mr-2 h-4 w-4" />
                          Employer Portal
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => navigate("/admin-hub")}>
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Hub
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem onClick={handleSignOut}>
                        <Button variant="ghost" size="sm">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </Button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="hidden md:flex">
                  <Button onClick={() => navigate("/upload")} variant="ghost" size="sm">
                    Upload
                  </Button>
                  <Button onClick={() => navigate("/projects")} variant="ghost" size="sm">
                    Projects
                  </Button>
                  <Button onClick={() => navigate("/my-opportunities")} variant="ghost" size="sm" className="relative">
                    Job Lines
                    {newMatchCount && newMatchCount > 0 ? (
                      <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                        {newMatchCount}
                      </Badge>
                    ) : null}
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
                </div>
              </div>
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
