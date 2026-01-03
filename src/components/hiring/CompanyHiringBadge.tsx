import { Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompanyHiringBadgeProps {
  jobPostings: unknown[] | null | undefined;
  variant?: "default" | "compact";
}

export const CompanyHiringBadge = ({ jobPostings, variant = "default" }: CompanyHiringBadgeProps) => {
  // Safely count job postings
  const jobCount = Array.isArray(jobPostings) ? jobPostings.length : 0;
  
  // Don't render if no jobs
  if (jobCount === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
        <Briefcase className="h-3 w-3" />
        {jobCount} open role{jobCount !== 1 ? "s" : ""}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Briefcase className="h-4 w-4 text-green-600" />
      <span className="font-medium text-green-700 dark:text-green-400">
        {jobCount} open role{jobCount !== 1 ? "s" : ""} at this company
      </span>
    </div>
  );
};
