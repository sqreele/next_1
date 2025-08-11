import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { API_CONFIG } from '@/app/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q') || searchParams.get('search');
    const type = searchParams.get('type') || 'all';

    // If no search term, return empty results
    if (!searchTerm) {
      return NextResponse.json({
        jobs: [],
        properties: [],
        rooms: [],
        topics: [],
        total: 0
      });
    }

    // Search across different endpoints based on type
    const searchPromises = [];
    const results: any = {
      jobs: [],
      properties: [],
      rooms: [],
      topics: [],
      total: 0
    };

    // Search jobs
    if (type === 'all' || type === 'jobs') {
      searchPromises.push(
        fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.jobs}?search=${encodeURIComponent(searchTerm)}`, {
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json',
          },
        }).then(res => res.ok ? res.json() : { results: [] })
      );
    }

    // Search properties
    if (type === 'all' || type === 'properties') {
      searchPromises.push(
        fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.properties}?search=${encodeURIComponent(searchTerm)}`, {
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json',
          },
        }).then(res => res.ok ? res.json() : [])
      );
    }

    // Search rooms
    if (type === 'all' || type === 'rooms') {
      searchPromises.push(
        fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.rooms}?search=${encodeURIComponent(searchTerm)}`, {
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json',
          },
        }).then(res => res.ok ? res.json() : [])
      );
    }

    // Search topics
    if (type === 'all' || type === 'topics') {
      searchPromises.push(
        fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.topics}?search=${encodeURIComponent(searchTerm)}`, {
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json',
          },
        }).then(res => res.ok ? res.json() : [])
      );
    }

    // Wait for all search requests to complete
    const searchResults = await Promise.all(searchPromises);

    // Combine results
    let resultIndex = 0;
    if (type === 'all' || type === 'jobs') {
      results.jobs = searchResults[resultIndex]?.results || searchResults[resultIndex] || [];
      resultIndex++;
    }
    if (type === 'all' || type === 'properties') {
      results.properties = searchResults[resultIndex] || [];
      resultIndex++;
    }
    if (type === 'all' || type === 'rooms') {
      results.rooms = searchResults[resultIndex] || [];
      resultIndex++;
    }
    if (type === 'all' || type === 'topics') {
      results.topics = searchResults[resultIndex] || [];
      resultIndex++;
    }

    // Calculate total
    results.total = results.jobs.length + results.properties.length + results.rooms.length + results.topics.length;

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error fetching search results:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 