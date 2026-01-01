import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useNewJobMatchCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["new-job-match-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("job_matches")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "pending_notification");

      if (error) {
        console.error("Error fetching job match count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    // Cache for 30 seconds to prevent excessive API calls
    staleTime: 1000 * 30,
    // Refetch every minute for near-realtime updates
    refetchInterval: 60000,
  });
};
