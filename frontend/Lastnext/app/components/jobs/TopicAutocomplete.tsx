import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TopicFromAPI } from '@/app/lib/types';

interface TopicAutocompleteProps {
  topics: TopicFromAPI[];
  selectedTopic: { title: string; description: string };
  onSelect: (topic: { title: string; description: string }) => void;
}

const TopicAutocomplete: React.FC<TopicAutocompleteProps> = ({ topics, selectedTopic, onSelect }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter topics based on the search query
  const filteredTopics = topics.filter((topic) =>
    topic.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Input field for searching/selecting topics */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={selectedTopic.title || 'Select a topic'}
        className="w-full h-12 text-base px-4 py-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Dropdown list of filtered topics */}
      {isOpen && filteredTopics.length > 0 && (
        <div className="absolute z-10 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 shadow-md rounded-md mt-1">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              className="px-4 py-2.5 text-base hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onSelect({ title: topic.title, description: topic.description || '' });
                setQuery(topic.title); // Update input to show selected topic
                setIsOpen(false); // Close dropdown
              }}
            >
              {topic.title}
            </div>
          ))}
        </div>
      )}

      {/* Message when no topics match the query */}
      {isOpen && filteredTopics.length === 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 shadow-md rounded-md mt-1 p-2 text-sm text-gray-500">
          No topics found
        </div>
      )}

      {/* Toggle button for opening/closing the dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
      >
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default TopicAutocomplete;
