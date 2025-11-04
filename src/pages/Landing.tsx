import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Briefcase, Target, Menu, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                <span className="text-foreground">Edu</span>
                <span className="text-primary">Three</span>
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                How It Works
              </button>
              <Button onClick={() => navigate("/auth")} variant="default">
                Sign In
              </Button>
            </div>

            {/* Mobile Navigation */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-lg font-medium hover:text-primary transition-colors text-left"
                  >
                    How It Works
                  </button>
                  <Button onClick={() => navigate("/auth")} className="w-full">
                    Sign In
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-muted/20">
        <div className="container mx-auto px-4 py-24 md:py-40 relative">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <p className="text-2xl md:text-3xl font-medium text-muted-foreground">
              Learning. Applied.
            </p>
            <h1 className="text-5xl md:text-8xl font-bold text-foreground leading-tight">
              <span className="text-foreground">Edu</span>
              <span className="text-primary">Three</span>
              <span className="text-foreground">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto pt-4">
              Stay tuned for the revolution in applied learning!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-lg px-10"
              >
                SIGN UP
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

      {/* Education & Industry Connection */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Education and Industry aren't separate worlds.
                <br />
                They're parts of the same equation.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground font-medium">
                EduThree: Turning student potential into industry progress.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-8 py-8">
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                <div className="text-center">
                  <p className="text-lg font-semibold text-muted-foreground mb-4">Students</p>
                  <div className="w-32 h-16 md:w-40 md:h-20 rounded-full border-4 border-primary/40 bg-primary/5" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-muted-foreground mb-4">Industry</p>
                  <div className="w-32 h-16 md:w-40 md:h-20 rounded-full border-4 border-primary/40 bg-primary/5" />
                </div>
              </div>
              <div className="relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-px h-24 bg-primary/30" />
                <div className="text-center">
                  <div className="w-32 h-16 md:w-40 md:h-20 rounded-full border-4 border-primary bg-primary/10 flex items-center justify-center">
                    <Link2 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground mt-4">Faculty</p>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <h3 className="text-4xl md:text-6xl font-bold">
                <span className="text-foreground">Edu</span>
                <span className="text-primary">Three</span>
              </h3>
              <p className="text-2xl md:text-3xl text-primary font-semibold mt-6">Coming Soon!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Proof of Performance */}
      <section className="py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              You don't need more resumes.<br />
              You need proof of performance.
            </h2>
            <p className="text-xl md:text-2xl text-primary font-medium">
              Real projects. Real skills. Real impact. That's what defines industry-ready talent.
            </p>
            <div className="pt-8">
              <h3 className="text-4xl md:text-7xl font-bold">
                <span className="text-foreground">Edu</span>
                <span className="text-primary">Three</span>
              </h3>
              <p className="text-2xl md:text-4xl font-bold text-foreground mt-8 uppercase tracking-wider">COMING SOON!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Capability vs GPA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              You know their GPA.<br />
              But do you know their capability?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Tomorrow's learners are defined by capability, not grades. True learning applies classroom knowledge to real-world challenges.
            </p>
            <p className="text-xl md:text-2xl text-primary font-medium italic max-w-3xl mx-auto">
              Unlock true potential: Discover how to turn learning into undeniable proof of capability.
            </p>
            <div className="pt-8">
              <h3 className="text-4xl md:text-6xl font-bold">
                <span className="text-foreground">Edu</span>
                <span className="text-primary">Three</span>
              </h3>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-8 uppercase tracking-wider">COMING SOON!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Ready */}
      <section className="py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Is your student industry-ready?<br />
              Or just course-complete?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Grades measure learning. Industry measures readiness. Somewhere between the two lies the future of education.
            </p>
            <div className="pt-8 flex justify-center items-center gap-8">
              <div className="text-3xl md:text-5xl font-bold">
                <span className="text-foreground">Edu</span>
                <span className="text-primary">Three</span>
              </div>
              <div className="text-right">
                <p className="text-2xl md:text-4xl font-bold text-foreground uppercase tracking-wider">COMING</p>
                <p className="text-2xl md:text-4xl font-bold text-foreground uppercase tracking-wider">SOON!</p>
              </div>
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
