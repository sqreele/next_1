'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function DebugSession() {
  const { data: session, status } = useSession();
  const [apiTest, setApiTest] = useState<any>(null);
  const [fullAuthTest, setFullAuthTest] = useState<any>(null);
  const [sessionTest, setSessionTest] = useState<any>(null);

  // Helper function to safely get error message
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  };

  // Test API call with session
  const testApiCall = async () => {
    try {
      const response = await fetch('/api/rooms/?property=PB749146D');
      const data = await response.json();
      setApiTest({
        status: response.status,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      setApiTest({ error: getErrorMessage(error) });
    }
  };

  // Test full auth debug
  const testFullAuth = async () => {
    try {
      const response = await fetch('/api/debug-full-auth');
      const data = await response.json();
      setFullAuthTest(data);
    } catch (error) {
      setFullAuthTest({ error: getErrorMessage(error) });
    }
  };

  // Test session endpoint
  const testSession = async () => {
    try {
      const response = await fetch('/api/test-session');
      const data = await response.json();
      setSessionTest(data);
    } catch (error) {
      setSessionTest({ error: getErrorMessage(error) });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl mb-6">Session Debug Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl mb-4">Client Session Status: {status}</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl mb-4">Server-Side Tests</h2>
          
          <div className="space-y-4">
            <div>
              <button 
                onClick={testSession}
                className="bg-purple-500 text-white px-4 py-2 rounded mb-2 mr-2"
              >
                Test Session
              </button>
              {sessionTest && (
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(sessionTest, null, 2)}
                </pre>
              )}
            </div>

            <div>
              <button 
                onClick={testFullAuth}
                className="bg-blue-500 text-white px-4 py-2 rounded mb-2 mr-2"
              >
                Test Full Auth Debug
              </button>
              {fullAuthTest && (
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(fullAuthTest, null, 2)}
                </pre>
              )}
            </div>

            <div>
              <button 
                onClick={testApiCall}
                className="bg-green-500 text-white px-4 py-2 rounded mb-2"
              >
                Test Rooms API
              </button>
              {apiTest && (
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(apiTest, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Debug Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Check if client session shows valid data</li>
          <li>Test session endpoint to see basic server-side session retrieval</li>
          <li>Test full auth debug to see detailed server-side analysis</li>
          <li>Test rooms API to see if it can access the session</li>
          <li>Check browser console and server logs for detailed debugging info</li>
        </ol>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Quick Links:</h3>
        <div className="space-y-2">
          <div><a href="/api/test-session" target="_blank" className="text-blue-600 hover:underline">Direct Session Test</a></div>
          <div><a href="/api/debug-full-auth" target="_blank" className="text-blue-600 hover:underline">Direct Full Auth Debug</a></div>
          <div><a href="/api/simple-debug" target="_blank" className="text-blue-600 hover:underline">Direct Simple Debug</a></div>
          <div><a href="/api/rooms/?property=PB749146D" target="_blank" className="text-blue-600 hover:underline">Direct Rooms API Test</a></div>
        </div>
      </div>
    </div>
  );
}
