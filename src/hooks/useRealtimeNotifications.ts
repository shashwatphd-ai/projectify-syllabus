import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useRealtimeNotifications() {
  const { user, isStudent, isFaculty, isEmployer } = useAuth();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Student: Listen for new job matches
    if (isStudent) {
      const jobMatchChannel = supabase
        .channel("job-matches-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "job_matches",
            filter: `student_id=eq.${user.id}`,
          },
          (payload) => {
            const newMatch = payload.new as any;
            const title = "New Job Match!";
            const message = `${newMatch.apollo_job_title || "A new position"} at ${newMatch.apollo_company_name || "a company"}`;
            
            addNotification({
              type: "job_match",
              title,
              message,
              data: { jobMatchId: newMatch.id, jobUrl: newMatch.apollo_job_url },
            });

            toast.success(title, { description: message });
          }
        )
        .subscribe();

      channels.push(jobMatchChannel);

      // Student: Listen for application status changes
      const applicationChannel = supabase
        .channel("applications-realtime")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "project_applications",
            filter: `student_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as any;
            const old = payload.old as any;

            // Only notify if status actually changed
            if (updated.status !== old.status) {
              const statusLabels: Record<string, string> = {
                approved: "approved! 🎉",
                rejected: "not selected",
                pending: "under review",
              };

              const title = "Application Update";
              const message = `Your application has been ${statusLabels[updated.status] || updated.status}`;

              addNotification({
                type: "application_status",
                title,
                message,
                data: { applicationId: updated.id, projectId: updated.project_id, status: updated.status },
              });

              if (updated.status === "approved") {
                toast.success(title, { description: message });
              } else {
                toast.info(title, { description: message });
              }
            }
          }
        )
        .subscribe();

      channels.push(applicationChannel);
    }

    // Faculty: Listen for project status changes (generation complete, etc.)
    if (isFaculty) {
      const projectChannel = supabase
        .channel("projects-realtime-faculty")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "projects",
          },
          async (payload) => {
            const updated = payload.new as any;
            const old = payload.old as any;

            // Check if this project belongs to one of the faculty's courses
            const { data: course } = await supabase
              .from("course_profiles")
              .select("id, owner_id")
              .eq("id", updated.course_id)
              .eq("owner_id", user.id)
              .maybeSingle();

            if (!course) return; // Not the faculty's project

            // Notify on status changes
            if (updated.status !== old.status) {
              const statusMessages: Record<string, string> = {
                curated_live: "is now live and available to students",
                in_progress: "has started with a student team",
                completed: "has been completed",
              };

              if (statusMessages[updated.status]) {
                const title = "Project Update";
                const message = `"${updated.title}" ${statusMessages[updated.status]}`;

                addNotification({
                  type: "project_update",
                  title,
                  message,
                  data: { projectId: updated.id, status: updated.status },
                });

                toast.info(title, { description: message });
              }
            }
          }
        )
        .subscribe();

      channels.push(projectChannel);
    }

    // Employer: Listen for new applications to their projects
    if (isEmployer) {
      const employerAppChannel = supabase
        .channel("applications-realtime-employer")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "project_applications",
          },
          async (payload) => {
            const newApp = payload.new as any;

            // Check if this application is for a project owned by this employer
            const { data: project } = await supabase
              .from("projects")
              .select("id, title, company_profile_id, company_profiles!inner(owner_user_id)")
              .eq("id", newApp.project_id)
              .maybeSingle();

            if (!project || (project as any).company_profiles?.owner_user_id !== user.id) {
              return; // Not the employer's project
            }

            const title = "New Application";
            const message = `A student has applied to "${project.title}"`;

            addNotification({
              type: "application_status",
              title,
              message,
              data: { applicationId: newApp.id, projectId: newApp.project_id },
            });

            toast.info(title, { description: message });
          }
        )
        .subscribe();

      channels.push(employerAppChannel);
    }

    // Cleanup subscriptions
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, isStudent, isFaculty, isEmployer, addNotification]);
}
