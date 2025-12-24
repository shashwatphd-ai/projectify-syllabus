// MatchInsightsCard - Student-focused "Why This Match?" component
// Single Responsibility: Explain match relevance to students

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  Briefcase, 
  CheckCircle2,
  ExternalLink,
  TrendingUp
} from "lucide-react";
import { SignalData, JobPosting, parseSignalData, parseJobPostings } from "./types";
import { Button } from "@/components/ui/button";

interface MatchInsightsCardProps {
  companyName: string;
  signalData?: unknown;
  jobPostings?: unknown;
  matchingSkills?: unknown;
  skillMatchScore?: number | null;
}

export function MatchInsightsCard({
  companyName,
  signalData,
  jobPostings,
  matchingSkills,
  skillMatchScore
}: MatchInsightsCardProps) {
  const signals = parseSignalData(signalData);
  const jobs = parseJobPostings(jobPostings);
  const skills = Array.isArray(matchingSkills) 
    ? matchingSkills 
    : typeof matchingSkills === 'string' 
      ? JSON.parse(matchingSkills) 
      : [];

  const hasInsights = (skillMatchScore && skillMatchScore > 0) || jobs.length > 0 || skills.length > 0;

  if (!hasInsights) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-primary" />
          Why This Match?
        </CardTitle>
        <CardDescription>
          How {companyName} aligns with your learning goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Skill Alignment */}
        {skillMatchScore && skillMatchScore > 0 && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                {skillMatchScore >= 60 ? 'Strong' : skillMatchScore >= 30 ? 'Good' : 'Some'} Skill Alignment
              </p>
              <p className="text-xs text-muted-foreground">
                {skillMatchScore.toFixed(0)}% match with course skills
              </p>
            </div>
          </div>
        )}

        {/* Matching Skills */}
        {skills.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm mb-2">Skills You'll Apply</p>
              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 6).map((skill: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {skills.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{skills.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Job Postings */}
        {jobs.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Briefcase className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm mb-2">
                {jobs.length} Active Job {jobs.length === 1 ? 'Posting' : 'Postings'}
              </p>
              <div className="space-y-1">
                {jobs.slice(0, 3).map((job, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground truncate flex-1">
                      {job.title}
                    </span>
                    {job.url && (
                      <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
                {jobs.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{jobs.length - 3} more positions
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
