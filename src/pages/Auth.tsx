import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/supabase";
import { signUpSchema, signInSchema, resetPasswordSchema } from "@/lib/validation-schemas";
import { GraduationCap, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(mode !== "signin");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"student" | "faculty" | "employer">("student");
  const navigate = useNavigate();
  
  useEffect(() => {
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Password reset flow
    if (isForgotPassword) {
      const validation = resetPasswordSchema.safeParse({ email: email.trim() });
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "Invalid email");
        return;
      }

      setLoading(true);
      try {
        const { error } = await authService.resetPassword(validation.data.email);
        if (error) throw error;
        toast.success("Password reset email sent! Check your inbox.");
        setIsForgotPassword(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign up validation
    if (isSignUp) {
      const validation = signUpSchema.safeParse({ 
        email: email.trim(), 
        password, 
        role: selectedRole 
      });
      
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "Invalid input");
        return;
      }
    } else {
      // Sign in validation
      const validation = signInSchema.safeParse({ 
        email: email.trim(), 
        password 
      });
      
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "Invalid input");
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await authService.signUp(email.trim(), password, {
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
      } else {
        const { error } = await authService.signIn(email.trim(), password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/upload");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const check = async () => {
    const u = await authService.getCurrentUser();
    if (u.data.user !== null) {
      navigate("/upload");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-[var(--shadow-card)]">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? "Enter your email to receive a password reset link"
                : isSignUp
                  ? "Sign up with your university email to get started"
                  : "Sign in to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && !isForgotPassword && (
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
                    : "Any accredited university email worldwide (.edu, .ac.uk, .edu.au, etc.)"}
                </p>
              </div>

              {!isForgotPassword && (
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
              )}

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
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isForgotPassword ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
              </Button>

              {!isSignUp && !isForgotPassword && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                {isForgotPassword ? (
                  <>
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </>
                ) : isSignUp ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
