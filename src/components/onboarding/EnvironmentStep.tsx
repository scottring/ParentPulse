'use client';

import { useState } from 'react';

interface SchoolInfo {
  grade?: string;
  specialServices?: string[];
  iepOrFiveOFour?: boolean;
}

interface EnvironmentStepProps {
  childName: string;
  initialData?: SchoolInfo;
  onComplete: (schoolInfo?: SchoolInfo) => void;
  onBack: () => void;
  onSkip: () => void;
}

const gradeOptions = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
  'Not in school yet',
  'Homeschooled'
];

const serviceOptions = [
  'Speech Therapy',
  'Occupational Therapy',
  'Physical Therapy',
  'Special Education',
  'Reading Specialist',
  'Math Support',
  'Behavioral Support',
  'Counseling',
  'English Language Learning'
];

export default function EnvironmentStep({
  childName,
  initialData,
  onComplete,
  onBack,
  onSkip
}: EnvironmentStepProps) {
  const [grade, setGrade] = useState(initialData?.grade || '');
  const [specialServices, setSpecialServices] = useState<string[]>(initialData?.specialServices || []);
  const [iepOrFiveOFour, setIepOrFiveOFour] = useState(initialData?.iepOrFiveOFour || false);

  const handleToggleService = (service: string) => {
    if (specialServices.includes(service)) {
      setSpecialServices(specialServices.filter(s => s !== service));
    } else {
      setSpecialServices([...specialServices, service]);
    }
  };

  const handleNext = () => {
    const schoolInfo: SchoolInfo = {
      grade: grade || undefined,
      specialServices: specialServices.length > 0 ? specialServices : undefined,
      iepOrFiveOFour: iepOrFiveOFour || undefined
    };

    onComplete(schoolInfo);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="parent-heading text-3xl mb-3" style={{ color: 'var(--parent-text)' }}>
          A few quick details about {childName}'s environment
        </h2>
        <p className="text-base mb-2" style={{ color: 'var(--parent-text-light)' }}>
          This step is optional but helps us provide more tailored support.
        </p>
        <button
          onClick={onSkip}
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--parent-accent)' }}
        >
          Skip this step →
        </button>
      </div>

      {/* Grade Level */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
          Grade Level
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gradeOptions.map((gradeOption) => {
            const isSelected = grade === gradeOption;
            return (
              <button
                key={gradeOption}
                onClick={() => setGrade(gradeOption)}
                className="p-4 rounded-lg border-2 transition-all text-center"
                style={{
                  borderColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
                  backgroundColor: isSelected ? 'var(--parent-bg)' : 'white',
                  color: isSelected ? 'var(--parent-accent)' : 'var(--parent-text)'
                }}
              >
                <div className="font-medium text-sm">{gradeOption}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Services */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
          Special Services
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
          Does {childName} receive any special services at school?
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {serviceOptions.map((service) => {
            const isSelected = specialServices.includes(service);
            return (
              <button
                key={service}
                onClick={() => handleToggleService(service)}
                className="p-4 rounded-lg border-2 transition-all text-center"
                style={{
                  borderColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
                  backgroundColor: isSelected ? 'var(--parent-bg)' : 'white',
                  color: isSelected ? 'var(--parent-accent)' : 'var(--parent-text)'
                }}
              >
                <div className="font-medium text-sm">{service}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* IEP or 504 Plan */}
      <div className="mb-10">
        <label className="flex items-start gap-4 cursor-pointer parent-card p-6 rounded-lg">
          <input
            type="checkbox"
            checked={iepOrFiveOFour}
            onChange={(e) => setIepOrFiveOFour(e.target.checked)}
            className="w-6 h-6 mt-1 flex-shrink-0"
          />
          <div>
            <div className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
              IEP or 504 Plan
            </div>
            <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
              {childName} has an Individualized Education Program (IEP) or 504 Plan at school
            </div>
          </div>
        </label>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={onBack}
          className="px-8 py-3 rounded-lg border transition-colors"
          style={{
            borderColor: 'var(--parent-border)',
            color: 'var(--parent-text)'
          }}
        >
          Back
        </button>
        <button
          onClick={onSkip}
          className="px-8 py-3 rounded-lg border transition-colors"
          style={{
            borderColor: 'var(--parent-border)',
            color: 'var(--parent-text-light)'
          }}
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--parent-accent)',
            color: 'white'
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
