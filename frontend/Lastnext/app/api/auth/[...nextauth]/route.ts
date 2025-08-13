// app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

import NextAuth from "next-auth";
import authOptions from "@/app/lib/auth"; // Default import

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };