// ./app/components/JobTableRow.tsx
import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Pencil, Trash2, Home } from 'lucide-react';
import { Job,PRIORITY_VARIANTS, STATUS_VARIANTS } from '@/app/lib/types';


interface JobTableRowProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}

const JobTableRow: React.FC<JobTableRowProps> = ({ job, onEdit, onDelete }) => (
  <tr key={job.job_id} className="cursor-pointer hover:bg-gray-50">
    <td>
      <div className="space-y-1">
        <div className="text-xs">#{job.job_id}</div>
        <Badge variant={PRIORITY_VARIANTS[job.priority] || 'default'}>
          {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
        </Badge>
      </div>
    </td>
    <td>
      <div className="max-w-[300px] space-y-1">
        <p className="text-sm truncate">{job.description}</p>
        {job.topics?.map((topic) => (
          <Badge key={topic.id} variant="outline" className="text-xs">
            {topic.title}
          </Badge>
        ))}
      </div>
    </td>
    <td>
      {job.rooms?.map((room) => (
        <div key={room.room_id} className="flex items-center gap-1">
          <Home className="h-4 w-4" />
          {room.name}
        </div>
      ))}
    </td>
    <td>
      <Badge variant={STATUS_VARIANTS[job.status] || 'default'}>
        {job.status.replace('_', ' ').charAt(0).toUpperCase() + job.status.replace('_', ' ').slice(1)}
      </Badge>
    </td>
    <td>{new Date(job.created_at).toLocaleDateString()}</td>
    <td>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(job);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(job);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </td>
  </tr>
);

export default JobTableRow;