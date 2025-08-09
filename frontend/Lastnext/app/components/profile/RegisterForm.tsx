import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormField from './FormField';
import { RegisterFormData, ErrorState,} from '@/app/lib/types';
import axios from 'axios';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function RegisterForm() { 
  const router = useRouter();
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = (formData: FormData): boolean => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError({ message: "Passwords do not match", field: "confirmPassword" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
   
    const formData = new FormData(e.currentTarget);
    if (!validateForm(formData)) {
      setLoading(false);
      return;
    }
   
    const registrationData: RegisterFormData = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };
   
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/auth/register/`,
        registrationData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
     
      if (response.data.access) {
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        router.push('/auth/signin?registered=success');
      }
     } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('Error response:', error.response?.data);
        const errors = error.response?.data;
        
        if (typeof errors === 'object') {
          const firstError = Object.values(errors)[0];
          setError({
            message: Array.isArray(firstError) ? firstError[0] : String(firstError),
            field: Object.keys(errors)[0]
          });
        } else {
          setError({ 
            message: errors?.detail || errors?.message || 'Registration failed'
          });
        }
      } else {
        setError({ message: 'Registration failed' });
      }
     } finally {
      setLoading(false);
     }
   };
  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error.message}
        </div>
      )}

      <div className="rounded-md shadow-sm space-y-4">
        <FormField id="username" label="Username" error={error?.field === 'username' ? error.message : undefined} />
        <FormField id="email" label="Email" type="email" error={error?.field === 'email' ? error.message : undefined} />
        <FormField id="password" label="Password" type="password" error={error?.field === 'password' ? error.message : undefined} />
        <FormField id="confirmPassword" label="Confirm Password" type="password" error={error?.field === 'confirmPassword' ? error.message : undefined} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
          loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
      >
        {loading ? "Creating account..." : "Register"}
      </button>

      <div className="text-center mt-4">
        <Link href="/auth/signin" className="text-sm text-indigo-600 hover:text-indigo-500">
          Already have an account? Sign in
        </Link>
      </div>
    </form>
  );
}