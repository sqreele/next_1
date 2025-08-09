"use client";

import { useState, useMemo } from "react";
import { useProperty } from "@/app/lib/PropertyContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import JobList from "@/app/components/jobs/jobList";
import { Job, Property, TabValue } from "@/app/lib/types";
import {
  Inbox, Clock, PlayCircle, CheckCircle2, XCircle,
  AlertTriangle, Filter, ChevronDown, Wrench,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";

interface JobsContentProps {
  jobs: Job[];
  properties: Property[];
}

// Update the Job type or extend it here if necessary
interface ExtendedJob extends Job {
  is_preventive_maintenance?: boolean; // Added the property with correct naming convention
}

const tabConfig = [
  { value: "all", label: "All Jobs", icon: Inbox },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "waiting_sparepart", label: "Waiting Sparepart", icon: PlayCircle },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
  { value: "defect", label: "Defect", icon: AlertTriangle },
  { value: "preventive_maintenance", label: "Maintenance", icon: Wrench },
] as const;

export default function JobsContent({ jobs, properties }: JobsContentProps) {
  const [currentTab, setCurrentTab] = useState<TabValue>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { selectedProperty } = useProperty();

  const filteredJobs = useMemo(() => {
    if (!Array.isArray(jobs)) return [];
    
    let filtered = jobs as ExtendedJob[]; // Cast to the extended type
    
    if (selectedProperty) {
      filtered = filtered.filter(job => 
        job.profile_image?.properties?.some(
          prop => String(prop.property_id) === selectedProperty
        )
      );
    }
    
    switch (currentTab) {
      case 'pending':
        return filtered.filter(job => job.status === 'pending');
      case 'waiting_sparepart':
        return filtered.filter(job => job.status === 'waiting_sparepart');
      case 'completed':
        return filtered.filter(job => job.status === 'completed');
      case 'cancelled':
        return filtered.filter(job => job.status === 'cancelled');
      case 'defect':
        return filtered.filter(job => job.is_defective);
      case 'preventive_maintenance':
        // Updated property name with standard naming convention and added null check
        return filtered.filter(job => job.is_preventive_maintenance === true);
      default:
        return filtered;
    }
  }, [jobs, currentTab, selectedProperty]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredJobs]);

  const handleTabChange = (value: string) => {
    setCurrentTab(value as TabValue);
    setIsDropdownOpen(false);
  };

  return (
    <div className="w-full p-4 bg-white text-gray-800">
      <Tabs
        defaultValue="all"
        className="w-full"
        value={currentTab}
        onValueChange={handleTabChange}
      >
        <div className="space-y-4 mb-4">
          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid md:grid-cols-7 gap-2 p-2 bg-gray-100 rounded-lg border border-gray-200">
            {tabConfig.map(({ value, label, icon: Icon }) => (
              <TabsTrigger 
                key={value} 
                value={value} 
                className={cn(
                  "flex items-center gap-2 py-2 px-3 text-sm font-medium text-gray-700",
                  "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
                  "hover:bg-gray-200 hover:text-gray-900 rounded-md transition-colors"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Mobile Dropdown */}
          <div className="md:hidden">
            {isDropdownOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
            )}
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 flex items-center justify-between gap-2 text-sm font-medium text-gray-800 border-gray-300 bg-white hover:bg-gray-100"
                >
                  <Filter className="w-5 h-5 text-gray-600" />
                  <span className="truncate">
                    {tabConfig.find((tab) => tab.value === currentTab)?.label || "All Jobs"}
                  </span>
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-full min-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-md shadow-lg p-1 max-h-80 overflow-y-auto"
                sideOffset={4}
              >
                {tabConfig.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => handleTabChange(value)}
                    className="flex items-center gap-2 py-2 px-3 text-sm text-gray-800 hover:bg-gray-100 hover:text-gray-900 cursor-pointer rounded-sm"
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {tabConfig.map(({ value }) => (
          <TabsContent key={value} value={value} className="mt-0">
            <JobList 
              jobs={sortedJobs}
              filter={value as TabValue} 
              properties={properties}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}