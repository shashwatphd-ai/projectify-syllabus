import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PAGE_SIZE = 20;

export interface ProjectWithCourse {
  id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  sector: string;
  final_score: number;
  lo_score: number;
  duration_weeks: number;
  team_size: number;
  pricing_usd: number;
  status: string | null;
  course_id: string;
  needs_review: boolean | null;
  faculty_rating: number | null;
  faculty_feedback: string | null;
  rating_tags: string[] | null;
  tier: string;
  skills: unknown;
  similarity_score?: number;
  course_profiles?: { owner_id: string; title: string } | null;
  company_profiles?: { job_postings: unknown[] | null } | null;
}

interface UsePaginatedProjectsOptions {
  userId: string | undefined;
  selectedCourseId?: string;
  isStudent: boolean;
  isFaculty: boolean;
  isAdmin: boolean;
  isEmployer: boolean;
}

interface ProjectsPage {
  projects: ProjectWithCourse[];
  nextCursor: number | null;
  totalCount: number;
}

export const usePaginatedProjects = ({
  userId,
  selectedCourseId,
  isStudent,
  isFaculty,
  isAdmin,
  isEmployer,
}: UsePaginatedProjectsOptions) => {
  return useInfiniteQuery<ProjectsPage, Error>({
    queryKey: ["projects", userId, selectedCourseId, isStudent, isFaculty, isAdmin, isEmployer],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) {
        return { projects: [], nextCursor: null, totalCount: 0 };
      }

      const from = pageParam as number;
      const to = from + PAGE_SIZE - 1;

      let query;
      let countQuery;

      if (isStudent) {
        // Students see curated_live projects
        query = supabase
          .from("projects")
          .select("*, course_profiles(owner_id, title), company_profiles(job_postings)")
          .order("created_at", { ascending: false })
          .range(from, to);

        countQuery = supabase
          .from("projects")
          .select("id", { count: "exact", head: true });

      } else if (isFaculty && !isAdmin) {
        // Faculty see their own course projects
        query = supabase
          .from("projects")
          .select("*, course_profiles!inner(owner_id, title), company_profiles(job_postings)")
          .eq("course_profiles.owner_id", userId)
          .order("created_at", { ascending: false })
          .range(from, to);

        countQuery = supabase
          .from("projects")
          .select("id, course_profiles!inner(owner_id)", { count: "exact", head: true })
          .eq("course_profiles.owner_id", userId);

        if (selectedCourseId) {
          query = query.eq("course_id", selectedCourseId);
          countQuery = countQuery.eq("course_id", selectedCourseId);
        }

      } else if (isAdmin) {
        // Admins see all projects
        query = supabase
          .from("projects")
          .select("*, course_profiles(owner_id, title), company_profiles(job_postings)")
          .order("created_at", { ascending: false })
          .range(from, to);

        countQuery = supabase
          .from("projects")
          .select("id", { count: "exact", head: true });

        if (selectedCourseId) {
          query = query.eq("course_id", selectedCourseId);
          countQuery = countQuery.eq("course_id", selectedCourseId);
        }

      } else if (isEmployer) {
        // Employers see their company's projects
        const { data: companyData } = await supabase
          .from("company_profiles")
          .select("id")
          .eq("owner_user_id", userId)
          .maybeSingle();

        if (!companyData) {
          return { projects: [], nextCursor: null, totalCount: 0 };
        }

        query = supabase
          .from("projects")
          .select("*, course_profiles(owner_id, title), company_profiles(job_postings)")
          .eq("company_profile_id", companyData.id)
          .in("status", ["curated_live", "in_progress", "completed"])
          .order("created_at", { ascending: false })
          .range(from, to);

        countQuery = supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("company_profile_id", companyData.id)
          .in("status", ["curated_live", "in_progress", "completed"]);

      } else {
        return { projects: [], nextCursor: null, totalCount: 0 };
      }

      const [{ data, error }, { count }] = await Promise.all([
        query,
        countQuery,
      ]);

      if (error) throw error;

      const totalCount = count ?? 0;
      const hasMore = from + PAGE_SIZE < totalCount;

      return {
        projects: (data || []) as ProjectWithCourse[],
        nextCursor: hasMore ? from + PAGE_SIZE : null,
        totalCount,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
