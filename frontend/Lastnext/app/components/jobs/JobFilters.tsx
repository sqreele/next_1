import React, { useState } from "react";
import { Search, Filter, X, Calendar, CalendarIcon, Check, Wrench } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Badge } from "@/app/components/ui/badge";
import { JobStatus, JobPriority } from "@/app/lib/types";
import { cn } from "@/app/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/app/components/ui/calendar";

export interface FilterState {
  search: string;
  status: JobStatus | "all";
  priority: JobPriority | "all";
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  is_preventivemaintenance?: boolean | null;
}

interface JobFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Count active filters (excluding 'all' and empty search)
  const activeFilterCount = [
    filters.search !== "" ? 1 : 0,
    filters.status !== "all" ? 1 : 0,
    filters.priority !== "all" ? 1 : 0,
    filters.dateRange?.from || filters.dateRange?.to ? 1 : 0,
    filters.is_preventivemaintenance !== null ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      ...filters,
      search: searchTerm,
    });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value as JobStatus | "all",
    });
  };

  const handlePriorityChange = (value: string) => {
    onFilterChange({
      ...filters,
      priority: value as JobPriority | "all",
    });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    onFilterChange({
      ...filters,
      dateRange: range
    });
  };

  const handlePreventiveMaintenanceChange = (value: string) => {
    const boolValue = value === "true" ? true : value === "false" ? false : null;
    onFilterChange({
      ...filters,
      is_preventivemaintenance: boolValue
    });
  };

  // Format date range for display
  const formatDateRange = () => {
    if (!filters.dateRange?.from && !filters.dateRange?.to) return "Any Date";
    
    if (filters.dateRange.from && filters.dateRange.to) {
      if (filters.dateRange.from.toDateString() === filters.dateRange.to.toDateString()) {
        return format(filters.dateRange.from, "MMM d, yyyy");
      }
      return `${format(filters.dateRange.from, "MMM d")} - ${format(filters.dateRange.to, "MMM d, yyyy")}`;
    }
    
    if (filters.dateRange.from) {
      return `From ${format(filters.dateRange.from, "MMM d, yyyy")}`;
    }
    
    if (filters.dateRange.to) {
      return `Until ${format(filters.dateRange.to, "MMM d, yyyy")}`;
    }
  };

  // Format preventive maintenance value for select display
  const getPreventiveMaintenanceValue = () => {
    if (filters.is_preventivemaintenance === true) return "true";
    if (filters.is_preventivemaintenance === false) return "false";
    return "null";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Form - Full width on mobile, left side on desktop */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 flex gap-2 w-full"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search jobs..."
              className="pl-10 h-10 bg-gray-50 border-gray-200"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <Button type="submit" className="shrink-0 bg-blue-600 hover:bg-blue-700">
            Search
          </Button>
        </form>
        
        {/* Filter buttons - desktop view on right */}
        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          {/* Status filter */}
          <Select
            value={filters.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-full md:w-40 h-10 bg-gray-50 border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="waiting_sparepart">Waiting Parts</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Priority filter */}
          <Select
            value={filters.priority}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger className="w-full md:w-40 h-10 bg-gray-50 border-gray-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Preventive Maintenance filter */}
          <Select
            value={getPreventiveMaintenanceValue()}
            onValueChange={handlePreventiveMaintenanceChange}
          >
            <SelectTrigger className="w-full md:w-40 h-10 bg-gray-50 border-gray-200">
              <SelectValue placeholder="Maintenance Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">All Types</SelectItem>
              <SelectItem value="true">Preventive Maintenance</SelectItem>
              <SelectItem value="false">Regular Jobs</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date Range filter */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full md:w-48 h-10 bg-gray-50 border-gray-200 justify-start text-left font-normal", 
                  !filters.dateRange?.from && !filters.dateRange?.to ? "text-gray-500" : ""
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                selected={filters.dateRange}
                onSelect={(range) => {
                  handleDateRangeChange(range || {});
                  if (range?.to) {
                    setIsCalendarOpen(false);
                  }
                }}
                numberOfMonths={1}
              />
              <div className="flex items-center justify-between p-3 border-t border-gray-100">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    handleDateRangeChange({});
                    setIsCalendarOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsCalendarOpen(false)}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              onClick={onClearFilters}
              title="Clear all filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {filters.search && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              Search: {filters.search}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFilterChange({...filters, search: ""})}
              />
            </Badge>
          )}
          
          {filters.status !== "all" && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100"
            >
              Status: {filters.status.replace("_", " ")}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFilterChange({...filters, status: "all"})}
              />
            </Badge>
          )}
          
          {filters.priority !== "all" && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              Priority: {filters.priority}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFilterChange({...filters, priority: "all"})}
              />
            </Badge>
          )}
          
          {filters.is_preventivemaintenance !== null && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100"
            >
              <Wrench className="h-3 w-3 mr-1" />
              {filters.is_preventivemaintenance === true ? "Preventive Maintenance" : "Regular Jobs"}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFilterChange({...filters, is_preventivemaintenance: null})}
              />
            </Badge>
          )}
          
          {(filters.dateRange?.from || filters.dateRange?.to) && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100"
            >
              Date: {formatDateRange()}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFilterChange({...filters, dateRange: {}})}
              />
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs ml-auto"
            onClick={onClearFilters}
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobFilters;