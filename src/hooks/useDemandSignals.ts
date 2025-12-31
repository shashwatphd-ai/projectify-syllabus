import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DemandSignal {
  id: string;
  project_category: string;
  industry_sector: string | null;
  required_skills: string[];
  geographic_region: string;
  student_count: number;
  course_count: number;
  institution_count: number;
  earliest_start_date: string | null;
  latest_start_date: string | null;
  typical_duration_weeks: number;
  student_level_distribution: Record<string, number>;
  institution_types: Record<string, number>;
  created_at: string;
  last_updated: string;
  is_active: boolean;
}

export interface DemandSignalFilters {
  category?: string;
  region?: string;
  skills?: string[];
  minStudents?: number;
}

export const useDemandSignals = (filters?: DemandSignalFilters) => {
  return useQuery({
    queryKey: ["demand-signals", filters],
    queryFn: async () => {
      let query = supabase
        .from("demand_signals")
        .select("*")
        .eq("is_active", true)
        .order("student_count", { ascending: false });

      // Apply filters
      if (filters?.category) {
        query = query.ilike("project_category", `%${filters.category}%`);
      }

      if (filters?.region) {
        query = query.ilike("geographic_region", `%${filters.region}%`);
      }

      if (filters?.minStudents) {
        query = query.gte("student_count", filters.minStudents);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching demand signals:", error);
        throw error;
      }

      // Client-side skill filtering (since skills is an array)
      let results = (data ?? []) as DemandSignal[];
      if (filters?.skills && filters.skills.length > 0) {
        results = results.filter((signal) =>
          filters.skills!.some((skill) =>
            (signal.required_skills ?? []).some((s) =>
              s.toLowerCase().includes(skill.toLowerCase())
            )
          )
        );
      }

      return results;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to get unique categories for filter dropdown
export const useDemandCategories = () => {
  return useQuery({
    queryKey: ["demand-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_signals")
        .select("project_category")
        .eq("is_active", true);

      if (error) throw error;

      const categories = [...new Set((data ?? []).map((d) => d.project_category))];
      return categories.sort();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook to get unique regions for filter dropdown
export const useDemandRegions = () => {
  return useQuery({
    queryKey: ["demand-regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_signals")
        .select("geographic_region")
        .eq("is_active", true);

      if (error) throw error;

      const regions = [...new Set((data ?? []).map((d) => d.geographic_region).filter(Boolean))];
      return (regions as string[]).sort();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
