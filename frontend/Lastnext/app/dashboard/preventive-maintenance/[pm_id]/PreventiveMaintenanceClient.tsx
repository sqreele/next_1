// app/dashboard/preventive-maintenance/[pm_id]/PreventiveMaintenanceClient.tsx

'use client';
import { preventiveMaintenanceService } from '@/app/lib/PreventiveMaintenanceService';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { 
  PreventiveMaintenance, 
  getImageUrl,
  determinePMStatus 
} from '@/app/lib/preventiveMaintenanceModels';
import { 
  AlertCircle, 
  Calendar, 
  Clipboard, 
  Wrench, 
  X, 
  ZoomIn,
  FileText,
  Download,
  Printer,
  Settings,
  Building,
  Camera
} from 'lucide-react';

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
  const [isCompleting, setIsCompleting] = useState(false);
  
  // PDF Generation States
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [imageLoadStatus, setImageLoadStatus] = useState<{before: boolean, after: boolean}>({before: false, after: false});
  const printRef = useRef(null);

  // ฟังก์ชันสำหรับการยืนยันการลบ
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this maintenance record?')) {
      return;
    }
  
    setIsLoading(true);
    setError(null);
  
    try {
      const response = await preventiveMaintenanceService.deletePreventiveMaintenance(maintenanceData.pm_id);
  
      if (response.success) {
        router.push('/dashboard/preventive-maintenance');
        router.refresh();
      } else {
        throw new Error(response.message || 'Failed to delete maintenance record');
      }
    } catch (err: any) {
      console.error('Error deleting maintenance:', err);
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Function to mark maintenance as complete
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

      router.refresh();
    } catch (err: any) {
      console.error('Error completing maintenance:', err);
      setError(err.message || 'An error occurred while marking as complete');
    } finally {
      setIsCompleting(false);
    }
  };

  // PDF Generation Functions
  const convertImageToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Failed to convert image to base64:', error);
      return url; // Fallback to original URL
    }
  };

  const generatePDF = async () => {
    // Convert images to base64 for better PDF compatibility
    if (includeImages) {
      const pdfContent = document.getElementById('pdf-content');
      if (pdfContent) {
        const images = pdfContent.querySelectorAll('img');
        for (const img of images) {
          try {
            const base64 = await convertImageToBase64(img.src);
            img.src = base64;
          } catch (error) {
            console.warn('Failed to convert image:', error);
          }
        }
      }
    }

    // Preload images before printing to ensure they appear in PDF
    const preloadImages = async () => {
      const imagePromises: Promise<void>[] = [];
      
      if (includeImages) {
        if (beforeImageUrl) {
          imagePromises.push(
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve(); // Continue even if image fails
              img.src = beforeImageUrl;
            })
          );
        }
        
        if (afterImageUrl) {
          imagePromises.push(
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve(); // Continue even if image fails
              img.src = afterImageUrl;
            })
          );
        }
      }
      
      await Promise.all(imagePromises);
    };

    // Wait for images to load, then print
    await preloadImages();
    
    // Small delay to ensure images are rendered
    setTimeout(() => {
      window.print();
    }, 1000); // Increased delay for better image loading
  };

  const downloadHTML = () => {
    const htmlContent = document.getElementById('pdf-content')?.outerHTML;
    if (!htmlContent) return;
    
    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Maintenance Record - ${maintenanceData.pm_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ccc; padding-bottom: 20px; }
          .maintenance-item { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
          .text-green-600 { color: #16a34a; }
          .text-yellow-600 { color: #ca8a04; }
          .text-red-600 { color: #dc2626; }
          .text-blue-600 { color: #2563eb; }
          .text-gray-600 { color: #4b5563; }
          .grid { display: grid; gap: 16px; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: bold; }
          .text-sm { font-size: 14px; }
          .text-lg { font-size: 18px; }
          .text-xl { font-size: 20px; }
          .text-2xl { font-size: 24px; }
          .text-3xl { font-size: 30px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-3 { margin-top: 12px; }
          .pt-3 { padding-top: 12px; }
          .border-t { border-top: 1px solid #e5e7eb; }
          .capitalize { text-transform: capitalize; }
          .text-center { text-align: center; }
          .hidden { display: none; }
          img { 
            max-width: 100%; 
            max-height: 300px; 
            height: auto; 
            border-radius: 8px; 
            border: 1px solid #ddd; 
            display: block;
            margin: 0 auto;
            background: white;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          @media print {
            body { margin: 0; font-size: 12px; }
            .maintenance-item { page-break-inside: avoid; }
            img { 
              max-height: 250px !important; 
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
          @media screen and (max-width: 768px) {
            .grid-cols-2 { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-record-${maintenanceData.pm_id}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Image URL functions
  const getBeforeImageUrl = (): string | null => {
    if (maintenanceData.before_image_url) {
      return maintenanceData.before_image_url;
    }
    return null;
  };

  const getAfterImageUrl = (): string | null => {
    if (maintenanceData.after_image_url) {
      return maintenanceData.after_image_url;
    }
    return null;
  };

  // Open image in modal
  const openImageModal = (imageUrl: string | null, altText: string) => {
    if (!imageUrl) return;
    setCurrentImage(imageUrl);
    setCurrentImageAlt(altText);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setCurrentImage(null);
  };

  const beforeImageUrl = getBeforeImageUrl();
  const afterImageUrl = getAfterImageUrl();
  
  // Helper function to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Status functions
  const getTaskStatus = () => {
    return determinePMStatus ? determinePMStatus(maintenanceData) : 
           (maintenanceData.completed_date ? 'completed' : 
            (new Date(maintenanceData.scheduled_date) < new Date() ? 'overdue' : 'pending'));
  };

  const isOverdue = !maintenanceData.completed_date && 
    new Date(maintenanceData.scheduled_date) < new Date();
    
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

  // Get status color for PDF
  const getStatusColor = () => {
    const status = getTaskStatus();
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Render machine list
  const renderMachines = () => {
    if (!maintenanceData.machines || maintenanceData.machines.length === 0) {
      return <p className="text-gray-500 italic">No machines assigned</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {maintenanceData.machines.map((machine, index) => {
          const machineId = typeof machine === 'object' ? machine.machine_id : machine;
          const machineName = typeof machine === 'object' ? machine.name : null;
          
          return (
            <div 
              key={index} 
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-800 text-sm rounded-lg"
            >
              <Wrench className="h-4 w-4 mr-2 text-gray-600" />
              {machineName ? `${machineName} (${machineId})` : machineId}
            </div>
          );
        })}
      </div>
    );
  };

  const getMachinesString = () => {
    if (!maintenanceData.machines || maintenanceData.machines.length === 0) {
      return 'No machines assigned';
    }
    
    return maintenanceData.machines.map(machine => {
      if (typeof machine === 'string') {
        return machine;
      }
      const machineWithLocation = machine as any;
      const name = machine.name || machine.machine_id;
      const location = machineWithLocation.location ? ` (${machineWithLocation.location})` : '';
      return `${name}${location}`;
    }).join(', ');
  };

  const getTopicsString = () => {
    const topics = maintenanceData.topics;
    if (!topics || topics.length === 0) return 'No topics';
    
    if (typeof topics[0] === 'object' && 'title' in topics[0]) {
      return (topics as any[]).map(topic => topic.title).join(', ');
    }
    
    // Handle case where topics are numbers (IDs)
    return (topics as unknown as number[]).join(', ');
  };

  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6">
        {/* Header with PDF Options */}
        <div className="border-b pb-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Maintenance Details</h2>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
              
              {/* PDF Generation Button */}
              <button
                onClick={() => setShowPDFOptions(!showPDFOptions)}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors"
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF Report
              </button>
            </div>
          </div>

          {/* PDF Options Panel */}
          {showPDFOptions && (
            <div className="no-print mb-4 bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  PDF Generation Options
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={generatePDF}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    Print PDF
                  </button>
                  <button
                    onClick={downloadHTML}
                    className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download HTML
                  </button>
                  <button
                    onClick={() => {
                      const pdfContent = document.getElementById('pdf-content');
                      if (pdfContent) {
                        pdfContent.style.display = 'block';
                        pdfContent.style.position = 'relative';
                        pdfContent.style.zIndex = '1000';
                        pdfContent.style.background = 'white';
                        pdfContent.style.border = '2px solid red';
                        setTimeout(() => {
                          pdfContent.style.display = 'none';
                        }, 5000);
                      }
                    }}
                    className="flex items-center px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
                  >
                    Test View
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 mr-2"
                  />
                  Include Detailed Information
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 mr-2"
                  />
                  Include Before/After Images
                </label>
              </div>
              
              {/* Debug Information */}
              <div className="mt-3 text-xs text-gray-500">
                <p><strong>Debug Info:</strong></p>
                <p>Before Image URL: {beforeImageUrl ? '✓ Available' : '✗ Missing'}</p>
                <p>After Image URL: {afterImageUrl ? '✓ Available' : '✗ Missing'}</p>
                {beforeImageUrl && <p className="truncate">Before: {beforeImageUrl}</p>}
                {afterImageUrl && <p className="truncate">After: {afterImageUrl}</p>}
              </div>
            </div>
          )}
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* PDF Content (Hidden on screen, visible when printing) */}
      <div id="pdf-content" ref={printRef} className="hidden print:block bg-white">
        {/* Header */}
        <div className="header text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance Record Report</h1>
          <p className="text-gray-600">Generated on {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <div className="flex justify-center items-center mt-4 text-sm text-gray-500">
            <Building className="h-4 w-4 mr-2" />
            Facility Management System
          </div>
        </div>

        {/* Maintenance Details */}
        <div className="maintenance-item border border-gray-300 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {maintenanceData.pmtitle || 'Maintenance Task'}
              </h2>
              <p className="text-sm text-gray-600">ID: {maintenanceData.pm_id}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {getTaskStatus().toUpperCase()}
            </span>
          </div>

          {includeDetails && (
            <>
              {(maintenanceData as any).job_description && (
                <div className="mb-4">
                  <span className="font-medium text-gray-600">Description:</span>
                  <p className="text-gray-700 mt-1">{(maintenanceData as any).job_description}</p>
                </div>
              )}

              {maintenanceData.notes && (
                <div className="mb-4">
                  <span className="font-medium text-gray-600">Notes:</span>
                  <p className="text-gray-700 mt-1">{maintenanceData.notes}</p>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="font-medium text-gray-600">Scheduled:</span>
              <p>{formatDate(maintenanceData.scheduled_date)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Frequency:</span>
              <p className="capitalize">{maintenanceData.frequency}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Topics:</span>
              <p>{getTopicsString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Next Due:</span>
              <p>{maintenanceData.next_due_date ? formatDate(maintenanceData.next_due_date) : 'N/A'}</p>
            </div>
          </div>

          <div className="mb-4">
            <span className="font-medium text-gray-600">Machines:</span>
            <p className="text-gray-700 mt-1">{getMachinesString()}</p>
          </div>

          {maintenanceData.property_id && (
            <div className="mb-4">
              <span className="font-medium text-gray-600">Property ID:</span>
              <p className="text-gray-700 mt-1">{maintenanceData.property_id}</p>
            </div>
          )}

          {maintenanceData.completed_date && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="font-medium text-green-600">
                Completed on: {formatDate(maintenanceData.completed_date)}
              </span>
            </div>
          )}

          {includeImages && (beforeImageUrl || afterImageUrl) && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-700 mb-4 flex items-center">
                <Camera className="h-4 w-4 mr-2" />
                Maintenance Images
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {beforeImageUrl && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-2">Before:</span>
                    <img 
                      src={beforeImageUrl} 
                      alt="Before maintenance" 
                      className="w-full max-h-64 object-contain rounded-lg border border-gray-300"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'block';
                        }
                      }}
                      onLoad={(e: any) => {
                        // Ensure image is visible when it loads successfully
                        e.target.style.display = 'block';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'none';
                        }
                      }}
                    />
                    <div className="hidden w-full h-48 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Before image unavailable</span>
                    </div>
                  </div>
                )}
                {afterImageUrl && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-2">After:</span>
                    <img 
                      src={afterImageUrl} 
                      alt="After maintenance" 
                      className="w-full max-h-64 object-contain rounded-lg border border-gray-300"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'block';
                        }
                      }}
                      onLoad={(e: any) => {
                        // Ensure image is visible when it loads successfully
                        e.target.style.display = 'block';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'none';
                        }
                      }}
                    />
                    <div className="hidden w-full h-48 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">After image unavailable</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-500">
          <p>This report was automatically generated by the Facility Management System</p>
          <p>© 2025 - Confidential and Proprietary Information</p>
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

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          #pdf-content {
            display: block !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          img {
            max-height: 300px !important;
            max-width: 100% !important;
            page-break-inside: avoid;
            display: block !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .maintenance-item {
            page-break-inside: avoid;
          }
          .hidden {
            display: none !important;
          }
        }
        
        @media screen {
          #pdf-content {
            display: none;
          }
        }
        
        /* Ensure images load properly */
        #pdf-content img {
          background: white;
        }
      `}</style>
    </>
  );
}