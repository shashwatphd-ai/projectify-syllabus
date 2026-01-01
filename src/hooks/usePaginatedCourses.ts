import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const COURSES_PAGE_SIZE = 10;

export interface Course {
  id: string;
  title: string;
  level: string;
  weeks: number;
  hrs_per_week: number;
  location_formatted?: string | null;
  created_at: string;
  outcomes?: Json;
}

interface CoursesPage {
  courses: Course[];
  nextCursor: number | null;
  totalCount: number;
}

interface UsePaginatedCoursesOptions {
  userId: string | undefined;
  enabled?: boolean;
}

export const usePaginatedCourses = ({
  userId,
  enabled = true,
}: UsePaginatedCoursesOptions) => {
  return useInfiniteQuery<CoursesPage, Error>({
    queryKey: ["courses", userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) {
        return { courses: [], nextCursor: null, totalCount: 0 };
      }

      const from = pageParam as number;
      const to = from + COURSES_PAGE_SIZE - 1;

      const [{ data, error }, { count }] = await Promise.all([
        supabase
          .from("course_profiles")
          .select("id, title, level, weeks, hrs_per_week, location_formatted, created_at, outcomes")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("course_profiles")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", userId),
      ]);

      if (error) throw error;

      const totalCount = count ?? 0;
      const hasMore = from + COURSES_PAGE_SIZE < totalCount;

      return {
        courses: (data || []) as Course[],
        nextCursor: hasMore ? from + COURSES_PAGE_SIZE : null,
        totalCount,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
