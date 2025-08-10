// PDFMaintenanceGenerator.tsx

import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter,
  Printer,
  Building,
  Settings,
  Camera,
  ArrowLeft
} from 'lucide-react';
import { 
  PreventiveMaintenance, 
  MachineDetails,
  Topic,
  determinePMStatus,
  getImageUrl,
  getMachinesString,
  getLocationString,
  itemMatchesMachine
} from '@/app/lib/preventiveMaintenanceModels';
import { usePreventiveMaintenance } from '@/app/lib/PreventiveContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InitialFilters {
  status: string;
  frequency: string;
  search: string;
  startDate: string;
  endDate: string;
  machineId: string;
  page: number;
  pageSize: number;
}

interface PDFMaintenanceGeneratorProps {
  initialFilters?: InitialFilters;
}

interface MachineOption {
  id: string;
  label: string;
}

const PDFMaintenanceGenerator: React.FC<PDFMaintenanceGeneratorProps> = ({ 
  initialFilters 
}) => {
  const router = useRouter();
  
  // Get maintenance data from context
  const { maintenanceItems, fetchMaintenanceItems } = usePreventiveMaintenance();
  const maintenanceData = maintenanceItems || [];
  
  // Initialize filters with URL parameters or defaults
  const [filterStatus, setFilterStatus] = useState(initialFilters?.status || 'all');
  const [filterFrequency, setFilterFrequency] = useState(initialFilters?.frequency || 'all');
  const [filterMachine, setFilterMachine] = useState(initialFilters?.machineId || 'all');
  const [dateRange, setDateRange] = useState({ 
    start: initialFilters?.startDate || '', 
    end: initialFilters?.endDate || '' 
  });
  const [searchTerm, setSearchTerm] = useState(initialFilters?.search || '');
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeImages, setIncludeImages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [imageDataUrls, setImageDataUrls] = useState<{[key: string]: string}>({});
  const printRef = useRef(null);

  // Helper functions
  const getTaskStatus = (item: PreventiveMaintenance) => {
    return determinePMStatus(item);
  };

  const getTopicsString = (topics: Topic[] | number[] | null | undefined) => {
    if (!topics || topics.length === 0) return 'No topics';
    
    if (typeof topics[0] === 'object' && 'title' in topics[0]) {
      return (topics as Topic[]).map(topic => topic.title).join(', ');
    }
    
    return (topics as number[]).join(', ');
  };

  // Helper function to get safe image URL
  const getSafeImageUrl = (imageUrl: string | null | undefined): string | undefined => {
    if (!imageUrl) return undefined;
    const url = getImageUrl(imageUrl);
    return url || undefined;
  };

  // ✅ Updated getUniqueMachines function to provide better options
  const getUniqueMachines = (): MachineOption[] => {
    const machineOptions: MachineOption[] = [];
    const seen = new Set<string>();
    
    maintenanceData.forEach(item => {
      if (item.machines && Array.isArray(item.machines)) {
        item.machines.forEach(machine => {
          if (typeof machine === 'object' && machine !== null) {
            // Add machine_id option with name as label
            if (machine.machine_id && !seen.has(machine.machine_id)) {
              seen.add(machine.machine_id);
              machineOptions.push({
                id: machine.machine_id,
                label: `${machine.name} (${machine.machine_id})`
              });
            }
          }
        });
      }
    });
    
    return machineOptions.sort((a, b) => a.label.localeCompare(b.label));
  };

  // ✅ Updated client-side filtering with improved machine handling
  const filteredData = maintenanceData.filter((item: PreventiveMaintenance) => {
    const actualStatus = getTaskStatus(item);
    const statusMatch = filterStatus === 'all' || actualStatus === filterStatus;
    const frequencyMatch = filterFrequency === 'all' || item.frequency === filterFrequency;
    
    // ✅ Use improved itemMatchesMachine function
    const machineMatch = itemMatchesMachine(item, filterMachine);
    
    // Debug logging for machine filtering
    if (filterMachine !== 'all' && process.env.NODE_ENV === 'development') {
      console.log(`🔍 Filtering item ${item.pm_id} with machine filter "${filterMachine}":`, {
        matches: machineMatch,
        item_machines: item.machines?.map(m => ({ id: m.machine_id, name: m.name })),
        filter: filterMachine
      });
    }
    
    const searchMatch = !searchTerm || 
      item.pmtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pm_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getMachinesString(item.machines).toLowerCase().includes(searchTerm.toLowerCase());
    
    let dateMatch = true;
    if (dateRange.start && dateRange.end) {
      const itemDate = new Date(item.scheduled_date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      dateMatch = itemDate >= startDate && itemDate <= endDate;
    }
    
    const completedMatch = includeCompleted || actualStatus !== 'completed';
    
    return statusMatch && frequencyMatch && machineMatch && dateMatch && completedMatch && searchMatch;
  });

  // ✅ Test machine filtering function
  const testMachineFiltering = () => {
    console.log('🧪 Testing machine filtering...');
    
    const testFilters = ['M258B868202', 'M251594E2C3', 'M25ECAF24CF', 'FCU240', 'The Elevelator  No. 1'];
    
    testFilters.forEach(filter => {
      const matches = maintenanceData.filter(item => itemMatchesMachine(item, filter));
      console.log(`Filter "${filter}": ${matches.length} matches`);
      matches.forEach(item => {
        console.log(`  - ${item.pm_id}: ${item.machines?.map(m => `${m.name} (${m.machine_id})`).join(', ')}`);
      });
    });
  };

  // Convert image URL to base64 with proper proxy handling
  const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
    try {
      console.log('Converting image to base64:', imageUrl);
      
      // Create a canvas to convert the image
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataURL = canvas.toDataURL('image/jpeg', 0.8);
              console.log('Image converted successfully to base64');
              resolve(dataURL);
            } else {
              console.error('Could not get canvas context');
              resolve(imageUrl);
            }
          } catch (error) {
            console.error('Error drawing image to canvas:', error);
            resolve(imageUrl);
          }
        };
        
        img.onerror = (error) => {
          console.error('Error loading image:', error);
          resolve(imageUrl); // Fallback to original URL
        };
        
        // Set source after event listeners
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Error in convertImageToBase64:', error);
      return imageUrl;
    }
  };

  // Convert images to base64 when includeImages changes
  useEffect(() => {
    const convertImages = async () => {
      if (!includeImages || filteredData.length === 0) {
        setImageDataUrls({});
        return;
      }
      
      console.log('Starting image conversion...');
      const newImageDataUrls: {[key: string]: string} = {};
      
      try {
        for (const item of filteredData) {
          if (item.before_image_url) {
            const safeUrl = getSafeImageUrl(item.before_image_url);
            if (safeUrl) {
              console.log('Converting before image for item:', item.id);
              newImageDataUrls[`before_${item.id}`] = await convertImageToBase64(safeUrl);
            }
          }
          
          if (item.after_image_url) {
            const safeUrl = getSafeImageUrl(item.after_image_url);
            if (safeUrl) {
              console.log('Converting after image for item:', item.id);
              newImageDataUrls[`after_${item.id}`] = await convertImageToBase64(safeUrl);
            }
          }
        }
        
        console.log('Image conversion completed. Total images:', Object.keys(newImageDataUrls).length);
        setImageDataUrls(newImageDataUrls);
      } catch (error) {
        console.error('Error converting images:', error);
        setImageDataUrls({});
      }
    };

    convertImages();
  }, [filteredData, includeImages]);

  // Test filtering when data changes
  useEffect(() => {
    if (maintenanceData.length > 0 && process.env.NODE_ENV === 'development') {
      testMachineFiltering();
    }
  }, [maintenanceData]);

  // Fetch data with initial filters when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (initialFilters) {
        await fetchMaintenanceItems({
          status: initialFilters.status,
          frequency: initialFilters.frequency,
          search: initialFilters.search,
          start_date: initialFilters.startDate,
          end_date: initialFilters.endDate,
          machine_id: initialFilters.machineId,
          page: initialFilters.page,
          page_size: initialFilters.pageSize
        });
      }
      setIsLoading(false);
    };
    
    loadData();
  }, [initialFilters, fetchMaintenanceItems]);

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (item: PreventiveMaintenance) => {
    const status = getTaskStatus(item);
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get frequency color
  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'text-blue-600';
      case 'weekly': return 'text-green-600';
      case 'monthly': return 'text-yellow-600';
      case 'quarterly': return 'text-orange-600';
      case 'yearly': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Enhanced PDF generation with better centering and image handling
  const generatePDF = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) {
      console.error('PDF content element not found');
      return;
    }

    try {
      setIsGeneratingPDF(true);
      console.log('Starting PDF generation...');

      // Wait for images to load if they're included
      if (includeImages) {
        console.log('Waiting for images to load...');
        const images = element.querySelectorAll('img');
        
        await Promise.all(Array.from(images).map((img) => {
          return new Promise((resolve) => {
            if (img.complete && img.naturalHeight !== 0) {
              console.log('Image already loaded:', img.src.substring(0, 50) + '...');
              resolve(img);
            } else {
              console.log('Waiting for image to load:', img.src.substring(0, 50) + '...');
              
              const onLoad = () => {
                console.log('Image loaded successfully');
                resolve(img);
              };
              
              const onError = () => {
                console.warn('Image failed to load');
                resolve(img);
              };
              
              img.addEventListener('load', onLoad);
              img.addEventListener('error', onError);
              
              // Timeout after 10 seconds
              setTimeout(() => {
                console.warn('Image load timeout');
                resolve(img);
              }, 10000);
            }
          });
        }));
        
        // Additional wait for rendering
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('Capturing content with html2canvas...');
      
      // Get the actual content dimensions
      const elementWidth = element.scrollWidth;
      const elementHeight = element.scrollHeight;
      
      console.log('Element dimensions:', elementWidth, 'x', elementHeight);

      // Capture with html2canvas
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: elementWidth,
        height: elementHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: elementWidth,
        windowHeight: elementHeight,
        imageTimeout: 30000,
        removeContainer: true,
        foreignObjectRendering: false,
      });

      console.log('Canvas created, dimensions:', canvas.width, 'x', canvas.height);

      // Create PDF with proper centering
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // A4 dimensions in mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10; // 10mm margin on all sides
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);
      
      // Calculate scaling to fit content within margins
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Scale to fit width while maintaining aspect ratio
      const scale = contentWidth / (imgWidth * 0.264583); // Convert pixels to mm
      const scaledWidth = contentWidth;
      const scaledHeight = (imgHeight * 0.264583) * scale;
      
      console.log('PDF scaling:', scale, 'Scaled dimensions:', scaledWidth, 'x', scaledHeight);
      
      let position = margin; // Start with top margin
      let remainingHeight = scaledHeight;

      // Add first page with centered content
      pdf.addImage(imgData, 'PNG', margin, position, scaledWidth, scaledHeight);
      remainingHeight -= contentHeight;

      // Add additional pages if content is longer than one page
      while (remainingHeight > 0) {
        position = -(scaledHeight - remainingHeight) + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, scaledWidth, scaledHeight);
        remainingHeight -= contentHeight;
      }

      // Save the PDF
      const fileName = `preventive-maintenance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Saving PDF:', fileName);
      pdf.save(fileName);

      console.log('PDF generation completed successfully');

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Download as HTML file
  const downloadHTML = () => {
    const htmlContent = document.getElementById('pdf-content')?.outerHTML;
    if (!htmlContent) return;
    
    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preventive Maintenance List</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6; 
            background: #ffffff;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #ccc; 
            padding-bottom: 20px; 
          }
          .summary { 
            margin-bottom: 30px; 
            background: #f9f9f9; 
            padding: 15px; 
            border-radius: 8px; 
          }
          .maintenance-item { 
            margin-bottom: 20px; 
            border: 1px solid #ddd; 
            padding: 15px; 
            border-radius: 8px; 
            page-break-inside: avoid; 
          }
          .text-green-600 { color: #16a34a; }
          .text-yellow-600 { color: #ca8a04; }
          .text-red-600 { color: #dc2626; }
          .text-blue-600 { color: #2563eb; }
          .text-orange-600 { color: #ea580c; }
          .text-gray-600 { color: #4b5563; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            page-break-inside: avoid; 
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
            font-size: 12px; 
          }
          th { 
            background-color: #f2f2f2; 
            font-weight: bold; 
          }
          .grid { display: grid; gap: 16px; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
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
          .mt-1 { margin-top: 4px; }
          .mt-3 { margin-top: 12px; }
          .mt-4 { margin-top: 16px; }
          .pt-3 { padding-top: 12px; }
          .border-t { border-top: 1px solid #e5e7eb; }
          .capitalize { text-transform: capitalize; }
          .text-center { text-align: center; }
          img { 
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
            border: 1px solid #ddd; 
            display: block;
            margin: 0 auto;
          }
          .image-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 16px; 
          }
          @media print {
            body { margin: 0; font-size: 12px; }
            .no-print { display: none !important; }
            .maintenance-item { page-break-inside: avoid; }
            img { max-height: 150px; }
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
    a.download = `preventive-maintenance-list-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading maintenance data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Controls Section - Hidden in print */}
      <div className="no-print mb-8 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              href="/dashboard/preventive-maintenance"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              Generate Maintenance PDF Report
            </h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Generate PDF
                </>
              )}
            </button>
            <button
              onClick={downloadHTML}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download HTML
            </button>
          </div>
        </div>

        {/* Show applied filters */}
        {initialFilters && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Applied Filters from Main Page:</h3>
            <div className="text-sm text-blue-800 space-y-1">
              {initialFilters.status && <div>Status: <span className="font-medium capitalize">{initialFilters.status}</span></div>}
              {initialFilters.frequency && <div>Frequency: <span className="font-medium capitalize">{initialFilters.frequency}</span></div>}
              {initialFilters.machineId && <div>Machine: <span className="font-medium">{initialFilters.machineId}</span></div>}
              {initialFilters.search && <div>Search: <span className="font-medium">"{initialFilters.search}"</span></div>}
              {initialFilters.startDate && <div>Start Date: <span className="font-medium">{initialFilters.startDate}</span></div>}
              {initialFilters.endDate && <div>End Date: <span className="font-medium">{initialFilters.endDate}</span></div>}
            </div>
          </div>
        )}

        {/* Additional Filters for PDF */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Override Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Override Frequency Filter</label>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Frequencies</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* ✅ Updated machine filter dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Override Machine Filter</label>
            <select
              value={filterMachine}
              onChange={(e) => {
                console.log('Machine filter changed to:', e.target.value);
                setFilterMachine(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Machines</option>
              {getUniqueMachines().map(machine => (
                <option key={machine.id} value={machine.id}>
                  {machine.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Override Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Override Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Override End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 mr-2"
            />
            Include Completed Tasks
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 mr-2"
            />
            Include Detailed Descriptions
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

        {/* Data Status */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Data Status:</strong> Found {maintenanceData.length} total maintenance records, 
            showing {filteredData.length} after filters
            {maintenanceData.length === 0 && " - No data available. Make sure maintenance records are loaded."}
            {includeImages && Object.keys(imageDataUrls).length > 0 && (
              <span className="block mt-1">
            <strong>Images:</strong> {Object.keys(imageDataUrls).length} images converted to base64
             </span>
           )}
         </p>
       </div>

       {/* ✅ Debug Info Section - Only show in development */}
       {process.env.NODE_ENV === 'development' && (
         <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
           <h4 className="font-medium text-yellow-900 mb-2">🧪 Debug Info:</h4>
           <div className="text-sm text-yellow-800 space-y-1">
             <div>Total items: {maintenanceData.length}</div>
             <div>Filtered items: {filteredData.length}</div>
             <div>Machine filter: {filterMachine}</div>
             <div>Available machines: {getUniqueMachines().length}</div>
             {filterMachine !== 'all' && (
               <div className="mt-2">
                 <div className="font-medium">Items matching machine filter "{filterMachine}":</div>
                 {maintenanceData.filter(item => itemMatchesMachine(item, filterMachine)).map(item => (
                   <div key={item.pm_id} className="ml-4 text-xs">
                     {item.pm_id}: {item.machines?.map(m => `${m.name} (${m.machine_id})`).join(', ')}
                   </div>
                 ))}
               </div>
             )}
             <details className="mt-2">
               <summary className="cursor-pointer font-medium">Available Machine Options</summary>
               <div className="ml-4 mt-1 text-xs">
                 {getUniqueMachines().map(machine => (
                   <div key={machine.id}>{machine.id} → {machine.label}</div>
                 ))}
               </div>
             </details>
           </div>
         </div>
       )}
     </div>

     {/* PDF Content - Fixed width and centering */}
     <div 
       id="pdf-content" 
       ref={printRef} 
       className="bg-white mx-auto"
       style={{ 
         width: '794px', // A4 width in pixels at 96 DPI
         maxWidth: '100%',
         padding: '40px',
         fontFamily: 'Arial, sans-serif',
         lineHeight: '1.6',
         color: '#000000'
       }}
     >
       {/* Header */}
       <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
         <h1 className="text-3xl font-bold text-gray-900 mb-2">Preventive Maintenance Report</h1>
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

      {/* Summary Statistics */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Summary Statistics
        </h2>
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="text-center">
           <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
           <div className="text-sm text-gray-600">Total Tasks</div>
         </div>
         <div className="text-center">
           <div className="text-2xl font-bold text-green-600">
             {filteredData.filter(item => getTaskStatus(item) === 'completed').length}
           </div>
           <div className="text-sm text-gray-600">Completed</div>
         </div>
         <div className="text-center">
           <div className="text-2xl font-bold text-yellow-600">
             {filteredData.filter(item => getTaskStatus(item) === 'pending').length}
           </div>
           <div className="text-sm text-gray-600">Pending</div>
         </div>
         <div className="text-center">
           <div className="text-2xl font-bold text-red-600">
             {filteredData.filter(item => getTaskStatus(item) === 'overdue').length}
           </div>
           <div className="text-sm text-gray-600">Overdue</div>
         </div>
       </div>
     </div>

     {/* Maintenance Tasks Table */}
     {filteredData.length > 0 && (
       <div className="mb-8">
         <h2 className="text-xl font-semibold mb-4 flex items-center">
           <CheckCircle className="h-5 w-5 mr-2" />
           Maintenance Tasks
         </h2>
         
         <div className="overflow-x-auto">
           <table className="w-full border-collapse border border-gray-300">
             <thead>
               <tr className="bg-gray-100">
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Task ID</th>
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Title</th>
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Date</th>
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Status</th>
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Frequency</th>
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Machines</th>
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Topics</th>
                 <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Location</th>
               </tr>
             </thead>
             <tbody>
               {filteredData.map((item) => (
                 <tr key={item.id}>
                   <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{item.pm_id}</td>
                   <td className="border border-gray-300 px-3 py-2 font-medium text-xs">
                     {item.pmtitle || 'No title'}
                   </td>
                   <td className="border border-gray-300 px-3 py-2 text-xs">{formatDate(item.scheduled_date)}</td>
                   <td className={`border border-gray-300 px-3 py-2 font-medium text-xs ${getStatusColor(item)}`}>
                     <span className="capitalize">{getTaskStatus(item)}</span>
                   </td>
                   <td className={`border border-gray-300 px-3 py-2 font-medium text-xs ${getFrequencyColor(item.frequency)}`}>
                     <span className="capitalize">{item.frequency}</span>
                   </td>
                   <td className="border border-gray-300 px-3 py-2 text-xs">
                     {getMachinesString(item.machines)}
                   </td>
                   <td className="border border-gray-300 px-3 py-2 text-xs">
                     {getTopicsString(item.topics)}
                   </td>
                   <td className="border border-gray-300 px-3 py-2 text-xs">
                     {getLocationString(item)}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     )}

     {/* Detailed View Section */}
     {includeDetails && filteredData.length > 0 && (
       <div className="mb-8">
         <h2 className="text-xl font-semibold mb-6 flex items-center">
           <AlertCircle className="h-5 w-5 mr-2" />
           Detailed Task Information
         </h2>
         
         {filteredData.map((item) => (
           <div key={item.id} className="mb-6 border border-gray-300 rounded-lg p-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-2">
                   {item.pmtitle || 'No title'} ({item.pm_id})
                 </h3>
                 <div className="space-y-1 text-sm">
                   <div><strong>Scheduled Date:</strong> {formatDate(item.scheduled_date)}</div>
                   <div><strong>Status:</strong> <span className={`font-medium ${getStatusColor(item)} capitalize`}>{getTaskStatus(item)}</span></div>
                   <div><strong>Frequency:</strong> <span className={`font-medium ${getFrequencyColor(item.frequency)} capitalize`}>{item.frequency}</span></div>
                 </div>
               </div>
               <div>
                 <div className="space-y-1 text-sm">
                   <div><strong>Machines:</strong> {getMachinesString(item.machines)}</div>
                   <div><strong>Topics:</strong> {getTopicsString(item.topics)}</div>
                   <div><strong>Location:</strong> {getLocationString(item)}</div>
                 </div>
               </div>
             </div>
             
             {item.notes && (
               <div className="border-t border-gray-200 pt-3">
                 <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                 <p className="text-sm text-gray-700">{item.notes}</p>
               </div>
             )}

             {includeImages && (item.before_image_url || item.after_image_url) && (
               <div className="border-t border-gray-200 pt-3 mt-3">
                 <h4 className="font-medium text-gray-900 mb-3">Images:</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {item.before_image_url && (
                     <div>
                       <p className="text-sm font-medium text-gray-700 mb-2">Before:</p>
                       <img 
                         src={imageDataUrls[`before_${item.id}`] || getSafeImageUrl(item.before_image_url)} 
                         alt="Before maintenance"
                         className="w-full h-auto rounded border border-gray-300"
                         style={{ 
                           maxHeight: '250px', 
                           objectFit: 'contain',
                           display: 'block',
                           margin: '0 auto',
                           backgroundColor: '#f9f9f9'
                         }}
                         crossOrigin="anonymous"
                         onLoad={(e) => {
                           console.log('Before image loaded for item:', item.id);
                           e.currentTarget.style.backgroundColor = 'transparent';
                         }}
                         onError={(e) => {
                           console.warn('Failed to load before image for item:', item.id);
                           e.currentTarget.style.display = 'none';
                         }}
                       />
                     </div>
                   )}
                   {item.after_image_url && (
                     <div>
                       <p className="text-sm font-medium text-gray-700 mb-2">After:</p>
                       <img 
                         src={imageDataUrls[`after_${item.id}`] || getSafeImageUrl(item.after_image_url)} 
                         alt="After maintenance"
                         className="w-full h-auto rounded border border-gray-300"
                         style={{ 
                           maxHeight: '250px', 
                           objectFit: 'contain',
                           display: 'block',
                           margin: '0 auto',
                           backgroundColor: '#f9f9f9'
                         }}
                         crossOrigin="anonymous"
                         onLoad={(e) => {
                           console.log('After image loaded for item:', item.id);
                           e.currentTarget.style.backgroundColor = 'transparent';
                         }}
                         onError={(e) => {
                           console.warn('Failed to load after image for item:', item.id);
                           e.currentTarget.style.display = 'none';
                         }}
                       />
                     </div>
                   )}
                 </div>
               </div>
             )}
           </div>
         ))}
       </div>
     )}

     {/* Footer */}
     <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-500">
       <p>This report was automatically generated by the Facility Management System</p>
       <p>© 2025 - Confidential and Proprietary Information</p>
     </div>
   </div>

   {/* No data message */}
   {filteredData.length === 0 && (
     <div className="no-print text-center py-12">
       <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
       <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance tasks found</h3>
       <p className="text-gray-600">
         {maintenanceData.length === 0 
           ? "No maintenance data is available. Please ensure maintenance records are loaded."
           : "Try adjusting your filters to see more results."
         }
       </p>
     </div>
   )}
 </div>
);
};

export default PDFMaintenanceGenerator;