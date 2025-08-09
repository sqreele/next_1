'use client';

import Link from 'next/link';

const LandingPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <div className="text-center p-8 space-y-6">
        <h1 className="text-5xl font-extrabold leading-tight">
          Welcome to Our Platform!
        </h1>
        <p className="mt-4 text-xl max-w-md mx-auto">
          Your journey to better management starts here. Explore, engage, and manage with ease.
        </p>
        <div className="mt-8 space-x-4">
          <Link href="/auth/signin">
            <button className="px-6 py-3 text-lg bg-white text-blue-600 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
              Get Started
            </button>
          </Link>
          <Link href="/auth/register">
            <button className="px-6 py-3 text-lg bg-transparent border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
              Create Account
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;