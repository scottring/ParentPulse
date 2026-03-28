'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { people, loading: peopleLoading } = usePerson();

  if (authLoading || peopleLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Find the user's own person (self manual)
  const selfPerson = people.find((p) => p.linkedUserId === user.userId);

  // Find people who have manuals but aren't the current user (manuals waiting for their perspective)
  const othersWithManuals = people.filter(
    (p) => p.hasManual && p.linkedUserId !== user.userId && p.personId !== selfPerson?.personId
  );

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-mono font-bold text-3xl text-slate-800 mb-4">
            Welcome to Relish
          </h1>
          <p className="font-mono text-slate-600">
            Your family has started building operating manuals — living documents
            that help the people who love each other understand each other better.
          </p>
        </div>

        <div className="space-y-4">
          {/* Self onboarding */}
          {selfPerson && (
            <Link
              href={`/people/${selfPerson.personId}/manual/self-onboard`}
              className="block border-2 border-amber-300 bg-amber-50 p-6 hover:bg-amber-100 transition-colors"
            >
              <h3 className="font-mono font-bold text-amber-800 mb-1">
                Tell us about yourself
              </h3>
              <p className="font-mono text-sm text-amber-700">
                Answer questions about your needs, triggers, and what helps you thrive.
                This is your chance to be understood on your own terms.
              </p>
            </Link>
          )}

          {/* Others' manuals waiting for perspective */}
          {othersWithManuals.map((person) => (
            <Link
              key={person.personId}
              href={`/people/${person.personId}/manual`}
              className="block border-2 border-blue-300 bg-blue-50 p-6 hover:bg-blue-100 transition-colors"
            >
              <h3 className="font-mono font-bold text-blue-800 mb-1">
                {person.name}&apos;s manual
              </h3>
              <p className="font-mono text-sm text-blue-700">
                Someone has started building a manual for {person.name}.
                See what&apos;s there and add your perspective.
              </p>
            </Link>
          ))}

          {/* Skip to home */}
          <div className="text-center pt-4">
            <Link
              href="/people"
              className="font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              SKIP FOR NOW &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
