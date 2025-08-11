import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG } from '@/app/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await params;

    // Fetch property from the external API
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.properties}${propertyId}/`,
      {
        headers: {
          'Authorization': `Bearer ${session.user.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch property:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch property' }, 
        { status: response.status }
      );
    }

    const property = await response.json();
    return NextResponse.json(property);

  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 