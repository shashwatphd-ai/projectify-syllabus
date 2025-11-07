import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { trackDashboardEvent } from "@/lib/analytics";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDemandSignals,
  useDemandCategories,
  useDemandRegions,
  DemandSignalFilters,
} from "@/hooks/useDemandSignals";
import { DemandSignalCard } from "./DemandSignalCard";
import { EmployerCTAModal } from "./EmployerCTAModal";
import { Header } from "@/components/Header";

export const DemandBoardLayout = () => {
  const [filters, setFilters] = useState<DemandSignalFilters>({});
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [selectedSignalCategory, setSelectedSignalCategory] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: signals, isLoading, error } = useDemandSignals(filters);
  const { data: categories } = useDemandCategories();
  const { data: regions } = useDemandRegions();

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
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold">Student Project Marketplace</h1>
              <p className="text-muted-foreground mt-2">
                Connect with talented students for real-world projects
              </p>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="md:hidden">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filter Panel */}
          <aside
            className={`w-full md:w-64 space-y-4 ${
              showFilters ? "block" : "hidden md:block"
            }`}
          >
            <Card className="p-4 space-y-4 sticky top-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Filters</h2>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("category", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
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
                <Label>Region</Label>
                <Select
                  value={filters.region || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("region", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
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
                <Label>Minimum Students</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Any"
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
          <main className="flex-1">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-8 text-center">
                <p className="text-destructive">
                  Failed to load demand signals. Please try again later.
                </p>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && signals?.length === 0 && (
              <Card className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-lg mb-2">No Opportunities Found</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? "Try adjusting your filters to see more opportunities."
                    : "Check back soon for new project opportunities."}
                </p>
              </Card>
            )}

            {/* Signals Grid */}
            {!isLoading && !error && signals && signals.length > 0 && (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {signals.length} opportunit{signals.length === 1 ? "y" : "ies"}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {signals.map((signal) => (
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
