'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Formik, Form, Field, FormikErrors } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Plus, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { Checkbox } from "@/app/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { useSession, signIn } from 'next-auth/react';
import { Label } from "@/app/components/ui/label";
import RoomAutocomplete from '@/app/components/jobs/RoomAutocomplete';
import FileUpload from '@/app/components/jobs/FileUpload';
import { Room, TopicFromAPI } from '@/app/lib/types';
import { useRouter } from 'next/navigation';
import { useProperty } from '@/app/lib/PropertyContext';
import { useJob } from '@/app/lib/JobContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FormValues {
  description: string;
  status: string;
  priority: string;
  remarks: string;
  topic: {
    title: string;
    description: string;
  };
  room: Room | null;
  files: File[];
  is_defective: boolean;
  is_preventivemaintenance: boolean;
}

const validationSchema = Yup.object().shape({
  description: Yup.string().required('Description is required'),
  status: Yup.string().required('Status is required'),
  priority: Yup.string().required('Priority is required'),
  remarks: Yup.string().optional(),
  topic: Yup.object().shape({
    title: Yup.string().required('Topic is required'),
    description: Yup.string(),
  }).required(),
  room: Yup.object()
    .nullable()
    .required('Room selection is required')
    .shape({
      room_id: Yup.number().typeError('Invalid Room ID').required('Room ID missing').min(1, 'Room must be selected'),
      name: Yup.string().required('Room name missing'),
    }),
  files: Yup.array()
    .of(
      Yup.mixed<File>()
        .test('fileSize', 'File too large (max 5MB)', (value) => !value || !(value instanceof File) || value.size <= MAX_FILE_SIZE)
        .test('fileType', 'Only image files allowed', (value) => !value || !(value instanceof File) || value.type.startsWith('image/'))
    )
    .min(1, 'At least one image is required')
    .required('At least one image is required'),
  is_defective: Yup.boolean().default(false),
  is_preventivemaintenance: Yup.boolean().default(false),
});

const initialValues: FormValues = {
  description: '',
  status: 'pending',
  priority: 'medium',
  remarks: '',
  topic: { title: '', description: '' },
  room: null,
  files: [],
  is_defective: false,
  is_preventivemaintenance: false,
};

