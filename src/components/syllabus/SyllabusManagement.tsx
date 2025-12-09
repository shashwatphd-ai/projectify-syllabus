import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BookOpen, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Copy, 
  Upload,
  Eye,
  Calendar,
  Clock,
  GraduationCap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  level: string;
  weeks: number;
  hrs_per_week: number;
  location_formatted?: string;
  created_at: string;
  outcomes?: any;
}

interface SyllabusManagementProps {
  courses: Course[];
  onRefresh: () => void;
}

export function SyllabusManagement({ courses, onRefresh }: SyllabusManagementProps) {
  const navigate = useNavigate();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    weeks: 0,
    hrs_per_week: 0,
    level: ""
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  const handleEditClick = (course: Course) => {
    setEditingCourse(course);
    setEditForm({
      title: course.title,
      weeks: course.weeks,
      hrs_per_week: course.hrs_per_week,
      level: course.level
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCourse) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('course_profiles')
        .update({
          title: editForm.title,
          weeks: editForm.weeks,
          hrs_per_week: editForm.hrs_per_week,
          level: editForm.level
        })
        .eq('id', editingCourse.id);

      if (error) throw error;

      toast.success("Syllabus updated successfully");
      setIsEditDialogOpen(false);
      setEditingCourse(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating course:', error);
      toast.error(error.message || "Failed to update syllabus");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    try {
      // First delete related projects
      const { error: projectsError } = await supabase
        .from('projects')
        .delete()
        .eq('course_id', courseId);

      if (projectsError) throw projectsError;

      // Then delete the course
      const { error: courseError } = await supabase
        .from('course_profiles')
        .delete()
        .eq('id', courseId);

      if (courseError) throw courseError;

      toast.success("Syllabus and associated projects deleted");
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(error.message || "Failed to delete syllabus");
    }
  };

  const handleDuplicate = async (course: Course) => {
    setIsDuplicating(course.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('course_profiles')
        .insert({
          owner_id: user.id,
          title: `${course.title} (Copy)`,
          level: course.level,
          weeks: course.weeks,
          hrs_per_week: course.hrs_per_week,
          outcomes: course.outcomes,
          artifacts: { required: [], optional: [] }
        });

      if (error) throw error;

      toast.success("Syllabus duplicated successfully");
      onRefresh();
    } catch (error: any) {
      console.error('Error duplicating course:', error);
      toast.error(error.message || "Failed to duplicate syllabus");
    } finally {
      setIsDuplicating(null);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'introductory':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'advanced':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'graduate':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (courses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Syllabi Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Upload your first syllabus to start generating industry projects
          </p>
          <Button onClick={() => navigate("/upload")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Syllabus
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Syllabi</h2>
        <Button onClick={() => navigate("/upload")} variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg line-clamp-2 pr-2">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(course.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/projects?course=${course.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditClick(course)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDuplicate(course)}
                      disabled={isDuplicating === course.id}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {isDuplicating === course.id ? "Duplicating..." : "Duplicate"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Syllabus?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{course.title}" and all associated projects. 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(course.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getLevelColor(course.level)}>
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {course.level}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{course.weeks} weeks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.hrs_per_week} hrs/wk</span>
                </div>
              </div>

              {course.location_formatted && (
                <p className="text-xs text-muted-foreground truncate">
                  📍 {course.location_formatted}
                </p>
              )}

              <Button 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => navigate(`/projects?course=${course.id}`)}
              >
                View Projects
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Syllabus</DialogTitle>
            <DialogDescription>
              Update the details of your syllabus
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weeks">Duration (weeks)</Label>
                <Input
                  id="weeks"
                  type="number"
                  min="1"
                  value={editForm.weeks}
                  onChange={(e) => setEditForm({ ...editForm, weeks: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hrs_per_week">Hours per Week</Label>
                <Input
                  id="hrs_per_week"
                  type="number"
                  min="1"
                  value={editForm.hrs_per_week}
                  onChange={(e) => setEditForm({ ...editForm, hrs_per_week: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="level">Course Level</Label>
              <Input
                id="level"
                value={editForm.level}
                onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                placeholder="e.g., Introductory, Intermediate, Advanced"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
