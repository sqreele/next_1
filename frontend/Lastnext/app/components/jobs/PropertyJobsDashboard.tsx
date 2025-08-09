"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import _ from "lodash";
import { Job, JobStatus, STATUS_COLORS } from "@/app/lib/types";
import { useProperty } from "@/app/lib/PropertyContext";
import { useSession, signOut } from "next-auth/react";
import { Session } from "next-auth";
import { fetchJobs } from "@/app/lib/data";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useJob } from "@/app/lib/JobContext";

interface PropertyJobsDashboardProps {
  initialJobs?: Job[];
}

const PropertyJobsDashboard = ({ initialJobs = [] }: PropertyJobsDashboardProps) => {
  const { selectedProperty, userProperties } = useProperty();
  const { data: session, status, update } = useSession() as {
    data: Session | null;
    status: "authenticated" | "unauthenticated" | "loading";
    update: () => Promise<Session | null>;
  };
  const { jobCreationCount } = useJob();
  const [allJobs, setAllJobs] = useState<Job[]>(initialJobs);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the current property ID to reduce unnecessary re-renders
  const effectiveProperty = useMemo(() => {
    return selectedProperty || (userProperties.length > 0 ? userProperties[0].property_id : null);
  }, [selectedProperty, userProperties]);

  // Simplified session refresh
  const refreshSession = async () => {
    try {
      await update();
      return true;
    } catch (err) {
      setError("Session expired. Please log in again.");
      signOut();
      return false;
    }
  };

  // Load jobs with optimized error handling
  const loadJobs = async () => {
    if (status !== "authenticated" || !session?.user) return;

    setIsLoading(true);
    setError(null);

    try {
      const jobsData = await fetchJobs();
      
      if (!Array.isArray(jobsData)) {
        throw new Error("Invalid jobs data format");
      }

      const currentUserId = session.user.id;
      const currentUsername = session.user.username;

      // Filter only once using simple conditions
      const userJobs = jobsData.filter((job) => {
        const jobUser = String(job.user);
        return jobUser === String(currentUserId) || (currentUsername && jobUser === currentUsername);
      });

      setAllJobs(userJobs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch jobs";
      setError(errorMessage);
      setAllJobs([]);

      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        const refreshed = await refreshSession();
        if (refreshed) {
          await loadJobs();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load jobs when necessary
  useEffect(() => {
    loadJobs();
  }, [status, jobCreationCount]);

  // Filter jobs by property with optimized logic
  useEffect(() => {
    const user = session?.user;
    if (!user?.properties?.length || !allJobs.length || !effectiveProperty) {
      setFilteredJobs([]);
      return;
    }

    // Optimized filtering with less logging
    const filtered = allJobs.filter((job) => {
      // Direct property_id match
      if (job.property_id && String(job.property_id) === effectiveProperty) {
        return true;
      }
      
      // Room property match with special case handling
      if (job.rooms && job.rooms.length > 0) {
        for (const room of job.rooms) {
          if (!room?.properties?.length) continue;
          
          for (const prop of room.properties) {
            // Special case for property ID "1"
            if (prop === 1 || String(prop) === "1") return true;
            
            // Object property representation
            if (typeof prop === "object" && prop !== null && "property_id" in prop) {
              if (String((prop as { property_id: string | number }).property_id) === effectiveProperty) return true;
            }
            
            // Direct property representation
            if (String(prop) === effectiveProperty) return true;
          }
        }
      }
      
      // Job properties array match
      if (job.properties && job.properties.length) {
        for (const prop of job.properties) {
          // Special case for property ID "1"
          if (prop === 1 || String(prop) === "1") return true;
          
          // Object property representation
          if (typeof prop === "object" && prop !== null && "property_id" in prop) {
            if (String((prop as { property_id: string | number }).property_id) === effectiveProperty) return true;
          }
          
          // Direct property representation
          if (String(prop) === effectiveProperty) return true;
        }
      }
      
      return false;
    });

    setFilteredJobs(filtered);
  }, [allJobs, effectiveProperty, session?.user?.properties]);

  // Memoized job statistics
  const jobStats = useMemo(() => {
    const total = filteredJobs.length;
    if (total === 0) return [];
    
    // Use a simple accumulator approach for performance
    const statusCounts = {} as Record<JobStatus, number>;
    
    for (const job of filteredJobs) {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    }

    return (["pending", "in_progress", "completed", "waiting_sparepart", "cancelled"] as JobStatus[]).map(
      (status) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
        value: statusCounts[status] || 0,
        color: STATUS_COLORS[status],
        percentage: total > 0 ? ((statusCounts[status] || 0) / total * 100).toFixed(1) : "0",
      })
    );
  }, [filteredJobs]);

  // Memoized job monthly data with optimization for large datasets
  const jobsByMonth = useMemo(() => {
    if (filteredJobs.length === 0) return [];

    // Use lodash for efficient grouping
    const grouped = _.groupBy(filteredJobs, (job) => {
      const date = job.created_at ? new Date(job.created_at) : new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    });

    // Process grouped data
    const result = Object.entries(grouped).map(([month, monthJobs]) => {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      const formattedMonth = date.toLocaleDateString("en-US", { month: "short" });

      // Count statuses in a single pass
      const counts = {
        completed: 0,
        pending: 0,
        waiting_sparepart: 0,
        in_progress: 0,
        cancelled: 0
      };
      
      for (const job of monthJobs) {
        if (counts.hasOwnProperty(job.status)) {
          counts[job.status as keyof typeof counts]++;
        }
      }

      return {
        month: `${formattedMonth} ${year}`,
        total: monthJobs.length,
        ...counts
      };
    });

    // Sort chronologically
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return result.sort((a, b) => {
      const [aMonth, aYear] = a.month.split(" ");
      const [bMonth, bYear] = b.month.split(" ");

      if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
      return months.indexOf(aMonth) - months.indexOf(bMonth);
    });
  }, [filteredJobs]);

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <Card className="w-full p-4">
        <CardContent className="text-center">
          <p className="text-gray-600 text-base">Loading charts...</p>
        </CardContent>
      </Card>
    );
  }

  // Authentication state
  if (status === "unauthenticated") {
    return (
      <Card className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <CardContent className="text-center space-y-4">
          <p className="text-yellow-600 text-base">Please log in to view job statistics.</p>
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <Link href="/auth/signin">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full p-4 bg-red-50 border border-yellow-200 rounded-md">
        <CardContent className="text-center space-y-4">
          <p className="text-red-600 text-base">{error}</p>
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <Link href="/dashboard/myJobs">Go to My Jobs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (filteredJobs.length === 0) {
    return (
      <Card className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <CardContent className="text-center space-y-4">
          <p className="text-yellow-600 text-base">
            {allJobs.length ? "No jobs found for the selected property." : "No jobs available yet."}
          </p>
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <Link href={allJobs.length ? "/dashboard/myJobs" : "/dashboard/createJob"}>
              {allJobs.length ? "View All Jobs" : "Create a Job"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main dashboard view with optimized render performance
  return (
    <div className="space-y-4 px-2">
      <div className="space-y-4">
        {/* Jobs by Status Chart */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jobStats}
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {jobStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${props.payload.percentage}%)`,
                      name,
                    ]}
                  />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={12} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Jobs by Month Chart - with limit to prevent rendering too many bars */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Jobs by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobsByMonth.slice(-12)}> {/* Limit to last 12 months */}
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={12} />
                  <Bar dataKey="total" fill="#8884d8" name="Total Jobs" />
                  <Bar dataKey="completed" stackId="a" fill={STATUS_COLORS.completed} />
                  <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.pending} />
                  <Bar dataKey="waiting_sparepart" stackId="a" fill={STATUS_COLORS.waiting_sparepart} name="Waiting" />
                  <Bar dataKey="in_progress" stackId="a" fill={STATUS_COLORS.in_progress} />
                  <Bar dataKey="cancelled" stackId="a" fill={STATUS_COLORS.cancelled} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics - Memoized and optimized */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: "Total Jobs", status: null },
                ...(["pending", "in_progress", "completed", "waiting_sparepart", "cancelled"] as JobStatus[]).map(
                  (status) => ({
                    name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
                    status,
                  })
                ),
              ].map((item, index) => {
                const statValue = item.status
                  ? filteredJobs.filter((job) => job.status === item.status).length
                  : filteredJobs.length;
                const color = item.status ? STATUS_COLORS[item.status] : "#8884d8";
                const percentage = item.status
                  ? ((statValue / filteredJobs.length) * 100).toFixed(1)
                  : "100.0";

                return (
                  <div key={`stat-${index}`} className="p-4 rounded-lg bg-gray-50 w-full flex flex-col">
                    <p className="text-sm text-gray-500 mb-1">{item.name}</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold" style={{ color }}>
                        {statValue}
                      </p>
                      <p className="text-sm ml-2 text-gray-500">{item.status && `(${percentage}%)`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertyJobsDashboard;