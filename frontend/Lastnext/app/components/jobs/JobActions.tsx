"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileDown, Filter, SortAsc, SortDesc, Building, Calendar } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import CreateJobButton from "@/app/components/jobs/CreateJobButton";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import JobsPDFDocument from "@/app/components/ducument/JobsPDFGenerator";
import { useProperty } from "@/app/lib/PropertyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/app/components/ui/dropdown-menu";
import { SortOrder, Job, Property, TabValue } from "@/app/lib/types";
import { format } from "date-fns";

type DateFilter = "all" | "today" | "yesterday" | "thisWeek" | "thisMonth" | "custom";

interface PropertyContextType {
  selectedProperty: string | null;
  setSelectedProperty: (propertyId: string | null) => void;
}

interface JobActionsProps {
  onSort?: (order: SortOrder) => void;
  currentSort?: SortOrder;
  onDateFilter?: (filter: DateFilter, startDate?: Date, endDate?: Date) => void;
  currentDateFilter?: DateFilter;
  jobs?: Job[];
  onRefresh?: () => void;
  currentTab?: TabValue;
  properties?: Property[];
}

export default function JobActions({
  onSort,
  currentSort = "Newest first",
  onDateFilter,
  currentDateFilter = "all",
  jobs = [],
  onRefresh,
  currentTab = "all",
  properties = [],
}: JobActionsProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const { selectedProperty, setSelectedProperty } = useProperty() as PropertyContextType;

  const getDateFilterLabel = (filter: DateFilter) => {
    switch (filter) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "thisWeek": return "This Week";
      case "thisMonth": return "This Month";
      case "custom": return "Custom Range";
      default: return "All Time";
    }
  };

  const handleRefresh = () => {
    onRefresh ? onRefresh() : router.refresh();
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return "All Properties";
    const property = properties.find((p) => p.property_id === propertyId);
    return property?.name || "Unknown Property";
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    if (onDateFilter) {
      if (filter === "custom") {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        onDateFilter(filter, startDate, endDate);
      } else {
        onDateFilter(filter);
      }
    }
  };

  const handleGeneratePDF = async () => {
    if (!jobs.length) {
      alert("No jobs available to generate a PDF.");
      return;
    }

    try {
      setIsGenerating(true);
      const propertyName = getPropertyName(selectedProperty);

      const blob = await pdf(
        <JobsPDFDocument
          jobs={jobs}
          filter={currentTab}
          selectedProperty={selectedProperty}
          propertyName={propertyName}
        />
      ).toBlob();

      const date = format(new Date(), "yyyy-MM-dd");
      const filename = `jobs-report-${date}.pdf`;
      saveAs(blob, filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredJobsCount = jobs.filter((job) => {
    if (!selectedProperty) return true;

    if (!job.properties || !Array.isArray(job.properties) || job.properties.length === 0) {
      return false;
    }

    return job.properties.some((prop: any) => {
      if (typeof prop === "string" || typeof prop === "number") {
        return String(prop) === selectedProperty;
      }
      if (prop && typeof prop === "object" && "property_id" in prop) {
        return String(prop.property_id) === selectedProperty;
      }
      if (prop && typeof prop === "object" && "id" in prop) {
        return String(prop.id) === selectedProperty;
      }
      if (prop && typeof prop === "object") {
        return Object.values(prop).some(
          (value) =>
            (typeof value === "string" || typeof value === "number") &&
            String(value) === selectedProperty
        );
      }
      return false;
    });
  }).length;

  const menuItemClass = "flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white cursor-pointer";
  const menuLabelClass = "text-xs font-semibold text-zinc-400 px-3 py-1.5";
  const dropdownContentClass = "w-[200px] bg-zinc-950 border-zinc-800 rounded-lg shadow-lg";
  const buttonClass = "flex items-center gap-2 text-sm h-9";

  return (
    <div className="flex items-center gap-2">
      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={buttonClass}>
              <Building className="h-4 w-4" />
              <span className="truncate max-w-[120px]">{getPropertyName(selectedProperty)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={dropdownContentClass}>
            <DropdownMenuLabel className={menuLabelClass}>Properties</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSelectedProperty(null)} className={menuItemClass}>
              <Building className="h-4 w-4" />
              All Properties
            </DropdownMenuItem>
            {properties.map((property) => (
              <DropdownMenuItem
                key={property.property_id}
                onClick={() => setSelectedProperty(property.property_id)}
                className={menuItemClass}
              >
                <Building className="h-4 w-4" />
                <span className="truncate">{property.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={buttonClass}>
              <Calendar className="h-4 w-4" />
              <span>{getDateFilterLabel(currentDateFilter)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={dropdownContentClass}>
            <DropdownMenuLabel className={menuLabelClass}>Date Range</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleDateFilterChange("all")} className={menuItemClass}>
              <Calendar className="h-4 w-4 opacity-70" /> All Time
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("today")} className={menuItemClass}>
              <Calendar className="h-4 w-4 opacity-70" /> Today
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("yesterday")} className={menuItemClass}>
              <Calendar className="h-4 w-4 opacity-70" /> Yesterday
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("thisWeek")} className={menuItemClass}>
              <Calendar className="h-4 w-4 opacity-70" /> This Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("thisMonth")} className={menuItemClass}>
              <Calendar className="h-4 w-4 opacity-70" /> This Month
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("custom")} className={menuItemClass}>
              <Calendar className="h-4 w-4 opacity-70" /> Custom Range
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={buttonClass}>
              <Filter className="h-4 w-4" />
              <span>{currentSort}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={dropdownContentClass}>
            <DropdownMenuLabel className={menuLabelClass}>Sort Order</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSort?.("Newest first")} className={menuItemClass}>
              <SortDesc className="h-4 w-4" /> Newest first
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort?.("Oldest first")} className={menuItemClass}>
              <SortAsc className="h-4 w-4" /> Oldest first
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className={buttonClass}
        >
          <FileDown className="h-4 w-4" />
          {isGenerating ? "Generating..." : `Export (${filteredJobsCount || 0})`}
        </Button>

        <CreateJobButton onJobCreated={handleRefresh} propertyId={selectedProperty ?? ""} />

      </div>

      {/* Mobile Actions */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-9 h-9 p-0 flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`${dropdownContentClass} max-h-[75vh] overflow-y-auto`} sideOffset={5}>
            <DropdownMenuLabel className={menuLabelClass}>Properties</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSelectedProperty(null)} className={menuItemClass}>
              <Building className="h-4 w-4" /> All Properties
            </DropdownMenuItem>
            {properties.map((property) => (
              <DropdownMenuItem
                key={property.property_id}
                onClick={() => setSelectedProperty(property.property_id)}
                className={menuItemClass}
              >
                <Building className="h-4 w-4" />
                <span className="truncate">{property.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-zinc-800 my-1" />

            <DropdownMenuLabel className={menuLabelClass}>Date Range</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleDateFilterChange("all")} className={menuItemClass}>
              <Calendar className="h-4 w-4" /> All Time
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("today")} className={menuItemClass}>
              <Calendar className="h-4 w-4" /> Today
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("yesterday")} className={menuItemClass}>
              <Calendar className="h-4 w-4" /> Yesterday
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("thisWeek")} className={menuItemClass}>
              <Calendar className="h-4 w-4" /> This Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("thisMonth")} className={menuItemClass}>
              <Calendar className="h-4 w-4" /> This Month
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange("custom")} className={menuItemClass}>
              <Calendar className="h-4 w-4" /> Custom Range
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800 my-1" />

            <DropdownMenuLabel className={menuLabelClass}>Sort By</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSort?.("Newest first")} className={menuItemClass}>
              <SortDesc className="h-4 w-4" /> Newest first
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort?.("Oldest first")} className={menuItemClass}>
              <SortAsc className="h-4 w-4" /> Oldest first
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800 my-1" />

            <DropdownMenuItem onClick={handleGeneratePDF} disabled={isGenerating} className={menuItemClass}>
              <FileDown className="h-4 w-4" />
              {isGenerating ? "Generating..." : `Export PDF (${filteredJobsCount || 0})`}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800 my-1" />

            <DropdownMenuItem onClick={handleRefresh} className={menuItemClass}>
              <Plus className="h-4 w-4" /> Create Job
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
