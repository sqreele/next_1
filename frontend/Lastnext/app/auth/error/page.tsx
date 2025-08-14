"use client";

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROUTES } from '@/app/lib/config';

function AuthErrorInner() {
	const searchParams = useSearchParams();
	const error = searchParams.get('error');

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
			<div className="max-w-md w-full bg-white shadow rounded p-6 space-y-4">
				<h1 className="text-xl font-semibold text-red-600">Authentication error</h1>
				<p className="text-sm text-gray-700">
					{error ? `Error: ${error}` : 'Something went wrong during authentication.'}
				</p>
				<div className="pt-2">
					<Link href={ROUTES.signIn} className="text-indigo-600 hover:text-indigo-500 underline">
						Back to sign in
					</Link>
				</div>
			</div>
		</div>
	);
}

export default function AuthErrorPage() {
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
			<AuthErrorInner />
		</Suspense>
	);
}