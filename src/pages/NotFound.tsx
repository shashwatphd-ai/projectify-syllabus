import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <div className="space-y-2">
            <p className="text-2xl font-semibold text-muted-foreground">Page not found</p>
            <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => navigate("/")} size="lg">
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
