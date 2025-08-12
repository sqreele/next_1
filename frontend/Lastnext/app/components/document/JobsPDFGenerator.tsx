// ./app/components/document/JobsPDFGenerator.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Job, TabValue, FILTER_TITLES } from '@/app/lib/types';

// Track whether Sarabun has been registered to avoid duplicate registrations
let sarabunRegistered = false;

interface JobsPDFDocumentProps {
  jobs: Job[];
  filter: TabValue;
  selectedProperty?: string | null;
  propertyName?: string;
  // New: allow disabling custom fonts and images for safer generation
  useCustomFont?: boolean;
  disableImages?: boolean;
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
    // fontFamily will be applied dynamically to support fallback fonts
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 10,
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
    paddingVertical: 8,
    paddingHorizontal: 5,
    minHeight: 80, // ลดความสูงขั้นต่ำ
    maxHeight: 120, // กำหนดความสูงสูงสุด
    marginBottom: 5,
    break: false, // ป้องกันการแบ่งแถว
  },
  imageColumn: {
    width: '25%', // ลดขนาดรูป
    marginRight: 10
  },
  infoColumn: {
    width: '40%', // เพิ่มพื้นที่สำหรับข้อมูล
    paddingRight: 8
  },
  dateColumn: {
    width: '35%'
  },
  jobImage: {
    width: '100%',
    height: 60, // ลดความสูงรูป
    objectFit: 'cover'
  },
  label: {
    fontSize: 8, // ลดขนาดฟอนต์
    color: '#666',
    marginBottom: 1
  },
  value: {
    fontSize: 8, // ลดขนาดฟอนต์
    marginBottom: 3,
    lineHeight: 1.2 // ลดระยะห่างบรรทัด
  },
  statusBadge: {
    fontSize: 8,
    color: '#1a56db',
    marginBottom: 3
  },
  priorityBadge: {
    fontSize: 8,
    marginBottom: 3
  },
  dateText: {
    fontSize: 8,
    marginBottom: 2,
    lineHeight: 1.1
  },
  // เพิ่ม style สำหรับข้อความที่อาจยาว
  truncatedText: {
    fontSize: 8,
    marginBottom: 3,
    lineHeight: 1.2,
    maxLines: 2, // จำกัดจำนวนบรรทัด
  }
});

// Safely determine whether a job belongs to a selected property (mirror UI logic)
function doesJobBelongToProperty(job: Job, selectedProperty: string): boolean {
  // Direct field
  if (job.property_id && String(job.property_id) === selectedProperty) return true;

  // Flexible properties array with different shapes
  if (Array.isArray(job.properties) && job.properties.length > 0) {
    const hasProperty = job.properties.some((prop: any) => {
      if (typeof prop === 'string' || typeof prop === 'number') {
        return String(prop) === selectedProperty;
      }
      if (prop && typeof prop === 'object' && 'property_id' in prop) {
        return String((prop as any).property_id) === selectedProperty;
      }
      if (prop && typeof prop === 'object' && 'id' in prop) {
        return String((prop as any).id) === selectedProperty;
      }
      if (prop && typeof prop === 'object') {
        return Object.values(prop).some(
          (value) => (typeof value === 'string' || typeof value === 'number') && String(value) === selectedProperty
        );
      }
      return false;
    });
    if (hasProperty) return true;
  }

  // Legacy profile_image-based properties shape
  if (job.profile_image?.properties?.some((prop: any) => String((prop as any).property_id ?? (prop as any).id ?? prop) === selectedProperty)) {
    return true;
  }

  return false;
}

// Only allow safe image URLs (avoid mixed-content/CORS crashes in @react-pdf/renderer)
function getSafeImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    // Allow https absolute URLs
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return url;
    return undefined;
  } catch {
    // Allow same-origin relative URLs
    if (url.startsWith('/')) return url;
    return undefined;
  }
}

