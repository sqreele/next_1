// ./app/components/document/JobsPDFGenerator.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Job, TabValue, FILTER_TITLES } from '@/app/lib/types';

// ✅ Register Thai font (Sarabun)
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
  ],
});

interface JobsPDFDocumentProps {
  jobs: Job[];
  filter: TabValue;
  selectedProperty?: string | null;
  propertyName?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
    fontFamily: 'Sarabun', // ✅ Set Thai font
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#eee',
    padding: 10,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5
  },
  subHeaderText: {
    fontSize: 12,
    marginBottom: 5
  },
  jobRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    padding: 10,
    minHeight: 150,
  },
  imageColumn: {
    width: '30%',
    marginRight: 15
  },
  infoColumn: {
    width: '35%',
    paddingRight: 10
  },
  dateColumn: {
    width: '35%'
  },
  jobImage: {
    width: '100%',
    height: 120,
    objectFit: 'cover'
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2
  },
  value: {
    fontSize: 10,
    marginBottom: 8
  },
  statusBadge: {
    fontSize: 10,
    color: '#1a56db',
    marginBottom: 8
  },
  priorityBadge: {
    fontSize: 10,
    marginBottom: 8
  },
  dateText: {
    fontSize: 10,
    marginBottom: 4
  }
});

const JobsPDFDocument: React.FC<JobsPDFDocumentProps> = ({ jobs, filter, selectedProperty, propertyName }) => {
  const filteredJobs = jobs.filter((job) => {
    if (!selectedProperty) return true;

    return job.property_id === selectedProperty ||
      (job.profile_image?.properties.some(
        (prop) => String(prop.property_id) === selectedProperty
      )) || false;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#000000';
    }
  };

  const getUserDisplayName = (user: any): string => {
    if (!user) return 'Unassigned';
    if (typeof user === 'string') return user;
    if (typeof user === 'object') {
      return user.name || user.username || user.displayName || user.email || String(user.id) || 'User';
    }
    return 'User';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{propertyName || 'Unnamed Property'}</Text>
          <Text style={styles.subHeaderText}>{FILTER_TITLES[filter] || 'Job Report'}</Text>
          <Text style={styles.label}>Total Jobs: {filteredJobs.length}</Text>
        </View>

        {filteredJobs.map((job) => (
          <View key={job.job_id} style={styles.jobRow}>
            <View style={styles.imageColumn}>
              {job.images && job.images.length > 0 && (
                <Image
                  src={job.images[0].image_url}
                  style={styles.jobImage}
                />
              )}
            </View>

            <View style={styles.infoColumn}>
              <Text style={styles.label}>
                Location: {job.rooms?.[0]?.name || 'N/A'}
              </Text>
              {job.rooms?.[0]?.room_type && (
                <Text style={styles.label}>Room type: {job.rooms[0].room_type}</Text>
              )}
              <Text style={styles.label}>
                Topics: {job.topics?.length ? job.topics.map(t => t.title || 'N/A').join(', ') : 'None'}
              </Text>
              <Text style={styles.statusBadge}>Status: {job.status.replace('_', ' ')}</Text>
              <Text style={{
                ...styles.priorityBadge,
                color: getPriorityColor(job.priority)
              }}>
                Priority: {job.priority}
              </Text>
              <Text style={styles.label}>
                Staff: {getUserDisplayName(job.user)}
              </Text>
            </View>

            <View style={styles.dateColumn}>
              {job.description && (
                <>
                  <Text style={styles.label}>Description:</Text>
                  <Text style={styles.value}>{job.description}</Text>
                </>
              )}
              {job.remarks && (
                <>
                  <Text style={styles.label}>Remarks:</Text>
                  <Text style={styles.value}>{job.remarks}</Text>
                </>
              )}
              <Text style={styles.dateText}>Created: {formatDate(job.created_at)}</Text>
              <Text style={styles.dateText}>Updated: {formatDate(job.updated_at)}</Text>
              {job.completed_at && (
                <Text style={styles.dateText}>Completed: {formatDate(job.completed_at)}</Text>
              )}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
};

export default JobsPDFDocument;
export { JobsPDFDocument };
