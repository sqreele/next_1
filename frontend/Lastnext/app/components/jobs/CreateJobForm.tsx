"use client";

import React, { useState } from 'react';

const API_BASE_URL = '';

export default function CreateJobForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/jobs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      if (!response.ok) throw new Error('Failed to create job');
      setTitle('');
      setDescription('');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input className="border p-2 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <textarea className="border p-2 w-full" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  );
}
