"use client";

import React, { useState, useCallback, useMemo, MouseEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { UpdateStatusModal } from "./UpdateStatusModal";
import { Job, JobStatus, Property } from "@/app/lib/types";
import { LazyImage } from "@/app/components/jobs/LazyImage";
import { 
  Clock, Calendar, User, MapPin, MessageSquare, CheckCircle2, 
  AlertCircle, ClipboardList, StickyNote, AlertTriangle, 
  ChevronDown, ChevronUp 
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";
import { useProperty } from "@/app/lib/PropertyContext";

interface JobCardProps {
  job: Job;
  properties?: Property[];
}

export function JobCard({ job, properties = [] }: JobCardProps) {
  const router = useRouter();
  const { selectedProperty } = useProperty();
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [expandedSections, setExpandedSections] = useState({
    details: false,
    timestamps: false,
    remarks: false,
  });

  const toggleSection = useCallback((section: keyof typeof expandedSections, e: MouseEvent) => {
    e.stopPropagation();
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const getPropertyName = useCallback((): string => {
    const jobProperties = [
      ...(job.profile_image?.properties || []),
      ...(job.properties || []),
      ...(job.rooms?.flatMap(room => room.properties || []) || []),
    ];

    if (selectedProperty) {
      const matchingProperty = jobProperties.find(
        prop =>
          typeof prop === 'object' && 'property_id' in prop
            ? String(prop.property_id) === selectedProperty
            : String(prop) === selectedProperty
      );

      if (matchingProperty) {
        if (typeof matchingProperty === 'object' && 'name' in matchingProperty) {
          return matchingProperty.name as string;
        }
        const fullProperty = properties.find(p => String(p.property_id) === selectedProperty);
        return fullProperty?.name || 'N/A';
      }
    }

    const firstMatchingProperty = jobProperties.find(
      prop => typeof prop === 'object' && 'name' in prop
    );

    if (typeof firstMatchingProperty === 'object' && 'name' in firstMatchingProperty) {
      return firstMatchingProperty.name as string;
    }

    const propertyFromList = properties.find(p =>
      jobProperties.some(jobProp =>
        typeof jobProp === 'object' && 'property_id' in jobProp
          ? String(jobProp.property_id) === String(p.property_id)
          : String(jobProp) === String(p.property_id)
      )
    );

    return propertyFromList?.name || 'N/A';
  }, [job, selectedProperty, properties]);

  const getStatusConfig = (status: JobStatus) => {
    const configs = {
      completed: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-100 text-green-800', label: 'Completed' },
      in_progress: { icon: <Clock className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      pending: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      cancelled: { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      waiting_sparepart: { icon: <ClipboardList className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800', label: 'Waiting Sparepart' }
    };
    return configs[status] || configs.pending;
  };

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }, []);

  const statusConfig = useMemo(() => getStatusConfig(job.status), [job.status]);

  const handleThumbnailClick = (index: number, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(index);
  };

  const handleStatusUpdateComplete = useCallback(() => {
    window.location.reload();
  }, []);

  const handleCardClick = useCallback((e: MouseEvent) => {
    router.push(`/dashboard/jobs/${job.job_id}`);
  }, [job.job_id, router]);

  return (
    <Card 
      className="w-full max-w-md mx-auto flex flex-col transition-all duration-200 bg-white shadow hover:shadow-md cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="flex-shrink-0 p-4 pb-3 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="space-y-1 flex-grow min-w-0">
            <CardTitle className="text-base font-semibold text-gray-900 truncate">
              {job.topics?.[0]?.title || 'No Topic'}
            </CardTitle>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="truncate max-w-full">
                {job.rooms?.[0]?.name || 'N/A'} - {getPropertyName()}
              </span>
            </div>
          </div>
          <Badge 
            variant="secondary"
            className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium flex-shrink-0", statusConfig.color)}
          >
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        {job.images && job.images.length > 0 && (
          <div className="space-y-2">
            <div className="relative w-full aspect-video overflow-hidden rounded-md bg-gray-100">
              <LazyImage
                src={job.images[selectedImage]?.image_url}
                alt={`Job Image ${selectedImage + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
            {job.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {job.images.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={(e) => handleThumbnailClick(index, e)}
                    className={cn(
                      "w-14 h-14 flex-shrink-0 rounded-md overflow-hidden border transition-all",
                      selectedImage === index ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <LazyImage
                      src={img.image_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
          <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
            {job.description || 'No description provided'}
          </p>
        </div>

        {job.remarks && (
          <div className="border-t border-gray-100 pt-3">
            <Button
              variant="ghost"
              className="w-full flex justify-between items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              onClick={(e) => toggleSection('remarks', e)}
            >
              <span className="font-medium flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-gray-400" />
                Remarks
              </span>
              {expandedSections.remarks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {expandedSections.remarks && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 leading-relaxed">{job.remarks}</p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 pt-3">
          <Button
            variant="ghost"
            className="w-full flex justify-between items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            onClick={(e) => toggleSection('details', e)}
          >
            <span className="font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Staff Details
            </span>
            {expandedSections.details ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {expandedSections.details && (
            <div className="flex items-center gap-3 p-3 mt-2 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 flex-shrink-0 bg-white">
                {job.profile_image && job.profile_image.profile_image ? (
                  <LazyImage
                    src={job.profile_image.profile_image}
                    alt={typeof job.user === 'object' && job.user ? job.user.username : String(job.user ?? 'Staff')}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-700">
                  {typeof job.user === 'object' && job.user ? job.user.username : job.user || 'Unassigned'}
                </p>
                <p className="text-xs text-gray-500">
                  {typeof job.user === 'object' && job.user ? job.user.positions : 'Staff'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <Button
            variant="ghost"
            className="w-full flex justify-between items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            onClick={(e) => toggleSection('timestamps', e)}
          >
            <span className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Timestamps
            </span>
            {expandedSections.timestamps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {expandedSections.timestamps && (
            <div className="space-y-2 mt-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span><span className="font-medium">Created:</span> {formatDate(job.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span><span className="font-medium">Updated:</span> {formatDate(job.updated_at)}</span>
              </div>
              {job.completed_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span><span className="font-medium">Completed:</span> {formatDate(job.completed_at)}</span>
                </div>
              )}
              {job.status === "in_progress" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></span>
                  <span>In progress since {formatDate(job.updated_at)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-100">
          <UpdateStatusModal 
            job={job}
            onComplete={handleStatusUpdateComplete}
          >
            <Button 
              variant="outline" 
              size="sm"
              className="w-full text-sm h-9 font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            >
              Update Status
            </Button>
          </UpdateStatusModal>
        </div>
      </CardContent>
    </Card>
  );
}
