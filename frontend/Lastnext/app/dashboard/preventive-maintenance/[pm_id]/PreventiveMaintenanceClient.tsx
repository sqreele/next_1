// app/dashboard/preventive-maintenance/[pm_id]/PreventiveMaintenanceClient.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { 
  PreventiveMaintenance, 
  getImageUrl 
} from '@/app/lib/preventiveMaintenanceModels';
// Modify the import statement to include Wrench instead of Tools
import { AlertCircle, Calendar, Clipboard, Wrench, X, ZoomIn } from 'lucide-react';

interface PreventiveMaintenanceClientProps {
  maintenanceData: PreventiveMaintenance;
}

export default function PreventiveMaintenanceClient({ maintenanceData }: PreventiveMaintenanceClientProps) {
  const { data: session, status } = useSession();  
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImageAlt, setCurrentImageAlt] = useState<string>('');
  
  // State for completion functionality (if needed)
  const [isCompleting, setIsCompleting] = useState(false);

  // ฟังก์ชันสำหรับการยืนยันการลบ
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this maintenance record?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/preventive-maintenance/${maintenanceData.pm_id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to delete maintenance record');
      }

      router.push('/dashboard/preventive-maintenance');
      router.refresh(); // Refresh the Next.js cache
    } catch (err: any) {
      console.error('Error deleting maintenance:', err);
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to mark maintenance as complete (if needed)
  const handleMarkComplete = async () => {
    if (!window.confirm('Mark this maintenance task as completed?')) {
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/preventive-maintenance/${maintenanceData.pm_id}/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed_date: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to complete maintenance record');
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (err: any) {
      console.error('Error completing maintenance:', err);
      setError(err.message || 'An error occurred while marking as complete');
    } finally {
      setIsCompleting(false);
    }
  };

  // ใช้ฟังก์ชัน getImageUrl จาก models
  const getBeforeImageUrl = (): string | null => {
    // ถ้ามี URL โดยตรงให้ใช้ URL นั้น
    if (maintenanceData.before_image_url) {
      return maintenanceData.before_image_url;
    }
    
    // ถ้าไม่มี URL โดยตรงแต่มี object before_image ให้ใช้ฟังก์ชัน getImageUrl
    if (maintenanceData.before_image) {
      return getImageUrl(maintenanceData.before_image);
    }
    
    return null;
  };

  const getAfterImageUrl = (): string | null => {
    // ถ้ามี URL โดยตรงให้ใช้ URL นั้น
    if (maintenanceData.after_image_url) {
      return maintenanceData.after_image_url;
    }
    
    // ถ้าไม่มี URL โดยตรงแต่มี object after_image ให้ใช้ฟังก์ชัน getImageUrl
    if (maintenanceData.after_image) {
      return getImageUrl(maintenanceData.after_image);
    }
    
    return null;
  };

  // Open image in modal for better viewing
  const openImageModal = (imageUrl: string | null, altText: string) => {
    if (!imageUrl) return;
    setCurrentImage(imageUrl);
    setCurrentImageAlt(altText);
    setIsImageModalOpen(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setCurrentImage(null);
  };

  // ตัวแปรสำหรับ URL รูปภาพ
  const beforeImageUrl = getBeforeImageUrl();
  const afterImageUrl = getAfterImageUrl();
  
  // Helper function to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Determine if maintenance is overdue
  const isOverdue = !maintenanceData.completed_date && 
    new Date(maintenanceData.scheduled_date) < new Date();
    
  // Determine status text and color
  const getStatusText = () => {
    if (maintenanceData.completed_date) {
      return { text: 'Completed', color: 'bg-green-100 text-green-800' };
    } else if (isOverdue) {
      return { text: 'Overdue', color: 'bg-red-100 text-red-800' };
    } else {
      return { text: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' };
    }
  };
  
  const statusInfo = getStatusText();

  // Render machine list helper function
// Render machine list helper function
const renderMachines = () => {
  if (!maintenanceData.machines || maintenanceData.machines.length === 0) {
    return <p className="text-gray-500 italic">No machines assigned</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {maintenanceData.machines.map((machine, index) => {
        // Handle different machine data formats
        const machineId = typeof machine === 'object' ? machine.machine_id : machine;
        const machineName = typeof machine === 'object' ? machine.name : null;
        
        return (
          <div 
            key={index} 
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-800 text-sm rounded-lg"
          >
            <Wrench className="h-4 w-4 mr-2 text-gray-600" /> {/* Changed from Tools to Wrench */}
            {machineName ? `${machineName} (${machineId})` : machineId}
          </div>
        );
      })}
    </div>
  );
};

  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="border-b pb-4 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Maintenance Details</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Maintenance ID and Property ID row */}
            <div className="flex items-center">
              <Clipboard className="h-4 w-4 mr-2 text-gray-600" />
              <span className="text-gray-600 mr-2">Maintenance ID:</span>
              <span className="font-medium">{maintenanceData.pm_id}</span>
            </div>
            
            {maintenanceData.property_id && (
              <div className="flex items-center">
                <Clipboard className="h-4 w-4 mr-2 text-gray-600" />
                <span className="text-gray-600 mr-2">Property ID:</span>
                <span className="font-medium">{maintenanceData.property_id}</span>
              </div>
            )}
            
            {/* Scheduled and Completed Date row */}
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-600" />
              <span className="text-gray-600 mr-2">Scheduled:</span>
              <span className="font-medium">{formatDate(maintenanceData.scheduled_date)}</span>
            </div>
            
            {maintenanceData.completed_date && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                <span className="text-gray-600 mr-2">Completed:</span>
                <span className="font-medium">{formatDate(maintenanceData.completed_date)}</span>
              </div>
            )}
            
            {/* Next Due Date (if present) */}
            {maintenanceData.next_due_date && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                <span className="text-gray-600 mr-2">Next Due:</span>
                <span className="font-medium">{formatDate(maintenanceData.next_due_date)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Associated Machines Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Associated Machines</h3>
          {renderMachines()}
        </div>
        
        {/* Images Section */}
        <h3 className="text-lg font-semibold mb-3">Maintenance Images</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {beforeImageUrl ? (
            <div>
              <p className="text-gray-600 text-sm mb-2">Before Maintenance:</p>
              <div 
                className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden cursor-pointer group"
                onClick={() => openImageModal(beforeImageUrl, 'Before Maintenance')}
              >
                <img
                  src={beforeImageUrl}
                  alt="Before Maintenance"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all duration-200">
                  <div className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-75 rounded-full p-2 transition-opacity">
                    <ZoomIn className="h-6 w-6 text-gray-800" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-md">
              <p className="text-gray-500 italic">No before image</p>
            </div>
          )}

          {afterImageUrl ? (
            <div>
              <p className="text-gray-600 text-sm mb-2">After Maintenance:</p>
              <div 
                className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden cursor-pointer group"
                onClick={() => openImageModal(afterImageUrl, 'After Maintenance')}
              >
                <img
                  src={afterImageUrl}
                  alt="After Maintenance"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all duration-200">
                  <div className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-75 rounded-full p-2 transition-opacity">
                    <ZoomIn className="h-6 w-6 text-gray-800" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-md">
              <p className="text-gray-500 italic">No after image</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Link
            href="/dashboard/preventive-maintenance"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
          >
            Back to List
          </Link>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {/* Complete button - show only if not already completed */}
            {!maintenanceData.completed_date && (
              <button
                onClick={handleMarkComplete}
                disabled={isCompleting}
                className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  isCompleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isCompleting ? 'Completing...' : 'Mark Complete'}
              </button>
            )}
            
            <Link
              href={`/dashboard/preventive-maintenance/edit/${maintenanceData.pm_id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Image modal */}
      {isImageModalOpen && currentImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-screen w-full h-full flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 bg-white rounded-full p-2 z-10 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                closeImageModal();
              }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img 
              src={currentImage} 
              alt={currentImageAlt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}