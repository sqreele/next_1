// ./app/components/jobs/CreateJobButton.tsx (Modified)
"use client";

import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Plus, ChevronDown, ChevronUp, Loader } from "lucide-react";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { useSession, signIn } from 'next-auth/react';
import { Label } from "@/app/components/ui/label";
import RoomAutocomplete from './RoomAutocomplete';
import FileUpload from './FileUpload';
import { Room, TopicFromAPI } from '@/app/lib/types'; // Ensure types path is correct

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Configure axios instance (consider moving to api-client if not already done)
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- 1. Modify Props Interface ---
interface CreateJobButtonProps {
  propertyId: string; // *** ADD propertyId HERE ***
  onJobCreated?: () => void;
}

// ... FormValues, validationSchema, initialValues remain the same ...
interface FormValues {
  description: string;
  status: string;
  priority: string;
  remarks: string;
  topic: {
    title: string;
    description: string;
  };
  room: Room; // Assuming Room type includes room_id
  files: File[];
  is_defective: boolean;
}

// Validation Schema remains mostly the same, ensure room validation is robust
const validationSchema = Yup.object().shape({
  description: Yup.string().required('Description is required'),
  status: Yup.string().required('Status is required'),
  priority: Yup.string().required('Priority is required'),
  remarks: Yup.string().nullable(),
  topic: Yup.object().shape({
    title: Yup.string().required('Topic is required'),
    description: Yup.string().nullable(), // Make description optional if it can be
  }).required('Topic selection is required'),
  room: Yup.object().shape({
    room_id: Yup.number().required('Room must be selected').min(1, 'Room must be selected'),
    // Add other required fields from Room if necessary for validation context
    name: Yup.string().optional(),
    room_type: Yup.string().optional(),
  }).defined().required('Room selection is required'), // Ensure the object itself is required
  files: Yup.array()
    .min(1, 'At least one image is required')
    .test('fileSize', 'One or more files are larger than 5MB', (files) =>
      files ? files.every((file) => file.size <= MAX_FILE_SIZE) : true
    )
    .test('fileType', 'Only image files are allowed', (files) =>
      files ? files.every((file) => file.type.startsWith('image/')) : true
    ),
  is_defective: Yup.boolean().default(false),
});

// Initial Values
const initialValues: FormValues = {
  description: '',
  status: 'pending',
  priority: 'medium',
  remarks: '',
  topic: {
    title: '',
    description: '',
  },
  room: { // Ensure initial room aligns with Room type and validation needs
    room_id: 0, // Use 0 or null/undefined depending on validation/logic
    name: '',
    room_type: '',
    is_active: true,
    created_at: new Date().toISOString(),
    properties: []
  },
  files: [],
  is_defective: false,
};


