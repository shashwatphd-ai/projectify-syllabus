import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Target, DollarSign, Calendar, Users, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProjectDetailProject } from "@/types/project-detail";

const getMatchQuality = (similarity: number) => {
  if (similarity >= 0.85) return { grade: 'A+', label: 'EXCELLENT MATCH', color: 'hsl(var(--quality-excellent))' };
  if (similarity >= 0.80) return { grade: 'A', label: 'GREAT MATCH', color: 'hsl(var(--quality-excellent))' };
  if (similarity >= 0.75) return { grade: 'B+', label: 'GOOD MATCH', color: 'hsl(var(--quality-good))' };
  if (similarity >= 0.70) return { grade: 'B', label: 'FAIR MATCH', color: 'hsl(var(--quality-good))' };
  return { grade: 'C', label: 'WEAK MATCH', color: 'hsl(var(--quality-poor))' };
};

interface ProjectHeaderProps {
  project: ProjectDetailProject & { similarity_score?: number; pricing_usd: number };
  courseIdFilter?: string;
}

export const ProjectHeader = ({ project, courseIdFilter }: ProjectHeaderProps) => {
  const navigate = useNavigate();
  
  const handleBackClick = () => {
    const courseId = courseIdFilter || project.course_id;
    if (courseId) {
      navigate(`/projects?course=${courseId}`, { state: { courseId } });
    } else {
      navigate('/projects');
    }
  };
  
  return (
    <div className="mb-8">
      <Button
        variant="ghost"
        onClick={handleBackClick}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {project.company_name}
          </p>
        </div>

        <div className="flex gap-3 items-start">
          {/* Match Quality Badge */}
          {project.similarity_score && (
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="outline"
                className="text-base px-3 py-1 font-semibold border-2"
                style={{
                  backgroundColor: `${getMatchQuality(project.similarity_score).color}15`,
                  color: getMatchQuality(project.similarity_score).color,
                  borderColor: getMatchQuality(project.similarity_score).color
                }}
              >
                {getMatchQuality(project.similarity_score).grade}
              </Badge>
              <span className="text-xs font-medium" style={{ color: getMatchQuality(project.similarity_score).color }}>
                {getMatchQuality(project.similarity_score).label}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(project.similarity_score * 100)}% Similarity
              </span>
            </div>
          )}

          <Badge variant="secondary" className="text-lg px-4 py-2">
            {project.sector}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">LO Coverage</p>
                <p className="text-2xl font-bold">{Math.round(project.lo_score * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">${project.pricing_usd.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{project.duration_weeks} weeks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Team Size</p>
                <p className="text-2xl font-bold">{project.team_size} students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
