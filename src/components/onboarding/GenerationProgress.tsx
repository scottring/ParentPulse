'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  'Turning your values into a family discussion...',
  'Writing a story inspired by your family\'s identity...',
  'Creating an activity from your connection rituals...',
  'Building a reflection from your communication patterns...',
  'Crafting a goal from what matters most to you...',
  'Almost there \u2014 putting it all together...',
];

export function GenerationProgress() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
      setFadeKey((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div
        key={fadeKey}
        className="animate-fade-in-up text-lg text-stone-600 text-center max-w-md"
      >
        {MESSAGES[messageIndex]}
      </div>

      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-stone-300 animate-pulse"
            style={{ animationDelay: `${i * 300}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