// --- 2. Destructure propertyId from props ---
const CreateJobButton: React.FC<CreateJobButtonProps> = ({ propertyId, onJobCreated }) => {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [topics, setTopics] = useState<TopicFromAPI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const { data: session, status } = useSession();

  // Effect to close dialog if user logs out
  useEffect(() => {
    if (status === 'unauthenticated') setOpen(false);
  }, [status]);

  // Effect to fetch data when dialog opens (if authenticated)
  useEffect(() => {
    // Only fetch if dialog is open, authenticated, and propertyId is valid
    if (open && status === 'authenticated' && session?.user?.accessToken && propertyId) {
      fetchData(propertyId); // Pass propertyId to fetchData
    }
     // Clear data if dialog closes or user logs out to avoid showing stale data
     if (!open || status !== 'authenticated') {
        setRooms([]);
        setTopics([]);
     }
  // Add propertyId to dependency array
  }, [open, status, session?.user?.accessToken, propertyId]);

  // --- 4. (Recommended) Update fetchData to use propertyId ---
  const fetchData = async (currentPropertyId: string) => {
    // Clear previous errors/data
    setError(null);
    // Don't reset rooms/topics here if you want them to persist briefly while loading
    // setRooms([]);
    // setTopics([]);

    try {
      const headers = { Authorization: `Bearer ${session?.user?.accessToken}` };
      // Fetch rooms *for the specific property* and all topics
      const [roomsResponse, topicsResponse] = await Promise.all([
        // Update rooms URL to filter by property
        axiosInstance.get(`/api/rooms/?property=${currentPropertyId}`, { headers }),
        axiosInstance.get('/api/topics/', { headers }) // Topics likely aren't property-specific
      ]);
      console.log(`Workspaceed rooms for property ${currentPropertyId}:`, roomsResponse.data);
      console.log('Fetched topics:', topicsResponse.data);
      setRooms(roomsResponse.data ?? []); // Use nullish coalescing
      setTopics(topicsResponse.data ?? []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch necessary data (Rooms/Topics). Please try again.');
      // Clear data on error
       setRooms([]);
       setTopics([]);
    }
  };

  const handleSubmit = async (values: FormValues, { resetForm }: { resetForm: () => void }) => {
    if (!session?.user) { /* ... auth check ... */
        setError('Please log in to create a job');
        setOpen(false);
        await signIn(); // Redirect to sign in
        return;
    }
    if (!propertyId) { // Add check for propertyId
        setError('Cannot create job: Property context is missing.');
        return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      // --- 3. Add property_id to the payload ---
      const payload = {
        description: values.description.trim(),
        status: values.status,
        priority: values.priority,
        room_id: values.room.room_id, // Make sure room_id is valid
        topic_data: JSON.stringify({ // Send topic details as JSON string
          title: values.topic.title.trim(),
          description: values.topic.description?.trim() || '', // Handle potentially missing description
        }),
        remarks: values.remarks?.trim() || '', // Send empty string if no remarks
        username: session.user.username, // Send relevant user info
        user_id: session.user.id,
        is_defective: values.is_defective,
        property_id: propertyId, // *** USE THE PROP HERE ***
      };

      // Validate essential IDs before appending
      if (!payload.room_id || payload.room_id === 0) {
          throw new Error("Invalid Room selection.");
      }
       if (!payload.property_id) {
          throw new Error("Invalid Property ID.");
      }


      // Append payload fields to FormData
      Object.entries(payload).forEach(([key, value]) => {
          // Convert ALL values to strings for FormData
          const valueToAppend = value === null || value === undefined ? '' : String(value);
          formData.append(key, valueToAppend);
      });

      // Append files
      values.files.forEach((file) => {
        formData.append('images', file); // Use 'images' to match Django backend expectation often
      });

      // Make the API call using multipart/form-data
      const response = await axiosInstance.post('/api/jobs/', formData, {
        headers: {
          // Content-Type is set automatically by browser for FormData
          'Content-Type': undefined, // Let browser set boundary
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });

      console.log('Job created:', response.data);
      setOpen(false); // Close dialog on success
      resetForm(); // Reset form fields
      onJobCreated?.(); // Call the callback passed from MyJobs
    } catch (error) {
      console.error('Error creating job:', error);
      // Use detailed error message if available from backend
      setError(axios.isAxiosError(error) ? error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle opening the dialog (check auth first)
  const handleAuthClick = async () => {
    if (status === 'unauthenticated') {
      await signIn(); // Prompt login if not authenticated
      return;
    }
    // If authenticated, just open the dialog
    // Data fetching is handled by useEffect hook based on 'open' state
    setOpen(true);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-11 px-6 flex items-center gap-2" // Adjust styling as needed
          onClick={handleAuthClick} // Use unified click handler
        >
          <Plus className="h-4 w-4" />
          Create Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl"> {/* Adjust max width if needed */}
        <DialogHeader>
          <DialogTitle>Create New Job for Property {propertyId}</DialogTitle>
        </DialogHeader>

        {/* Display API/Validation Error */}
        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Only show form if authenticated */}
        {status === 'authenticated' ? (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize // Allows form to reset if initialValues change (though not typical here)
          >
            {/* Form Fields using Formik's context */}
             {/* ... Paste the Formik <Form> JSX here from your original code ... */}
             {/* Make sure field names match FormValues and validationSchema */}
              {({ values, errors, touched, setFieldValue, isSubmitting: formikIsSubmitting }) => ( // Use formikIsSubmitting
                 <Form className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Make form scrollable */}
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Field
                            as={Textarea}
                            id="description"
                            name="description"
                            placeholder="Describe the maintenance issue..."
                            className={`mt-1 ${touched.description && errors.description ? 'border-red-500' : ''}`}
                        />
                        {touched.description && errors.description && (
                            <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label>Status</Label>
                            <Select
                                value={values.status}
                                onValueChange={(value) => setFieldValue('status', value)}
                                name="status"
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="waiting_sparepart">Waiting Sparepart</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            {/* No explicit error shown for selects usually, handled by default value */}
                        </div>

                        <div>
                            <Label>Priority</Label>
                             <Select
                                value={values.priority}
                                onValueChange={(value) => setFieldValue('priority', value)}
                                name="priority"
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                     <div>
                        <Label>Room</Label>
                        <RoomAutocomplete
                            rooms={rooms} // Pass fetched rooms
                            selectedRoom={values.room}
                            onSelect={(selectedRoom) => setFieldValue('room', selectedRoom)}
                            
                        />
                         {/* Manually display validation error for room object */}
                        {touched.room?.room_id && errors.room?.room_id && (
                           <p className="text-sm text-red-500 mt-1">{errors.room.room_id}</p>
                        )}
                     </div>

                     <div>
                         <Label>Topic</Label>
                         <Select
                             value={values.topic.title} // Bind to topic title
                             onValueChange={(value) => {
                                 const selectedTopic = topics.find((t) => t.title === value);
                                 if (selectedTopic) {
                                     setFieldValue('topic', { // Set the whole topic object
                                         title: selectedTopic.title,
                                         description: selectedTopic.description || '',
                                     });
                                 } else {
                                     // Handle case where selection might be cleared or invalid
                                     setFieldValue('topic', { title: '', description: '' });
                                 }
                             }}
                             name="topic.title" // Target title for validation linkage if needed
                         >
                             <SelectTrigger className="mt-1">
                                 <SelectValue placeholder="Select Topic" />
                             </SelectTrigger>
                             <SelectContent>
                                 {topics.map((topic) => (
                                     <SelectItem key={topic.id} value={topic.title}>
                                         {topic.title}
                                     </SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                         {touched.topic?.title && errors.topic?.title && (
                             <p className="text-sm text-red-500 mt-1">{errors.topic.title}</p>
                         )}
                     </div>

                     <div>
                        <Label>Images (Max 5MB each)</Label>
                         <FileUpload
                            onFileSelect={(selectedFiles) => setFieldValue('files', selectedFiles)}
                            // Pass formik errors/touched status to FileUpload if it supports displaying them
                             error={(touched.files && errors.files) ? (errors.files as string) : undefined}
                            touched={!!touched.files} 
                            maxFiles={5}
                            maxSize={MAX_FILE_SIZE / (1024*1024)} // Pass maxSize in MB
                            
                        />
                         {/* Display file-related errors specifically */}
                         {touched.files && errors.files && typeof errors.files === 'string' && (
                            <p className="text-sm text-red-500 mt-1">{errors.files}</p>
                         )}
                     </div>


                     <div className="items-top flex space-x-2 mt-2">
                         <Checkbox
                             id="is_defective"
                             checked={values.is_defective}
                             onCheckedChange={(checked) => {
                                 setFieldValue('is_defective', !!checked); // Ensure boolean value
                             }}
                         />
                         <div className="grid gap-1.5 leading-none">
                             <label htmlFor="is_defective" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                 Mark as Defect / Requires Contractor
                             </label>
                             <p className="text-sm text-muted-foreground">
                                 Check this if the item needs external repair or is part of a defect list.
                             </p>
                         </div>
                     </div>


                     <div className="mt-2">
                         <div
                             className="flex items-center justify-between cursor-pointer mb-1"
                             onClick={() => setShowRemarks(!showRemarks)}
                         >
                             <Label htmlFor="remarks" className="cursor-pointer flex items-center gap-1 text-sm font-medium">
                                 Remarks (Optional)
                                 {showRemarks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                             </Label>
                         </div>
                         <div className={`transition-all duration-300 ease-in-out ${showRemarks ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                             <Field
                                 as={Textarea}
                                 id="remarks"
                                 name="remarks"
                                 placeholder="Add any extra notes here..."
                                 className="mt-1"
                                 rows={2}
                             />
                              {/* No validation shown for optional remarks */}
                         </div>
                     </div>


                    {/* Submit/Cancel Buttons */}
                    <div className="flex justify-end gap-4 pt-4 border-t mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={formikIsSubmitting || isSubmitting} // Disable based on both states
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={formikIsSubmitting || isSubmitting}>
                             {(formikIsSubmitting || isSubmitting) && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            {(formikIsSubmitting || isSubmitting) ? 'Creating...' : 'Create Job'}
                        </Button>
                    </div>
                </Form>
             )}
          </Formik>
        ) : (
          // Show sign-in prompt if not authenticated
          <div className="py-4 text-center">
            <p className="mb-4">You need to be signed in to create a job.</p>
            <Button onClick={() => signIn()}>Sign In</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobButton;
