// PreventiveMaintenanceDetailPage.tsx (Server Component)

import { Suspense } from 'react';
import PreventiveMaintenanceClient from '@/app/dashboard/preventive-maintenance/[pm_id]/PreventiveMaintenanceClient'; // Ensure this path is correct
import { notFound } from 'next/navigation';
import { Topic } from '@/app/lib/types'; // Ensure this path is correct
import {
  PreventiveMaintenance,
  getMachineDetails
} from '@/app/lib/preventiveMaintenanceModels'; // Ensure this path is correct

// Import NextAuth.js utilities for server-side session
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth"

// Function to check if topics is a Topic[]
function isTopicArray(topics: Topic[] | number[]): topics is Topic[] {
  return topics.length === 0 || (topics.length > 0 && typeof topics[0] !== 'number');
}

// Helper function to handle machines array
function renderMachines(machines: any[] | null | undefined) {
  if (!machines || machines.length === 0) {
    return <p className="text-gray-500 italic">No machines assigned</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {machines.map((machine, index) => {
        const { id: machineId, name: machineName } = getMachineDetails(machine);
        return (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full"
          >
            {machineName ? `${machineName} (${machineId})` : machineId}
          </span>
        );
      })}
    </div>
  );
}

// MODIFIED Function to fetch Preventive Maintenance from API (Server Component)
async function getPreventiveMaintenance(pmId: string): Promise<PreventiveMaintenance | null> {
  console.log(`[SERVER_FETCH] Initiating fetch for PM ID: ${pmId}`);

  // 1. Get the server-side session
  const session = await getServerSession(authOptions);

  // 2. Extract the access token
  // Make sure your NextAuth callbacks populate session.user.accessToken
  const accessToken = session?.user?.accessToken as string | undefined;

  if (!accessToken) {
    console.error(`[SERVER_FETCH] No access token found in session for PM ID: ${pmId}. User might not be authenticated or token is missing in session.`);
    // For a protected route, typically you wouldn't proceed.
    // Throwing an error or returning null will lead to notFound() or an error boundary.
    return null; // Or throw new Error("Authentication required");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
                 (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");
  const targetUrl = `${apiUrl}/api/preventive-maintenance/${pmId}/`;
  console.log(`[SERVER_FETCH] Fetching URL: ${targetUrl} with token.`);

  try {
    const response = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // 3. Include the Authorization header
      },
    });

    if (!response.ok) {
      console.error(`[SERVER_FETCH] API Error for PM ${pmId}: Status ${response.status} - ${response.statusText}`);
      if (response.status === 404) {
        return null;
      }
      // If it's 401, it means the token was rejected (e.g., expired and not refreshed server-side, or invalid)
      // A more advanced server-side flow might attempt a refresh here, but it's complex.
      // For now, a failed auth attempt will lead to an error.
      throw new Error(`Failed to fetch maintenance data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[SERVER_FETCH] Received maintenance data:", JSON.stringify(data, null, 2));
    return data as PreventiveMaintenance;
  } catch (error) {
    console.error(`[SERVER_FETCH] Exception while fetching maintenance data for ${pmId}:`, error);
    // Re-throw the error to be handled by Next.js (e.g., error page or notFound)
    throw error;
  }
}

// Define Params and SearchParams types
// Note: In Next.js App Router, props.params directly contains the route parameters.
// The Promise wrapping might be if you're using an older pattern or a specific library.
// For standard App Router, it's simpler:
// type PageProps = {
//   params: { pm_id: string };
//   searchParams?: { [key: string]: string | string[] | undefined };
// };
// For consistency with your provided code, I'll keep your types:
type Params = { pm_id: string }; // Simplified: `props.params` will be this type after awaiting.
type SearchParams = { [key: string]: string | string[] | undefined };

// Main Server Component
export default async function PreventiveMaintenanceDetailPage(props: {
  params: Promise<Params>; // If params is truly a promise
  searchParams: Promise<SearchParams>; // If searchParams is truly a promise
}) {
  // Await params if they are promises, otherwise access directly
  // Standard App Router: const pmId = props.params.pm_id;
  const awaitedParams = await props.params;
  // const awaitedSearchParams = await props.searchParams; // If you need them
  const pmId = awaitedParams.pm_id;

  let maintenanceData: PreventiveMaintenance | null = null;
  try {
    maintenanceData = await getPreventiveMaintenance(pmId);
  } catch (error: any) {
    console.error(`[PAGE_ERROR] Failed to load data for PM ${pmId}: ${error.message}`);
    // If getPreventiveMaintenance throws (e.g., for a 500 error or non-404/non-401 that we didn't handle as null),
    // this catch block will handle it. We can then decide to call notFound() or let Next.js show an error page.
    // If the error is critical and means data can't be shown, notFound() or a custom error display is appropriate.
  }

  if (!maintenanceData) {
    notFound(); // This will render the not-found.tsx file or a default 404 page
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        console.warn(`[formatDate] Invalid date string provided: ${dateString}`);
        return 'Invalid Date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Preventive Maintenance Details</h1>

       <Suspense fallback={<div className="text-center py-4">Loading interactive components...</div>}>
        <PreventiveMaintenanceClient maintenanceData={maintenanceData} />
      </Suspense>
    </div>
  );
}