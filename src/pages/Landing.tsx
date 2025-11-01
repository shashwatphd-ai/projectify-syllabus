import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Briefcase, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Transform Your <span className="text-primary">Syllabus</span> Into
              <br />
              Real-World <span className="text-secondary">Projects</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your course syllabus and instantly generate personalized, industry-aligned consulting projects
              with complete briefs, pricing, and learning outcome coverage.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-lg px-8"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/about")}
                className="text-lg px-8"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card rounded-xl p-8 shadow-[var(--shadow-card)] space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Syllabus Analysis</h3>
              <p className="text-muted-foreground">
                Upload your PDF syllabus and our AI extracts learning outcomes, course structure, and key artifacts automatically.
              </p>
            </div>

            <div className="bg-card rounded-xl p-8 shadow-[var(--shadow-card)] space-y-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">Smart Matching</h3>
              <p className="text-muted-foreground">
                Projects are generated to align with your learning outcomes, ensuring students practice what they're meant to learn.
              </p>
            </div>

            <div className="bg-card rounded-xl p-8 shadow-[var(--shadow-card)] space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Complete Briefs</h3>
              <p className="text-muted-foreground">
                Get detailed project scopes, milestones, pricing, and all six standardized forms ready for industry partners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
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
      <section className="py-20 bg-[var(--gradient-hero)] text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Course?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join faculty creating real-world learning experiences
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="text-lg px-8"
          >
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
