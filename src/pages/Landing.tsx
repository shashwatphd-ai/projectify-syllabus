import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import logo from "@/assets/logo-eduthree.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-muted/20">
        <div className="container mx-auto px-4 py-24 md:py-40 relative">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <p className="text-2xl md:text-3xl font-medium text-muted-foreground">
              Learning. Applied.
            </p>
            <div className="flex justify-center">
              <img src={logo} alt="EduThree" className="h-20 md:h-32 max-w-full" />
            </div>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto pt-4">
              Stay tuned for the revolution in applied learning!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth?mode=signup")}
                className="text-lg px-10"
              >
                SIGN UP
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth?mode=signin")}
                className="text-lg px-10"
              >
                SIGN IN
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 justify-center pt-6 text-sm md:text-base text-muted-foreground uppercase tracking-wider">
              <span>STUDENT</span>
              <span>FACULTY</span>
              <span>INDUSTRY</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              From syllabus to project brief in minutes
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {[
              { step: 1, title: "Sign in with .edu email", desc: "Faculty and students authenticate with verified academic credentials" },
              { step: 2, title: "Upload your syllabus", desc: "PDF parsing extracts weeks, hours, learning outcomes, and artifacts" },
              { step: 3, title: "Customize preferences", desc: "Select industries, specify companies, set number of teams" },
              { step: 4, title: "Generate projects", desc: "AI creates personalized project briefs mapped to learning outcomes" },
              { step: 5, title: "Review & refine", desc: "View forms, milestones, pricing, and gather student/faculty feedback" }
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-6 items-start bg-card p-6 rounded-lg border border-border">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {step}
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">{title}</h4>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Transform Learning?</h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join the revolution in applied learning
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="text-lg px-10"
          >
            Get Started
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;