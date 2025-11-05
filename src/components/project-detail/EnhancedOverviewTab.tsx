import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Package, Lightbulb, DollarSign, Calendar, Clock, Users, GraduationCap } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EnhancedOverviewTabProps {
  project: any;
  forms: any;
  metadata?: any;
}

export const EnhancedOverviewTab = ({ project, forms, metadata }: EnhancedOverviewTabProps) => {
  const form1 = forms.form1 || {};
  const form3 = forms.form3 || {};
  const form4 = forms.form4 || {};
  const form6 = forms.form6 || {};
  const milestones = forms.milestones || [];

  return (
    <div className="space-y-6">
      {/* Project Description */}
      {form1.description && (
        <Card>
          <CardHeader>
            <CardTitle>Project Description</CardTitle>
            <CardDescription>Overview and context</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">{form1.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline & Team Requirements Combined */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline & Team Requirements
          </CardTitle>
          <CardDescription>Project schedule and student needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Timeline */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Schedule</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Start Date</span>
                  <span className="font-medium">{form4.start || 'TBD'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">End Date</span>
                  <span className="font-medium">{form4.end || 'TBD'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration
                  </span>
                  <Badge variant="secondary">{project.duration_weeks} weeks</Badge>
                </div>
              </div>
            </div>

            {/* Team Requirements */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Team Structure</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Size
                  </span>
                  <Badge variant="secondary">{form3.team_size || 'N/A'} students</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Hours/Week</span>
                  <span className="font-medium">{form6.hours_per_week || 'N/A'} hrs</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Student Level
                  </span>
                  <Badge variant="outline">{form6.year || 'N/A'}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones (Collapsible) */}
          {milestones.length > 0 && (
            <Collapsible className="mt-6">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                  <span className="font-medium text-sm">View Project Milestones ({milestones.length})</span>
                  <span className="text-muted-foreground text-xs">Click to expand</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {milestones.map((milestone: any, index: number) => (
                  <div key={index} className="flex gap-3 pb-3 border-b last:border-b-0">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">Week {milestone.week}</Badge>
                        <span className="font-semibold text-sm">{milestone.deliverable}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Budget & Market Signals Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Project Investment & Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Budget Display */}
            <div className="text-center p-6 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Total Project Budget</p>
              <p className="text-4xl font-bold text-primary">
                ${project.pricing_usd.toLocaleString()}
              </p>
            </div>
            
            {/* Quick Market Signals */}
            {metadata?.market_signals_used && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Market Intelligence Applied</p>
                <div className="grid grid-cols-2 gap-2">
                  {metadata.market_signals_used.job_postings_matched > 0 && (
                    <Badge variant="secondary" className="justify-center">
                      🔥 {metadata.market_signals_used.job_postings_matched} Job Postings
                    </Badge>
                  )}
                  {metadata.market_signals_used.funding_stage && (
                    <Badge variant="secondary" className="justify-center">
                      💰 {metadata.market_signals_used.funding_stage}
                    </Badge>
                  )}
                  {metadata.market_signals_used.technologies_aligned?.length > 0 && (
                    <Badge variant="secondary" className="justify-center">
                      ⚙️ {metadata.market_signals_used.technologies_aligned.length} Tech Matches
                    </Badge>
                  )}
                  {metadata.market_signals_used.hiring_urgency && (
                    <Badge variant="secondary" className="justify-center">
                      📈 {metadata.market_signals_used.hiring_urgency} Hiring
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* ROI Preview */}
            {metadata?.estimated_roi?.roi_multiplier && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                <p className="text-sm text-muted-foreground">Estimated ROI</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {metadata.estimated_roi.roi_multiplier}× Value Multiplier
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${metadata.estimated_roi.total_estimated_value?.toLocaleString()} total value
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Learning Objectives */}
      {form3.learning_objectives && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
            <CardDescription>What students will learn from this project</CardDescription>
          </CardHeader>
          <CardContent>
            {typeof form3.learning_objectives === 'string' ? (
              <p>{form3.learning_objectives}</p>
            ) : (
              <ul className="space-y-2">
                {(form3.learning_objectives || []).map((objective: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-secondary mt-1">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project Tasks
          </CardTitle>
          <CardDescription>Key activities and responsibilities</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {(project.tasks as string[]).map((task, i) => (
              <li key={i} className="flex items-start gap-3 group">
                <span className="text-primary font-semibold min-w-[32px] text-lg mt-0.5">
                  {i + 1}.
                </span>
                <span className="leading-relaxed flex-1">{task}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Deliverables & Skills Combined */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Deliverables
            </CardTitle>
            <CardDescription>Expected project outputs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(project.deliverables as string[]).map((deliverable, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm font-medium">
                    {deliverable}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {form3.skills && (
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>Technical and domain expertise needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {form3.skills.map((skill: string, i: number) => (
                  <Badge key={i} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};