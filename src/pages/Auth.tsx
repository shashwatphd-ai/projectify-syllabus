import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { authService } from "@/lib/supabase";
import { Header } from "@/components/Header";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [selectedRole, setSelectedRole] = useState("student");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Role-specific email validation
    if ((selectedRole === "student" || selectedRole === "faculty") && !email.endsWith(".edu")) {
      toast.error("Students and Faculty must use a .edu email address");
      return;
    }
    
    if (selectedRole === "employer" && email.endsWith(".edu")) {
      toast.error("Employers should use a company email address, not .edu");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await authService.signUp(email, password, {
          data: {
            chosen_role: selectedRole
          }
        });
        if (error) throw error;
        
        if (selectedRole === "student") {
          toast.success("Account created as student! Redirecting...");
        } else if (selectedRole === "faculty") {
          toast.success("Account created! Your faculty access is pending approval. You can use the site as a student for now.");
        } else if (selectedRole === "employer") {
          toast.success("Account created! Please complete your company profile to request access.");
        }
        navigate("/upload");
      } else {
        const { error } = await authService.signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/upload");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-[var(--shadow-card)]">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
            <CardDescription>
              {isSignUp ? "Sign up with your .edu email to get started" : "Sign in to continue"}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="space-y-3">
                <Label>I am a:</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={selectedRole === "student"}
                      onChange={() => setSelectedRole("student")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Student</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="faculty"
                      checked={selectedRole === "faculty"}
                      onChange={() => setSelectedRole("faculty")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Faculty</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="employer"
                      checked={selectedRole === "employer"}
                      onChange={() => setSelectedRole("employer")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Employer</span>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder={selectedRole === "employer" ? "you@company.com" : "you@university.edu"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                {selectedRole === "employer" 
                  ? "Must be a company email address" 
                  : "Must be a valid .edu email address"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {isSignUp && selectedRole === "faculty" && (
              <p className="text-sm text-muted-foreground">
                Faculty accounts require admin approval. You'll have student access until approved.
              </p>
            )}
            
            {isSignUp && selectedRole === "employer" && (
              <p className="text-sm text-muted-foreground">
                Employer accounts require verification. Complete your company profile after signup.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline"
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;
