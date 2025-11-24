import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, TrendingUp, Loader2, AlertTriangle, Flame, ArrowUpDown, Link as LinkIcon, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { ProjectAnalytics } from "@/components/ProjectAnalytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectWithSignal {
  id: string;
  title: string;
  company_name: string;
  sector: string;
  duration_weeks: number;
  team_size: number;
  pricing_usd: number;
  tier: string;
  lo_score: number;
  needs_review: boolean;
  company_profile_id: string;
  created_at: string;
  course_profiles: {
    title: string;
    owner_id: string;
  };
  company_signals?: Array<{
    project_score: number;
    signal_type: string;
    status: string;
    created_at: string;
  }>;
  latest_score?: number;
}

interface AIShellProject {
  id: string;
  title: string;
  company_name: string;
  sector: string;
  pricing_usd: number;
  duration_weeks: number;
  lo_score: number;
}

interface EmployerSubmission {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string;
  project_category: string | null;
  proposed_project_title: string | null;
  project_description: string | null;
  status: string;
  created_at: string;
}

interface PendingFaculty {
  user_id: string;
  email: string;
  created_at: string;
}

const AdminHub = () => {
  const { user, loading: authLoading, requireAuth, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithSignal[]>([]);
  const [submissions, setSubmissions] = useState<EmployerSubmission[]>([]);
  const [pendingFaculty, setPendingFaculty] = useState<PendingFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score');
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<EmployerSubmission | null>(null);
  const [aiShellProjects, setAiShellProjects] = useState<AIShellProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  useEffect(() => {
    requireAuth();
  }, [authLoading]);

  // Handle admin access check and redirect
  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/projects');
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Load data when admin status is confirmed
  useEffect(() => {
    if (isAdmin && user) {
      loadData();
    }
  }, [isAdmin, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadProjects(), loadSubmissions(), loadPendingFaculty()]);
    } catch (error: any) {
      console.error('Load data error:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      // Get all projects with their company signals
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          course_profiles!inner(title, owner_id)
        `)
        .order('created_at', { ascending: false });

      if (projectError) throw projectError;

      // Get latest signal scores for each company
      const { data: signalData, error: signalError } = await supabase
        .from('company_signals')
        .select('company_id, project_score, signal_type, status, created_at')
        .eq('status', 'processed')
        .order('created_at', { ascending: false });

      if (signalError) throw signalError;

      // Map signals to projects
      const projectsWithSignals = (projectData || []).map(project => {
        const companySignals = (signalData || [])
          .filter(signal => signal.company_id === project.company_profile_id);
        
        const latestScore = companySignals.length > 0 
          ? companySignals[0].project_score 
          : 0;

        return {
          ...project,
          company_signals: companySignals,
          latest_score: latestScore
        };
      });

      setProjects(projectsWithSignals);
    } catch (error: any) {
      console.error('Load projects error:', error);
      throw error;
    }
  };

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('employer_interest_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Load submissions error:', error);
      throw error;
    }
  };

  const loadPendingFaculty = async () => {
    try {
      // First, get all users with the pending_faculty role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, assigned_at')
        .eq('role', 'pending_faculty')
        .order('assigned_at', { ascending: false });

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setPendingFaculty([]);
        return;
      }

      const userIds = roleData.map((item) => item.user_id);

      // Then, fetch profile info for those users
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .in('id', userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(
        (profileData || []).map((p) => [p.id, p])
      );

      const formattedData = roleData.map((item) => {
        const profile = profileMap.get(item.user_id);
        return {
          user_id: item.user_id,
          email: profile?.email ?? 'Unknown email',
          created_at: profile?.created_at ?? item.assigned_at,
        };
      });

      setPendingFaculty(formattedData);
    } catch (error: any) {
      console.error('Load pending faculty error:', error);
      throw error;
    }
  };

  const getSortedProjects = () => {
    const sorted = [...projects];
    if (sortBy === 'score') {
      return sorted.sort((a, b) => (b.latest_score || 0) - (a.latest_score || 0));
    }
    return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const loadAIShellProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          company_name,
          sector,
          pricing_usd,
          duration_weeks,
          lo_score
        `)
        .eq('status', 'ai_shell')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAiShellProjects(data || []);
    } catch (error: any) {
      console.error('Load AI shell projects error:', error);
      toast.error('Failed to load available projects');
    }
  };

  const handleOpenMatchModal = async (submission: EmployerSubmission) => {
    setSelectedSubmission(submission);
    setSelectedProjectId("");
    await loadAIShellProjects();
    setMatchModalOpen(true);
  };

  const handleSyncProject = async () => {
    if (!selectedSubmission || !selectedProjectId) {
      toast.error('Please select a project to match');
      return;
    }

    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('sync-project-match', {
        body: {
          submission_id: selectedSubmission.id,
          project_id: selectedProjectId
        }
      });

      if (error) throw error;

      toast.success('Successfully matched employer lead with project!');
      setMatchModalOpen(false);
      setSelectedSubmission(null);
      setSelectedProjectId("");
      
      // Refresh data
      await loadData();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync project');
    } finally {
      setSyncing(false);
    }
  };

  const handleApproveFaculty = async (userId: string, email: string) => {
    setApprovingUserId(userId);
    try {
      const { error } = await supabase.rpc('admin_assign_role', {
        _user_id: userId,
        _role: 'faculty'
      });

      if (error) throw error;

      // Send approval email notification
      try {
        await supabase.functions.invoke('send-faculty-approval-email', {
          body: { email }
        });
        console.log('Approval email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast.success(`Approved ${email} as faculty - welcome email sent!`);
      await loadPendingFaculty();
    } catch (error: any) {
      console.error('Approve faculty error:', error);
      toast.error(error.message || 'Failed to approve faculty');
    } finally {
      setApprovingUserId(null);
    }
  };

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedProjects = getSortedProjects();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Curation Hub</h1>
              <p className="text-muted-foreground">
                Manage AI-generated projects and employer interest submissions
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/admin-hub/metrics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              View Metrics Dashboard
            </Button>
          </div>
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">
              AI Project Shells ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="submissions">
              Employer Leads ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="faculty">
              Pending Faculty ({pendingFaculty.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Projects enriched with real-time market signals
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={(value: 'score' | 'date') => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4" />
                        Suitability Score
                      </div>
                    </SelectItem>
                    <SelectItem value="date">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Date Created
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {sortedProjects.map((project) => (
                <Card
                  key={project.id}
                  className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{project.title}</CardTitle>
                          {project.needs_review && (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Review
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          {project.company_name}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">{project.sector}</Badge>
                        {project.latest_score !== undefined && project.latest_score > 0 && (
                          <Badge 
                            variant="outline" 
                            className={`${
                              project.latest_score >= 70 
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300' 
                                : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300'
                            }`}
                          >
                            <Flame className="h-3 w-3 mr-1" />
                            {project.latest_score}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">LO Coverage</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-secondary" />
                          <span className="font-semibold">{Math.round(project.lo_score * 100)}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Budget</span>
                        <span className="font-semibold">${project.pricing_usd.toLocaleString()}</span>
                      </div>

                      {project.company_signals && project.company_signals.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Latest Signal</span>
                          <Badge variant="outline" className="text-xs">
                            {project.company_signals[0].signal_type}
                          </Badge>
                        </div>
                      )}

                      <div className="pt-3 border-t">
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {submissions.map((submission) => (
                <Card key={submission.id} className="shadow-[var(--shadow-card)]">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{submission.company_name}</CardTitle>
                        <CardDescription>
                          {submission.contact_name || submission.contact_email}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={submission.status === 'pending' ? 'outline' : 'secondary'}
                      >
                        {submission.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {submission.project_category && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Category</span>
                          <Badge variant="outline">{submission.project_category}</Badge>
                        </div>
                      )}

                      {submission.proposed_project_title && (
                        <div className="text-sm">
                          <span className="text-muted-foreground block mb-1">Proposed Project</span>
                          <p className="font-medium">{submission.proposed_project_title}</p>
                        </div>
                      )}

                      {submission.project_description && (
                        <div className="text-sm">
                          <span className="text-muted-foreground block mb-1">Description</span>
                          <p className="text-xs line-clamp-3">{submission.project_description}</p>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Submitted {new Date(submission.created_at).toLocaleDateString()}
                      </div>

                      {submission.status === 'pending' && (
                        <div className="pt-3 border-t">
                          <Button 
                            onClick={() => handleOpenMatchModal(submission)}
                            className="w-full"
                            variant="default"
                          >
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Match to Project
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {submissions.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No employer submissions yet</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="faculty" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Review and approve faculty signups
            </p>
            
            {pendingFaculty.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending faculty approvals
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {pendingFaculty.map((faculty) => (
                  <Card key={faculty.user_id} className="shadow-[var(--shadow-card)]">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{faculty.email}</CardTitle>
                          <CardDescription className="mt-2">
                            Signed up {new Date(faculty.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground block mb-1">User ID</span>
                          <p className="font-mono text-xs">{faculty.user_id}</p>
                        </div>

                        <div className="pt-3 border-t flex gap-2">
                          <Button 
                            onClick={() => handleApproveFaculty(faculty.user_id, faculty.email)}
                            disabled={approvingUserId === faculty.user_id}
                            className="flex-1"
                          >
                            {approvingUserId === faculty.user_id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              'Approve as Faculty'
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PHASE 2: Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Project Quality Analytics</h2>
              <p className="text-sm text-muted-foreground">
                Track faculty feedback and identify patterns to improve project generation quality.
              </p>
            </div>
            <ProjectAnalytics />
          </TabsContent>
        </Tabs>

        {/* Match Project Modal */}
        <Dialog open={matchModalOpen} onOpenChange={setMatchModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-background">
            <DialogHeader>
              <DialogTitle>Match Employer Lead to AI Project Shell</DialogTitle>
              <DialogDescription>
                Select an AI-generated project to match with <strong>{selectedSubmission?.company_name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedSubmission && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-semibold mb-2">Employer Lead Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Company:</span> {selectedSubmission.company_name}</p>
                    <p><span className="text-muted-foreground">Contact:</span> {selectedSubmission.contact_email}</p>
                    {selectedSubmission.proposed_project_title && (
                      <p><span className="text-muted-foreground">Project:</span> {selectedSubmission.proposed_project_title}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Select AI Project Shell</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {aiShellProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{project.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {project.company_name} • ${project.pricing_usd?.toLocaleString()} • {project.duration_weeks}w
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aiShellProjects.length === 0 && (
                  <p className="text-sm text-muted-foreground">No AI shell projects available</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMatchModalOpen(false)} disabled={syncing}>
                Cancel
              </Button>
              <Button onClick={handleSyncProject} disabled={!selectedProjectId || syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Confirm Match'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminHub;