const JobsPDFDocument: React.FC<JobsPDFDocumentProps> = ({ jobs, filter, selectedProperty, propertyName, useCustomFont = true, disableImages = false }) => {
  // Register Sarabun font only when explicitly requested
  if (useCustomFont && !sarabunRegistered) {
    try {
      Font.register({
        family: 'Sarabun',
        fonts: [
          { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 'normal' },
          { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
        ],
      });
      sarabunRegistered = true;
    } catch (err) {
      // If registration fails, continue with default fonts
      // eslint-disable-next-line no-console
      console.warn('[JobsPDF] Failed to register custom font. Falling back to default font.', err);
      // Ensure we do not retry endlessly
      sarabunRegistered = true;
      useCustomFont = false;
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (!selectedProperty) return true;

    return (
      doesJobBelongToProperty(job, selectedProperty)
    );
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

  // ฟังก์ชันตัดข้อความที่ยาวเกินไป
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // แบ่ง jobs เป็นกลุมๆ เพื่อป้องกันการตกหน้า
  const jobsPerPage = 8; // จำนวน jobs ต่อหน้า
  const pageGroups = [] as Job[][];
  for (let i = 0; i < filteredJobs.length; i += jobsPerPage) {
    pageGroups.push(filteredJobs.slice(i, i + jobsPerPage));
  }

  return (
    <Document>
      {pageGroups.map((jobGroup, pageIndex) => (
        <Page key={pageIndex} size="A4" style={[styles.page, { fontFamily: useCustomFont ? 'Sarabun' : 'Helvetica' }]}> 
          {/* แสดง header เฉพาะหน้าแรก */}
          {pageIndex === 0 && (
            <View style={styles.header}>
              <Text style={styles.headerText}>{propertyName || 'Unnamed Property'}</Text>
              <Text style={styles.subHeaderText}>{FILTER_TITLES[filter] || 'Job Report'}</Text>
              <Text style={styles.label}>Total Jobs: {filteredJobs.length}</Text>
            </View>
          )}

          {/* แสดง page number สำหรับหน้าที่ 2 เป็นต้นไป */}
          {pageIndex > 0 && (
            <View style={{ marginBottom: 15, alignItems: 'center' }}>
              <Text style={styles.subHeaderText}>Page {pageIndex + 1}</Text>
            </View>
          )}

          {jobGroup.map((job) => {
            const imageUrl = getSafeImageUrl(job.images?.[0]?.image_url);
            return (
              <View key={job.job_id} style={styles.jobRow} wrap={false}>
                <View style={styles.imageColumn}>
                  {!disableImages && imageUrl && (
                    <Image
                      src={imageUrl}
                      style={styles.jobImage}
                    />
                  )}
                </View>

                <View style={styles.infoColumn}>
                  <Text style={styles.label}>
                    Location: {job.rooms?.[0]?.name || 'N/A'}
                  </Text>
                  {job.rooms?.[0]?.room_type && (
                    <Text style={styles.label}>Room: {job.rooms[0].room_type}</Text>
                  )}
                  <Text style={styles.label}>
                    Topics: {job.topics?.length ? job.topics.map(t => t.title || 'N/A').join(', ') : 'None'}
                  </Text>
                  <Text style={styles.statusBadge}>Status: {job.status?.replace('_', ' ') || 'N/A'}</Text>
                  <Text style={{
                    ...styles.priorityBadge as any,
                    color: getPriorityColor(job.priority as any)
                  }}>
                    Priority: {job.priority || 'N/A'}
                  </Text>
                  <Text style={styles.label}>
                    Staff: {getUserDisplayName(job.user)}
                  </Text>
                </View>

                <View style={styles.dateColumn}>
                  {job.description && (
                    <>
                      <Text style={styles.label}>Description:</Text>
                      <Text style={styles.truncatedText}>
                        {truncateText(job.description, 80)}
                      </Text>
                    </>
                  )}
                  {job.remarks && (
                    <>
                      <Text style={styles.label}>Remarks:</Text>
                      <Text style={styles.truncatedText}>
                        {truncateText(job.remarks, 80)}
                      </Text>
                    </>
                  )}
                  <Text style={styles.dateText}>Created: {formatDate(job.created_at)}</Text>
                  <Text style={styles.dateText}>Updated: {formatDate(job.updated_at)}</Text>
                  {job.completed_at && (
                    <Text style={styles.dateText}>Completed: {formatDate(job.completed_at)}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
};

export default JobsPDFDocument;
export { JobsPDFDocument };