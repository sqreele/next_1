'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Formik, Form, Field, FormikErrors, useFormikContext, FormikHelpers } from 'formik';
import {
  PreventiveMaintenance,
  FREQUENCY_OPTIONS,
  validateFrequency,
  FrequencyType,
  Topic,
  ServiceResponse,
  getPropertyDetails,
  MachineDetails, // Import MachineDetails
} from '@/app/lib/preventiveMaintenanceModels';
import apiClient from '@/app/lib/api-client';
import FileUpload from '@/app/components/jobs/FileUpload';
import { useToast } from '@/app/lib/hooks/use-toast';
import { useProperty } from '@/app/lib/PropertyContext';
import { preventiveMaintenanceService, 
  type CreatePreventiveMaintenanceData,
  type UpdatePreventiveMaintenanceData,
} from '@/app/lib/PreventiveMaintenanceService';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface PreventiveMaintenanceFormProps {
  pmId?: string | null;
  onSuccessAction: (data: PreventiveMaintenance) => void;
  initialData?: PreventiveMaintenance | null;
  onCancel?: () => void;
  machineId?: string; // Pre-select a machine if provided
}

interface FormValues {
  pmtitle: string;
  scheduled_date: string;
  completed_date: string | null;
  frequency: FrequencyType;
  custom_days: number | '' | null;
  notes: string;
  before_image_file: File | null;
  after_image_file: File | null;
  selected_topics: number[];
  selected_machine_ids: string[];
  property_id: string | null;
  procedure: string;
}

// Helper component to handle effects based on Formik's values
const FormEffects: React.FC<{
  propertyId: string | null;
  fetchMachines: (pid: string | null) => void;
  setAvailableMachinesState: React.Dispatch<React.SetStateAction<MachineDetails[]>>;
}> = ({ propertyId, fetchMachines, setAvailableMachinesState }) => {
  useEffect(() => {
    if (propertyId) {
      fetchMachines(propertyId);
    } else {
      setAvailableMachinesState([]); // Clear machines if no property is selected
    }
  }, [propertyId, fetchMachines, setAvailableMachinesState]);

  return null; // This component does not render anything
};

