// app/lib/debug-config.ts
export function debugConfig() {
  const config = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
  };

  console.log('🔧 Environment Configuration Debug:', config);
  
  // Check for common issues
  const issues = [];
  
  if (!process.env.NEXTAUTH_SECRET) {
    issues.push('❌ NEXTAUTH_SECRET is not set');
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    issues.push('❌ NEXTAUTH_SECRET is too short (minimum 32 characters)');
  }
  
  if (!process.env.NEXT_PUBLIC_API_URL) {
    issues.push('❌ NEXT_PUBLIC_API_URL is not set');
  }
  
  if (!process.env.DATABASE_URL) {
    issues.push('❌ DATABASE_URL is not set');
  }
  
  if (issues.length > 0) {
    console.error('🚨 Configuration Issues Found:', issues);
  } else {
    console.log('✅ Configuration looks good');
  }
  
  return { config, issues };
}

export function debugApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
    (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");
  
  console.log('🌐 API URL Configuration:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
    resolvedUrl: apiUrl,
  });
  
  return apiUrl;
} 