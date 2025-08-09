import { notFound } from 'next/navigation';
import { fetchJob, fetchProperties } from '@/app/lib/data.server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import type { Metadata, ResolvingMetadata } from 'next';
import { MapPin, Clock, Calendar, User, CheckCircle2, MessageSquare, StickyNote, AlertTriangle } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/lib/utils';
import { Job, Property, JobStatus, JobPriority } from '@/app/lib/types';

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    const { jobId } = await params;
    const session = await getServerSession(authOptions);
    const accessToken = session?.user?.accessToken;
    const job = await fetchJob(jobId, accessToken);

    if (!job) {
      return {
        title: 'Job Not Found',
      };
    }

    const previousImages = (await parent).openGraph?.images || [];
    return {
      title: `${job.priority} | Job #${job.job_id}`,
      description: job.description || `Details for job ${job.id || job.job_id}`,
      openGraph: {
        images: job.image_urls?.[0] ? [job.image_urls[0], ...previousImages] : ['/job-default-image.jpg', ...previousImages],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error Loading Job',
    };
  }
}

export default async function JobPage({ params }: Props) {
  try {
    const { jobId } = await params;
    const session = await getServerSession(authOptions);
    const accessToken = session?.user?.accessToken;

    // Fetch job and properties
    const job = await fetchJob(jobId, accessToken);
    const properties = await fetchProperties(accessToken);

    if (!job) {
      notFound();
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
          Job: {job.priority} #{job.job_id}
        </h1>
        
        <div className="space-y-4 text-gray-700">
          {/* Basic Info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold">ID:</span>
            <span>{job.id || job.job_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>
            <Badge
              className={cn(
                "px-2 py-1 text-xs",
                job.status === 'completed' && 'bg-green-100 text-green-800',
                job.status === 'in_progress' && 'bg-blue-100 text-blue-800',
                job.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                job.status === 'cancelled' && 'bg-red-100 text-red-800',
                job.status === 'waiting_sparepart' && 'bg-purple-100 text-purple-800'
              )}
            >
              {job.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Description */}
          {job.description && (
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold">Description:</span>
                <p className="text-sm mt-1">{job.description}</p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>
                <span className="font-semibold">Created:</span> {formatDate(job.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>
                <span className="font-semibold">Updated:</span> {formatDate(job.updated_at)}
              </span>
            </div>
            {job.completed_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>
                  <span className="font-semibold">Completed:</span> {formatDate(job.completed_at)}
                </span>
              </div>
            )}
          </div>

          {/* User */}
          {job.user && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>
                <span className="font-semibold">Assigned to:</span>{' '}
                {typeof job.user === 'object' && job.user ? job.user.username : job.user || 'Unassigned'}
              </span>
            </div>
          )}

          {/* Rooms */}
          {job.rooms && job.rooms.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-semibold">Rooms:</span>
              </div>
              <ul className="ml-6 list-disc text-sm">
                {job.rooms.map(room => (
                  <li key={room.room_id}>{room.name || 'Unnamed Room'}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Properties */}
          {job.properties && job.properties.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-semibold">Properties:</span>
              </div>
              <ul className="ml-6 list-disc text-sm">
                {job.properties.map((propId, index) => {
                  const propKey = typeof propId === 'object' && propId ? 
                    String(propId.property_id || propId.id || index) : 
                    String(propId);
                  const prop = properties.find(p => p.property_id === propKey);
                  return <li key={propKey}>{prop?.name || `ID: ${propKey}`}</li>;
                })}
              </ul>
            </div>
          )}

          {/* Remarks */}
          {job.remarks && (
            <div className="flex items-start gap-2">
              <StickyNote className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold">Remarks:</span>
                <p className="text-sm mt-1">{job.remarks}</p>
              </div>
            </div>
          )}

          {/* Defective */}
          {job.is_defective && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-red-600">Defective</span>
            </div>
          )}

          {/* Images */}
          {job.image_urls && job.image_urls.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">Images</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {job.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Job image ${index + 1}`}
                    className="w-full h-auto rounded-md shadow-sm max-h-48 object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {job.topics && job.topics.length > 0 && (
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-800">Topics</h2>
              <div className="flex flex-wrap gap-2">
                {job.topics.map(topic => (
                  <Badge key={topic.id || topic.title} variant="outline" className="text-sm">
                    {topic.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error(`Error loading job page for jobId=${await params.then(p => p.jobId)}:`, error);
    throw new Error('Failed to load job page. Please try again later.');
  }
}

export const revalidate = 0;