const PreventiveMaintenanceForm: React.FC<PreventiveMaintenanceFormProps> = ({
  pmId,
  onSuccessAction,
  initialData: initialDataProp,
  onCancel,
  machineId,
}) => {
  const { toast } = useToast();
  const { data: session } = useSession();
  const {
    userProperties,
    selectedProperty: contextSelectedProperty,
    setSelectedProperty: setContextSelectedProperty,
  } = useProperty();

  const [fetchedInitialData, setFetchedInitialData] = useState<PreventiveMaintenance | null>(null);
  const actualInitialData = initialDataProp || fetchedInitialData;

  const createdMaintenanceIdRef = useRef<string | null>(null);

  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [availableMachines, setAvailableMachines] = useState<MachineDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(true);
  const [loadingMachines, setLoadingMachines] = useState<boolean>(true);

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPropertyName = useCallback(
    (propertyId: string | null): string => {
      if (!propertyId) return 'No Property Selected';
      const foundProperty = userProperties?.find((p) => p.property_id === propertyId);
      return foundProperty?.name || `Property ${propertyId}`;
    },
    [userProperties]
  );

  const validate = (values: FormValues): FormikErrors<FormValues> => {
    const errors: FormikErrors<FormValues> = {};
    if (!values.pmtitle) errors.pmtitle = 'Maintenance title is required';
    if (!values.scheduled_date) errors.scheduled_date = 'Scheduled date is required';
    if (!values.frequency) errors.frequency = 'Frequency is required';
    else if (!FREQUENCY_OPTIONS.find((option) => option.value === values.frequency))
      errors.frequency = 'Invalid frequency value';
    if (values.frequency === 'custom' && (!values.custom_days || Number(values.custom_days) < 1))
      errors.custom_days = 'Custom days must be at least 1';
    if (values.selected_topics.length === 0) errors.selected_topics = 'At least one topic must be selected';
    if (!values.property_id) errors.property_id = 'Property selection is required';
    // Uncomment if machine selection is mandatory:
    // if (!values.selected_machine_ids || values.selected_machine_ids.length === 0) {
    //   errors.selected_machine_ids = 'At least one machine must be selected';
    // }
    if (values.before_image_file && values.before_image_file.size > MAX_FILE_SIZE)
      errors.before_image_file = 'Before image must be less than 5MB';
    if (values.after_image_file && values.after_image_file.size > MAX_FILE_SIZE)
      errors.after_image_file = 'After image must be less than 5MB';
    return errors;
  };

  const getInitialValues = useCallback((): FormValues => {
    const currentData = actualInitialData;

    if (currentData) {
      console.log('[getInitialValues] currentData:', currentData);
      const topicIds: number[] = currentData.topics
        ?.map((topic: Topic | number) =>
          typeof topic === 'object' && 'id' in topic ? topic.id : typeof topic === 'number' ? topic : null
        )
        .filter((id): id is number => id !== null) || [];

      let machineIdsFromData: string[] = [];
      if (currentData.machines) {
        machineIdsFromData = currentData.machines
          .map((machine: MachineDetails | string) =>
            typeof machine === 'object' && 'machine_id' in machine
              ? machine.machine_id
              : typeof machine === 'string'
              ? machine
              : null
          )
          .filter((id): id is string => id !== null);
      } else if (currentData.machine_id) {
        machineIdsFromData = [currentData.machine_id];
      }

      const finalMachineIds = machineId
        ? Array.from(new Set([machineId, ...machineIdsFromData]))
        : machineIdsFromData;

      const propertyDetails = getPropertyDetails(currentData.property_id);
      const propertyId = propertyDetails.id || contextSelectedProperty || null;

      const customDays = currentData.custom_days === null || currentData.custom_days === undefined ? '' : currentData.custom_days;
      const selectedTopics = topicIds || [];
      const selectedMachineIds = finalMachineIds || [];

      return {
        pmtitle: currentData.pmtitle || '',
        scheduled_date: currentData.scheduled_date
          ? formatDateForInput(new Date(currentData.scheduled_date))
          : formatDateForInput(new Date()),
        completed_date: currentData.completed_date
          ? formatDateForInput(new Date(currentData.completed_date))
          : null,
        frequency: validateFrequency(currentData.frequency || 'monthly'),
        custom_days: customDays,
        notes: currentData.notes || '',
        before_image_file: null,
        after_image_file: null,
        selected_topics: selectedTopics,
        selected_machine_ids: selectedMachineIds,
        property_id: propertyId,
        procedure: currentData.procedure || '',
      };
    }

    return {
      pmtitle: '',
      scheduled_date: formatDateForInput(new Date()),
      completed_date: null,
      frequency: 'monthly',
      custom_days: '',
      notes: '',
      before_image_file: null,
      after_image_file: null,
      selected_topics: [],
      selected_machine_ids: machineId ? [machineId] : [],
      property_id: contextSelectedProperty || null,
      procedure: '',
    };
  }, [actualInitialData, contextSelectedProperty, machineId]);

  const clearError = () => {
    setError(null);
    setSubmitError(null);
  };

  const fetchAvailableTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      const response = await apiClient.get<Topic[]>('/api/topics/');
      setAvailableTopics(response.data);
    } catch (err: any) {
      console.error('Error fetching available topics:', err);
      setError('Failed to load topics. Please try again.');
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  const fetchAvailableMachines = useCallback(async (propertyId: string | null) => {
    if (!propertyId) {
      setAvailableMachines([]);
      setLoadingMachines(false);
      return;
    }
    setLoadingMachines(true);
    try {
      const params = { property_id: propertyId };
      const response = await apiClient.get<MachineDetails[]>('/api/machines/', { params });
      setAvailableMachines(response.data);
    } catch (err: any) {
      console.error('Error fetching available machines:', err);
      setError('Failed to load machines for the selected property. Please try again.');
      setAvailableMachines([]);
    } finally {
      setLoadingMachines(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await fetchAvailableTopics();
        if (mounted) {
          setLoadingTopics(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading topics:', err);
          setError('Failed to load topics. Please try again.');
          setLoadingTopics(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [fetchAvailableTopics]);

  useEffect(() => {
    let mounted = true;
    if (pmId && !initialDataProp) {
      setIsLoading(true);
      clearError();
      preventiveMaintenanceService
        .getPreventiveMaintenanceById(pmId)
        .then((response) => {
          if (!mounted) return;
          
          if (response.success && response.data) {
            console.log('[PreventiveMaintenanceForm] Fetched maintenance data:', response.data);
            setFetchedInitialData(response.data);
            if (response.data.before_image_url) setBeforeImagePreview(response.data.before_image_url);
            if (response.data.after_image_url) setAfterImagePreview(response.data.after_image_url);
            if (!response.data.property_id) {
              console.warn('[PreventiveMaintenanceForm] Missing property_id in maintenance data');
              setError('Warning: No property associated with this maintenance record. Please select one.');
            }
            if (!response.data.machine_id && !response.data.machines?.length) {
              console.warn('[PreventiveMaintenanceForm] Missing machine_id/machines in maintenance data');
            }
          } else {
            throw new Error(response.message || 'Failed to fetch maintenance data');
          }
        })
        .catch((err) => {
          if (!mounted) return;
          console.error('Error fetching maintenance data:', err);
          setError(err.message || 'Failed to fetch maintenance data');
          setFetchedInitialData(null);
        })
        .finally(() => {
          if (mounted) {
            setIsLoading(false);
          }
        });
    } else if (initialDataProp) {
      console.log('[PreventiveMaintenanceForm] Using initialDataProp:', initialDataProp);
      if (initialDataProp.before_image_url) setBeforeImagePreview(initialDataProp.before_image_url);
      if (initialDataProp.after_image_url) setAfterImagePreview(initialDataProp.after_image_url);
      if (!initialDataProp.property_id) {
        console.warn('[PreventiveMaintenanceForm] Missing property_id in initialDataProp');
        setError('Warning: No property associated with this maintenance record. Please select one.');
      }
      if (!initialDataProp.machine_id && !initialDataProp.machines?.length) {
        console.warn('[PreventiveMaintenanceForm] Missing machine_id/machines in initialDataProp');
      }
    }

    return () => {
      mounted = false;
    };
  }, [pmId, initialDataProp]);

  const handleFileSelection = (
    files: File[],
    type: 'before' | 'after',
    setFieldValue: (field: string, value: any) => void
  ) => {
    if (files.length === 0) {
      if (type === 'before') {
        setBeforeImagePreview(null);
        setFieldValue('before_image_file', null);
      } else {
        setAfterImagePreview(null);
        setFieldValue('after_image_file', null);
      }
      return;
    }
    const file = files[0];
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validImageTypes.includes(file.type)) {
      toast.error(`Please upload an image file (JPEG, PNG, or GIF) for ${type === 'before' ? 'Before' : 'After'} image.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${type === 'before' ? 'Before' : 'After'} image must be less than 5MB`);
      return;
    }
    setFieldValue(type === 'before' ? 'before_image_file' : 'after_image_file', file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'before') setBeforeImagePreview(reader.result as string);
      else setAfterImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (values: FormValues, formikHelpers: FormikHelpers<FormValues>) => {
    const { setSubmitting, resetForm } = formikHelpers;
    let isMounted = true;

    clearError();
    setSubmitError(null);
    setIsLoading(true);

    const hasBeforeImageFile = values.before_image_file instanceof File;
    const hasAfterImageFile = values.after_image_file instanceof File;

    if (hasBeforeImageFile || hasAfterImageFile) {
      setIsImageUploading(true);
    }

    try {
      const dataForService: CreatePreventiveMaintenanceData = {
        pmtitle: values.pmtitle.trim() || 'Untitled Maintenance',
        scheduled_date: values.scheduled_date,
        frequency: values.frequency,
        custom_days: values.frequency === 'custom' && values.custom_days ? Number(values.custom_days) : undefined,
        notes: values.notes?.trim() || '',
        property_id: values.property_id || '',
        topic_ids: values.selected_topics && values.selected_topics.length > 0 ? values.selected_topics : [],
        machine_ids: values.selected_machine_ids && values.selected_machine_ids.length > 0 ? values.selected_machine_ids : [],
        completed_date: values.completed_date || undefined,
        before_image: hasBeforeImageFile ? values.before_image_file! : undefined,
        after_image: hasAfterImageFile ? values.after_image_file! : undefined,
        procedure: values.procedure?.trim() || '',
      };

      console.log('[FORM] handleSubmit - Data prepared for service:', JSON.stringify(dataForService, (key, value) => {
        if (value instanceof File) {
          return { name: value.name, size: value.size, type: value.type, _isAFile: true };
        }
        return value;
      }, 2));

      const maintenanceIdToUpdate = pmId || (actualInitialData?.pm_id ?? null);
      let response: ServiceResponse<PreventiveMaintenance>;

      if (maintenanceIdToUpdate) {
        response = await preventiveMaintenanceService.updatePreventiveMaintenance(
          maintenanceIdToUpdate,
          dataForService as UpdatePreventiveMaintenanceData
        );
      } else {
        response = await preventiveMaintenanceService.createPreventiveMaintenance(dataForService);
      }

      if (!isMounted) return;

      console.log('[FORM] handleSubmit - Service response:', response);

      if (response.success && response.data) {
        toast.success(maintenanceIdToUpdate ? 'Maintenance record updated successfully' : 'Maintenance record created successfully');
        if (onSuccessAction) {
          onSuccessAction(response.data);
        }

        if (!maintenanceIdToUpdate) {
          resetForm({ values: getInitialValues() });
          setBeforeImagePreview(null);
          setAfterImagePreview(null);
        } else {
          setBeforeImagePreview(response.data.before_image_url || null);
          setAfterImagePreview(response.data.after_image_url || null);
        }
      } else {
        const errMsg = response.message || (response.error ? JSON.stringify(response.error) : 'Failed to save maintenance record');
        throw new Error(errMsg);
      }
    } catch (error: any) {
      if (!isMounted) return;
      
      console.error('[FORM] handleSubmit - Error submitting form:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error.response?.data) {
        const responseData = error.response.data;
        if (typeof responseData === 'string') errorMessage = responseData;
        else if (responseData.detail) errorMessage = responseData.detail;
        else if (responseData.message) errorMessage = responseData.message;
        else if (typeof responseData === 'object') {
          const fieldErrors = Object.entries(responseData)
            .map(([field, errs]) => `${field}: ${(Array.isArray(errs) ? errs.join(', ') : errs)}`)
            .join('; ');
          if (fieldErrors) errorMessage = `Validation errors: ${fieldErrors}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      if (isMounted) {
        setSubmitting(false);
        setIsLoading(false);
        setIsImageUploading(false);
      }
    }
  };

  if (isLoading && pmId && !actualInitialData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {(error || submitError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between">
            <p className="whitespace-pre-wrap">{error || submitError}</p>
            <button onClick={clearError} className="text-red-700" type="button" aria-label="Close error message">
              ×
            </button>
          </div>
        </div>
      )}

      <Formik
        initialValues={getInitialValues()}
        validate={validate}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form aria-label="Preventive Maintenance Form">
            <FormEffects
              propertyId={values.property_id}
              fetchMachines={fetchAvailableMachines}
              setAvailableMachinesState={setAvailableMachines}
            />
            <div className="mb-6">
              <label htmlFor="property_id" className="block text-sm font-medium text-gray-700 mb-1">
                Property <span className="text-red-500">*</span>
              </label>
              <Field
                as="select"
                id="property_id"
                name="property_id"
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const newPropertyId = e.target.value || null;
                  setFieldValue('property_id', newPropertyId);
                  if (newPropertyId && setContextSelectedProperty) {
                    setContextSelectedProperty(newPropertyId);
                  }
                  setFieldValue('selected_machine_ids', []);
                }}
                className={`w-full p-2 border rounded-md ${
                  errors.property_id && touched.property_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a Property</option>
                {userProperties?.map((property) => (
                  <option key={property.property_id} value={property.property_id}>
                    {property.name}
                  </option>
                ))}
              </Field>
              {errors.property_id && touched.property_id && (
                <p className="mt-1 text-sm text-red-500">{errors.property_id}</p>
              )}
            </div>

            {/* Maintenance Title */}
            <div className="mb-6">
              <label htmlFor="pmtitle" className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Title <span className="text-red-500">*</span>
              </label>
              <Field
                type="text"
                id="pmtitle"
                name="pmtitle"
                className={`w-full p-2 border rounded-md ${
                  errors.pmtitle && touched.pmtitle ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter maintenance title"
              />
              {errors.pmtitle && touched.pmtitle && <p className="mt-1 text-sm text-red-500">{errors.pmtitle}</p>}
            </div>

            {/* Scheduled Date */}
            <div className="mb-6">
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <Field
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                className={`w-full p-2 border rounded-md ${
                  errors.scheduled_date && touched.scheduled_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduled_date && touched.scheduled_date && (
                <p className="mt-1 text-sm text-red-500">{errors.scheduled_date}</p>
              )}
            </div>

            {/* Completed Date */}
            <div className="mb-6">
              <label htmlFor="completed_date" className="block text-sm font-medium text-gray-700 mb-1">
                Completed Date
              </label>
              <Field
                type="date"
                id="completed_date"
                name="completed_date"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Maintenance Frequency */}
            <div className="mb-6">
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Frequency <span className="text-red-500">*</span>
              </label>
              <Field
                as="select"
                id="frequency"
                name="frequency"
                className={`w-full p-2 border rounded-md ${
                  errors.frequency && touched.frequency ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Field>
              {errors.frequency && touched.frequency && <p className="mt-1 text-sm text-red-500">{errors.frequency}</p>}
            </div>

            {/* Custom Days Interval */}
            {values.frequency === 'custom' && (
              <div className="mb-6">
                <label htmlFor="custom_days" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Days Interval <span className="text-red-500">*</span>
                </label>
                <Field
                  type="number"
                  id="custom_days"
                  name="custom_days"
                  min="1"
                  max="365"
                  className={`w-full p-2 border rounded-md ${
                    errors.custom_days && touched.custom_days ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.custom_days && touched.custom_days && (
                  <p className="mt-1 text-sm text-red-500">{errors.custom_days}</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Field
                as="textarea"
                id="notes"
                name="notes"
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter any notes for this maintenance task"
              />
            </div>

            {/* Procedure */}
            <div className="mb-6">
              <label htmlFor="procedure" className="block text-sm font-medium text-gray-700 mb-1">
                Procedure
              </label>
              <Field
                as="textarea"
                id="procedure"
                name="procedure"
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter the maintenance procedure"
              />
            </div>

            {/* Machines Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machines {loadingMachines && <span className="text-xs text-gray-500">(Loading...)</span>}
              </label>
              <div
                className={`border rounded-md p-4 max-h-60 overflow-y-auto bg-white ${
                  errors.selected_machine_ids && touched.selected_machine_ids ? 'border-red-500' : 'border-gray-300'
                }`}
                role="group"
                aria-label="Select machines"
              >
                {!values.property_id ? (
                  <p className="text-sm text-gray-500">Please select a property to see available machines.</p>
                ) : loadingMachines ? (
                  <div className="flex justify-center items-center h-24">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="ml-2 text-sm text-gray-500">Loading machines...</p>
                  </div>
                ) : availableMachines.length > 0 ? (
                  <div className="space-y-3">
                    {availableMachines.map((machineItem) => (
                      <div key={machineItem.machine_id} className="relative">
                        <label className="flex items-center cursor-pointer">
                          <Field name="selected_machine_ids">
                            {({ field: { value: selectedMachinesValue }, form: { setFieldValue: setMachineFieldValue } }: any) => (
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                id={`machine-${machineItem.machine_id}`}
                                checked={selectedMachinesValue.includes(machineItem.machine_id)}
                                onChange={(e) => {
                                  const currentSelection = selectedMachinesValue || [];
                                  if (e.target.checked) {
                                    setMachineFieldValue('selected_machine_ids', [
                                      ...currentSelection,
                                      machineItem.machine_id,
                                    ]);
                                  } else {
                                    setMachineFieldValue(
                                      'selected_machine_ids',
                                      currentSelection.filter((id: string) => id !== machineItem.machine_id)
                                    );
                                  }
                                }}
                              />
                            )}
                          </Field>
                          <span className="ml-3 text-sm text-gray-700 flex-1">
                            {machineItem.name} ({machineItem.machine_id})
                          </span>
                        </label>
                        {values.selected_machine_ids.includes(machineItem.machine_id) && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">No machines available for this property.</p>
                    {values.property_id && !error && (
                      <button
                        type="button"
                        onClick={() => fetchAvailableMachines(values.property_id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Refresh Machines
                      </button>
                    )}
                  </div>
                )}
              </div>
              {errors.selected_machine_ids && touched.selected_machine_ids && (
                <p className="mt-1 text-sm text-red-500">{errors.selected_machine_ids}</p>
              )}
            </div>

            {/* Topics Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topics <span className="text-red-500">*</span>{' '}
                {loadingTopics && <span className="text-xs text-gray-500">(Loading...)</span>}
              </label>
              <div
                className={`border rounded-md p-4 max-h-60 overflow-y-auto bg-white ${
                  errors.selected_topics && touched.selected_topics ? 'border-red-500' : 'border-gray-300'
                }`}
                role="group"
                aria-label="Select topics"
              >
                {loadingTopics ? (
                  <div className="flex justify-center items-center h-24">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="ml-2 text-sm text-gray-500">Loading topics...</p>
                  </div>
                ) : availableTopics.length > 0 ? (
                  <div className="space-y-3">
                    {availableTopics.map((topic) => (
                      <div key={topic.id} className="relative">
                        <label className="flex items-center cursor-pointer">
                          <Field name="selected_topics">
                            {({ field: { value: selectedTopicsValue }, form: { setFieldValue: setTopicFieldValue } }: any) => (
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                id={`topic-${topic.id}`}
                                checked={selectedTopicsValue.includes(topic.id)}
                                onChange={(e) => {
                                  const currentSelection = selectedTopicsValue || [];
                                  if (e.target.checked) {
                                    setTopicFieldValue('selected_topics', [...currentSelection, topic.id]);
                                  } else {
                                    setTopicFieldValue('selected_topics', currentSelection.filter((id: number) => id !== topic.id));
                                  }
                                }}
                              />
                            )}
                          </Field>
                          <span className="ml-3 text-sm text-gray-700 flex-1">{topic.title}</span>
                        </label>
                        {values.selected_topics.includes(topic.id) && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">No topics available.</p>
                    {!error && (
                      <button
                        type="button"
                        onClick={fetchAvailableTopics}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Refresh Topics
                      </button>
                    )}
                  </div>
                )}
              </div>
              {errors.selected_topics && touched.selected_topics && (
                <p className="mt-1 text-sm text-red-500">{errors.selected_topics}</p>
              )}
              {values.selected_topics.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    {values.selected_topics.length} topic{values.selected_topics.length > 1 ? 's' : ''} selected:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {values.selected_topics.map((topicId) => {
                      const topic = availableTopics.find((t) => t.id === topicId);
                      return topic ? (
                        <span
                          key={topic.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {topic.title}
                          <button
                            type="button"
                            onClick={() => {
                              setFieldValue('selected_topics', values.selected_topics.filter((id) => id !== topic.id));
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                            aria-label={`Remove ${topic.title}`}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Image Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Before Image</label>
                <FileUpload
                  onFileSelect={(files) => handleFileSelection(files, 'before', setFieldValue)}
                  maxFiles={1}
                  maxSize={5}
                  error={errors.before_image_file as string}
                  touched={touched.before_image_file}
                  disabled={isSubmitting || isLoading}
                />
                {beforeImagePreview && (
                  <div className="mt-3 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={beforeImagePreview}
                      alt="Before Maintenance Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBeforeImagePreview(null);
                        setFieldValue('before_image_file', null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-md"
                      aria-label="Remove before image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">After Image</label>
                <FileUpload
                  onFileSelect={(files) => handleFileSelection(files, 'after', setFieldValue)}
                  maxFiles={1}
                  maxSize={5}
                  error={errors.after_image_file as string}
                  touched={touched.after_image_file}
                  disabled={isSubmitting || isLoading}
                />
                {afterImagePreview && (
                  <div className="mt-3 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={afterImagePreview}
                      alt="After Maintenance Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAfterImagePreview(null);
                        setFieldValue('after_image_file', null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-md"
                      aria-label="Remove after image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-between mt-8 gap-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors"
                  disabled={isSubmitting || isLoading}
                >
                  Cancel
                </button>
              )}
              <div className="flex space-x-4">
                {isImageUploading && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                    <span className="text-sm">Uploading images...</span>
                  </div>
                )}
                <button
                  type="submit"
                  className={`px-6 py-2.5 ${
                    isSubmitting || isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span>{pmId || actualInitialData ? 'Updating...' : 'Creating...'}</span>
                    </div>
                  ) : (
                    <span>{pmId || actualInitialData ? 'Update Maintenance' : 'Create Maintenance'}</span>
                  )}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default PreventiveMaintenanceForm;