const CreateJobForm: React.FC<{ onJobCreated?: () => void }> = ({ onJobCreated }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [topics, setTopics] = useState<TopicFromAPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { triggerJobCreation } = useJob();
  const { selectedProperty, userProperties } = useProperty();

  const getPropertyName = useCallback((propertyId: string | null): string => {
    if (!propertyId) return 'No Property Selected';
    const property = userProperties.find(p => p.property_id === propertyId);
    return property?.name || `Property ${propertyId}`;
  }, [userProperties]);

  const fetchData = useCallback(async () => {
    if (!session?.user?.accessToken) return;
    const headers = { Authorization: `Bearer ${session.user.accessToken}` };

    try {
      setError(null);
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }
      const [roomsResponse, topicsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/rooms/?property_id=${selectedProperty}`, { headers }),
        axios.get(`${API_BASE_URL}/api/topics/`, { headers }),
      ]);

      if (!Array.isArray(roomsResponse.data)) throw new Error('Invalid rooms data');
      if (!Array.isArray(topicsResponse.data)) throw new Error('Invalid topics data');

      setRooms(roomsResponse.data);
      setTopics(topicsResponse.data);
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      setError('Failed to load rooms/topics.');
    }
  }, [session?.user?.accessToken, selectedProperty]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.accessToken) {
      fetchData();
    }
  }, [status, session?.user?.accessToken, fetchData, selectedProperty]);

  const formatApiErrors = (data: any): string => {
    if (!data) return 'Unknown error';
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      if (data.detail) return data.detail;
      return Object.entries(data)
        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
        .join('; ');
    }
    return 'Validation failed';
  };

  const validateFiles = (files: File[]): string | null => {
    if (!files.length) return 'At least one image is required';
    for (const file of files) {
      if (!file.type.startsWith('image/')) return `File "${file.name}" is not an image`;
      if (file.size > MAX_FILE_SIZE) return `File "${file.name}" exceeds 5MB limit`;
    }
    return null;
  };

  const handleSubmit = async (values: FormValues, { resetForm, setSubmitting }: { resetForm: () => void; setSubmitting: (isSubmitting: boolean) => void }) => {
    if (!session?.user) {
      setError('Please login first');
      await signIn();
      return;
    }

    if (!selectedProperty) {
      setError('Please select a property');
      setSubmitting(false);
      return;
    }

    if (!values.room || !values.room.room_id) {
      setError('Please select a valid room');
      setSubmitting(false);
      return;
    }

    const fileError = validateFiles(values.files);
    if (fileError) {
      setError(fileError);
      setSubmitting(false);
      return;
    }

    setError(null);

    try {
      const formData = new FormData();
      formData.append('description', values.description.trim());
      formData.append('status', values.status);
      formData.append('priority', values.priority);
      formData.append('room_id', values.room.room_id.toString());
      formData.append('topic_data', JSON.stringify({
        title: values.topic.title.trim(),
        description: values.topic.description.trim() || '',
      }));
      if (values.remarks?.trim()) {
        formData.append('remarks', values.remarks.trim());
      }
      formData.append('user_id', session.user.id);
      formData.append('property_id', selectedProperty);
      formData.append('is_defective', values.is_defective ? 'true' : 'false');
      formData.append('is_preventivemaintenance', values.is_preventivemaintenance ? 'true' : 'false');
      values.files.forEach(file => {
        formData.append('images', file);
      });

      const response = await axios.post(`${API_BASE_URL}/api/jobs/`, formData, {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      resetForm();
      triggerJobCreation();
      if (onJobCreated) onJobCreated();
      router.push('/dashboard/myJobs');
    } catch (error) {
      console.error('Submission error:', error);
      if (axios.isAxiosError(error)) {
        setError(formatApiErrors(error.response?.data));
      } else {
        setError('Unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="text-center p-6">
        <Loader className="inline-block animate-spin mr-2 h-5 w-5" /> Loading session...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center p-6 space-y-4">
        <p>Please log in to create a job.</p>
        <Button onClick={() => signIn()}>Log In</Button>
      </div>
    );
  }

  if (!selectedProperty) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
        <Alert className="mb-6">
          <AlertDescription>Please select a property first to create a maintenance job.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Create New Maintenance Job</h2>
      <p className="text-sm text-gray-600 mb-6">
        For property: {getPropertyName(selectedProperty)}
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
        {({ values, errors, touched, setFieldValue, isSubmitting }) => (
          <Form className="space-y-6">
            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description" className="font-medium">Description *</Label>
              <Field
                as={Textarea}
                id="description"
                name="description"
                placeholder="Enter job description..."
                disabled={isSubmitting}
                className={`w-full min-h-[90px] ${touched.description && errors.description ? 'border-red-500' : 'border-gray-300'}`}
              />
              {touched.description && errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1">
                <Label className="font-medium">Status *</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) => value && setFieldValue('status', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={touched.status && errors.status ? 'border-red-500' : 'border-gray-300'}>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_sparepart">Waiting Sparepart</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {touched.status && errors.status && <p className="text-xs text-red-600 mt-1">{errors.status}</p>}
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <Label className="font-medium">Priority *</Label>
                <Select
                  value={values.priority}
                  onValueChange={(value) => value && setFieldValue('priority', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={touched.priority && errors.priority ? 'border-red-500' : 'border-gray-300'}>
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                {touched.priority && errors.priority && <p className="text-xs text-red-600 mt-1">{errors.priority}</p>}
              </div>
            </div>

            {/* Room */}
            <div className="space-y-1">
              <Label className="font-medium">Room *</Label>
              <RoomAutocomplete
                rooms={rooms}
                selectedRoom={values.room}
                onSelect={(selectedRoom) => setFieldValue('room', selectedRoom)}
                disabled={isSubmitting}
              />
              {touched.room && errors.room && (
                <p className="text-xs text-red-600 mt-1">
                  {typeof errors.room === 'string' ? errors.room : (errors.room as FormikErrors<Room>).room_id}
                </p>
              )}
            </div>

            {/* Topic */}
            <div className="space-y-1">
              <Label className="font-medium">Topic *</Label>
              <Select
                value={values.topic.title}
                onValueChange={(value) => {
                  const topic = topics.find(t => t.title === value);
                  if (topic) setFieldValue('topic', { title: topic.title, description: topic.description || '' });
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className={touched.topic?.title && errors.topic?.title ? 'border-red-500' : 'border-gray-300'}>
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.length ? topics.map(topic => (
                    <SelectItem key={topic.id} value={topic.title}>
                      {topic.title}
                    </SelectItem>
                  )) : (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {touched.topic?.title && errors.topic?.title && <p className="text-xs text-red-600 mt-1">{errors.topic.title}</p>}
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <Label htmlFor="remarks" className="font-medium">Remarks</Label>
              <Field
                as={Textarea}
                id="remarks"
                name="remarks"
                placeholder="Enter additional remarks (optional)..."
                disabled={isSubmitting}
                className={`w-full min-h-[80px] ${touched.remarks && errors.remarks ? 'border-red-500' : 'border-gray-300'}`}
              />
              {touched.remarks && errors.remarks && <p className="text-xs text-red-600 mt-1">{errors.remarks}</p>}
            </div>

            {/* Files */}
            <div className="space-y-1">
              <Label className="font-medium">Images *</Label>
              <FileUpload
                onFileSelect={(selectedFiles) => setFieldValue('files', selectedFiles)}
                error={touched.files && typeof errors.files === 'string' ? errors.files : undefined}
                disabled={isSubmitting}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-4">
              <Checkbox
                checked={values.is_defective}
                onCheckedChange={(checked) => setFieldValue('is_defective', checked)}
                disabled={isSubmitting}
              />
              <Label>Is Defective?</Label>

              <Checkbox
                checked={values.is_preventivemaintenance}
                onCheckedChange={(checked) => setFieldValue('is_preventivemaintenance', checked)}
                disabled={isSubmitting}
              />
              <Label>Is Preventive Maintenance?</Label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating...' : 'Create Job'}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CreateJobForm;