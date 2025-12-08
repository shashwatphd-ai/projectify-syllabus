import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DemandSignalFilters,
  useDemandCategories,
  useDemandRegions,
  useDemandSignals,
} from "@/hooks/useDemandSignals";
import { trackDashboardEvent } from "@/lib/analytics";
import { Filter, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { DemandSignalCard } from "./DemandSignalCard";
import { EmployerCTAModal } from "./EmployerCTAModal";

export const DemandBoardLayout = () => {
  const [filters, setFilters] = useState<DemandSignalFilters>({});
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [selectedSignalCategory, setSelectedSignalCategory] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: signals, isLoading, error } = useDemandSignals(filters);
  const { data: categories } = useDemandCategories();
  const { data: regions } = useDemandRegions();

  // Filter out "Unknown" category signals
  const filteredSignals = signals?.filter(signal => signal.project_category !== "Unknown") || [];

  // Track page view on mount
  useEffect(() => {
    trackDashboardEvent('view');
  }, []);

  // Track filter changes
  useEffect(() => {
    const hasFilters = Object.values(filters).some(v => v !== undefined);
    if (hasFilters) {
      trackDashboardEvent('filter', { filtersApplied: filters });
    }
  }, [filters]);

  const handleExpressInterest = (signalId: string, category: string) => {
    setSelectedSignalId(signalId);
    setSelectedSignalCategory(category);
    setModalOpen(true);
  };

  const handleFilterChange = (key: keyof DemandSignalFilters, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Page Header Section */}
      <div className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Student Project Marketplace</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Connect with talented students for real-world projects
              </p>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full sm:w-auto"
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Filter Panel */}
          <aside
            className={`w-full lg:w-72 ${
              showFilters ? "block" : "hidden lg:block"
            }`}
          >
            <Card className="p-3 sm:p-4 space-y-3 sm:space-y-4 lg:sticky lg:top-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base sm:text-lg">Filters</h2>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-7"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Category</Label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("category", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Region</Label>
                <Select
                  value={filters.region || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("region", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions?.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Students Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Minimum Students</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Any"
                  className="h-9"
                  value={filters.minStudents || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "minStudents",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                />
              </div>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12 lg:py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-6 sm:p-8 text-center">
                <p className="text-destructive text-sm sm:text-base">
                  Failed to load demand signals. Please try again later.
                </p>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredSignals.length === 0 && (
              <Card className="p-6 sm:p-8 text-center">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-base sm:text-lg mb-2">No Opportunities Found</h3>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {hasActiveFilters
                    ? "Try adjusting your filters to see more opportunities."
                    : "Check back soon for new project opportunities."}
                </p>
              </Card>
            )}

            {/* Signals Grid */}
            {!isLoading && !error && filteredSignals.length > 0 && (
              <>
                <div className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold px-1">
                  {filteredSignals.length} opportunit{filteredSignals.length === 1 ? "y" : "ies"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                  {filteredSignals.map((signal) => (
                    <DemandSignalCard
                      key={signal.id}
                      signal={signal}
                      onExpressInterest={(id) => handleExpressInterest(id, signal.project_category)}
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modal */}
      {selectedSignalId && (
        <EmployerCTAModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          demandSignalId={selectedSignalId}
          signalCategory={selectedSignalCategory}
        />
      )}
    </div>
  );
};
