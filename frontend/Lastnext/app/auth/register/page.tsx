'use client';

import RegisterForm from '@/app/components/profile/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Create your account</h2>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}