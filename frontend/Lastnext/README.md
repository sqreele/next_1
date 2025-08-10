# Property Management & Maintenance System

A modern admin dashboard built with Next.js, Postgres, NextAuth, and Tailwind CSS for efficient property and maintenance management.

## Features

- 🔐 **Secure Authentication** with NextAuth.js and JWT tokens
- 🏢 **Property Management** with multi-property support
- 🔧 **Maintenance Tracking** with job status management
- 📊 **Dashboard Analytics** with real-time data
- 📱 **Responsive Design** optimized for all devices
- 🔄 **Automatic Token Refresh** for seamless user experience

## Authentication System

This application uses NextAuth.js with a custom credentials provider that integrates with an external API. The authentication system includes:

- JWT-based authentication with automatic token refresh
- Session management with error handling
- Route protection middleware
- Comprehensive error pages
- Security headers and CSRF protection

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Authentication Configuration
NEXTAUTH_SECRET=your-secure-secret-here-minimum-32-characters
NEXTAUTH_URL=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Optional: Debug mode (set to true for development)
NEXTAUTH_DEBUG=true
```

### Security Requirements

- `NEXTAUTH_SECRET`: Must be at least 32 characters long
- Use HTTPS in production
- Keep environment variables secure and never commit them to version control

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables** (see above)

3. **Run database migrations:**
```bash
npx prisma migrate dev
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)** with your browser

## Authentication Flow

1. User submits credentials on `/auth/signin`
2. System validates with external API
3. JWT tokens are issued and stored securely
4. Automatic token refresh handles session expiry
5. Route protection ensures secure access
6. Error handling provides clear feedback

## Project Structure

```
app/
├── auth/                 # Authentication pages
│   ├── signin/          # Login page
│   ├── register/        # Registration page
│   └── error/           # Error handling page
├── lib/                 # Core utilities
│   ├── auth.ts          # NextAuth configuration
│   ├── config.ts        # Centralized configuration
│   ├── auth-helpers.ts  # Token refresh utilities
│   └── hooks/           # Custom React hooks
├── middleware.ts        # Route protection
└── providers.tsx        # Session provider
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
