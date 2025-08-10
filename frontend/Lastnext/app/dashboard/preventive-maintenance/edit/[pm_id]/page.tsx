// app/dashboard/preventive-maintenance/edit/[pm_id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { usePreventiveMaintenance } from '@/app/lib/PreventiveContext';
import { PreventiveMaintenance, FrequencyType } from '@/app/lib/preventiveMaintenanceModels';
import { UpdatePreventiveMaintenanceData } from '@/app/lib/PreventiveMaintenanceService';
import { 
  Calendar, 
  Save, 
  X, 
  Upload, 
  AlertCircle, 
  Clock,
  Settings,
  Image as ImageIcon,
  Trash2,
  ArrowLeft
} from 'lucide-react';

interface FormState {
  pmtitle: string;
  scheduled_date: string;
  frequency: FrequencyType;
  custom_days: number | null;  // Changed from number | null to ensure no undefined
  notes: string;
  completed_date: string;
  topic_ids: number[];
  machine_ids: string[];
  before_image_file: File | null;
  after_image_file: File | null;
  before_image_preview: string | null;
  after_image_preview: string | null;
}

interface FormErrors {
  pmtitle?: string;
  scheduled_date?: string;
  frequency?: string;
  custom_days?: string;
  general?: string;
}

export default function EditPreventiveMaintenancePage() {
  const router = useRouter();
  const params = useParams();
  const pmId = params.pm_id as string;
  
  const {
    fetchMaintenanceById,
    updateMaintenance,
    topics,
    isLoading,
    error: contextError,
    clearError
  } = usePreventiveMaintenance();

  // State
  const [maintenance, setMaintenance] = useState<PreventiveMaintenance | null>(null);
  const [formState, setFormState] = useState<FormState>({
    pmtitle: '',
    scheduled_date: '',
    frequency: 'monthly',
    custom_days: null,
    notes: '',
    completed_date: '',
    topic_ids: [],
    machine_ids: [],
    before_image_file: null,
    after_image_file: null,
    before_image_preview: null,
    after_image_preview: null
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load maintenance data
  useEffect(() => {
    const loadMaintenance = async () => {
      if (pmId) {
        const data = await fetchMaintenanceById(pmId);
        if (data) {
          setMaintenance(data);
          populateForm(data);
        }
      }
    };

    loadMaintenance();
  }, [pmId, fetchMaintenanceById]);

  // Populate form with existing data
  const populateForm = (data: PreventiveMaintenance) => {
    setFormState({
      pmtitle: data.pmtitle || '',
      scheduled_date: data.scheduled_date ? data.scheduled_date.split('T')[0] : '',
      frequency: data.frequency as FrequencyType,
      custom_days: data.custom_days ?? null,  // Ensure null instead of undefined
      notes: data.notes || '',
      completed_date: data.completed_date ? data.completed_date.split('T')[0] : '',
      topic_ids: data.topics ? data.topics.map(t => typeof t === 'object' ? t.id : t) : [],
      machine_ids: data.machines ? data.machines.map(m => typeof m === 'object' ? m.machine_id : m) : [],
      before_image_file: null,
      after_image_file: null,
      before_image_preview: data.before_image_url || null,
      after_image_preview: data.after_image_url || null
    });
  };

  // Handle form input changes
  const handleInputChange = (field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle file upload
  const handleFileUpload = (field: 'before_image_file' | 'after_image_file', file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewField = field === 'before_image_file' ? 'before_image_preview' : 'after_image_preview';
        setFormState(prev => ({
          ...prev,
          [field]: file,
          [previewField]: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    } else {
      const previewField = field === 'before_image_file' ? 'before_image_preview' : 'after_image_preview';
      setFormState(prev => ({
        ...prev,
        [field]: null,
        [previewField]: null
      }));
    }
    setIsDirty(true);
  };

  // Remove image
  const removeImage = (type: 'before' | 'after') => {
    if (type === 'before') {
      setFormState(prev => ({
        ...prev,
        before_image_file: null,
        before_image_preview: null
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        after_image_file: null,
        after_image_preview: null
      }));
    }
    setIsDirty(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.pmtitle.trim()) {
      newErrors.pmtitle = 'Title is required';
    }

    if (!formState.scheduled_date) {
      newErrors.scheduled_date = 'Scheduled date is required';
    }

    if (formState.frequency === 'custom' && (formState.custom_days === null || formState.custom_days <= 0)) {
      newErrors.custom_days = 'Custom days must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    clearError();

    try {
      const updateData: UpdatePreventiveMaintenanceData = {
        pmtitle: formState.pmtitle.trim(),
        scheduled_date: formState.scheduled_date,
        frequency: formState.frequency,
        custom_days: formState.frequency === 'custom' ? (formState.custom_days === null ? undefined : formState.custom_days) : undefined,
        notes: formState.notes.trim(),
        completed_date: formState.completed_date || undefined,
        topic_ids: formState.topic_ids,
        machine_ids: formState.machine_ids,
        before_image: formState.before_image_file || undefined,
        after_image: formState.after_image_file || undefined
      };

      const result = await updateMaintenance(pmId, updateData);
      
      if (result) {
        setIsDirty(false);
        router.push(`/dashboard/preventive-maintenance/${pmId}`);
      }
    } catch (error) {
      console.error('Error updating maintenance:', error);
      setErrors({ general: 'Failed to update maintenance record. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle navigation with unsaved changes
  const handleNavigation = (path: string) => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
    router.push(path);
  };

  // Get frequency display text
  const getFrequencyText = (freq: string) => {
    const frequencyMap: { [key: string]: string } = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      biannually: 'Bi-annually',
      annually: 'Annually',
      custom: 'Custom'
    };
    return frequencyMap[freq] || freq;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading maintenance record...</span>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Maintenance Record Not Found</h2>
          <p className="text-gray-600 mb-6">The maintenance record you're looking for doesn't exist or you don't have permission to edit it.</p>
          <Link
            href="/dashboard/preventive-maintenance"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => handleNavigation(`/dashboard/preventive-maintenance/${pmId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Maintenance</h1>
          <p className="text-gray-600">ID: {pmId}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isDirty && (
            <span className="text-sm text-orange-600 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(contextError || errors.general) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{contextError || errors.general}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formState.pmtitle}
                  onChange={(e) => handleInputChange('pmtitle', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.pmtitle ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter maintenance title"
                />
                {errors.pmtitle && (
                  <p className="mt-1 text-sm text-red-600">{errors.pmtitle}</p>
                )}
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  value={formState.scheduled_date}
                  onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.scheduled_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.scheduled_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduled_date}</p>
                )}
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={formState.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value as FrequencyType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="biannually">Bi-annually</option>
                  <option value="annually">Annually</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Custom Days */}
              {formState.frequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Days *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formState.custom_days?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      if (value === '') {
                        handleInputChange('custom_days', null);
                      } else {
                        const numValue = parseInt(value, 10);
                        handleInputChange('custom_days', isNaN(numValue) ? null : numValue);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.custom_days ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter number of days"
                  />
                  {errors.custom_days && (
                    <p className="mt-1 text-sm text-red-600">{errors.custom_days}</p>
                  )}
                </div>
              )}

              {/* Completed Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completed Date
                </label>
                <input
                  type="date"
                  value={formState.completed_date}
                  onChange={(e) => handleInputChange('completed_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty if not completed yet
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formState.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter maintenance notes..."
              />
            </div>
          </div>

          {/* Topics Selection */}
          {topics.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Topics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {topics.map((topic) => (
                  <label key={topic.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.topic_ids.includes(topic.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('topic_ids', [...formState.topic_ids, topic.id]);
                        } else {
                          handleInputChange('topic_ids', formState.topic_ids.filter(id => id !== topic.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{topic.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Images</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Before Image
                </label>
                
                {formState.before_image_preview ? (
                  <div className="relative">
                    <img
                      src={formState.before_image_preview}
                      alt="Before maintenance"
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage('before')}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-2">
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700">Upload image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload('before_image_file', e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* After Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  After Image
                </label>
                
                {formState.after_image_preview ? (
                  <div className="relative">
                    <img
                      src={formState.after_image_preview}
                      alt="After maintenance"
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage('after')}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-2">
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700">Upload image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload('after_image_file', e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleNavigation('/dashboard/preventive-maintenance')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => handleNavigation(`/dashboard/preventive-maintenance/${pmId}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                View Details
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className={`flex items-center px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isSubmitting || !isDirty
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}