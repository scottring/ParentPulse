'use client';

import React, { useState } from 'react';
import { TechnicalCard, TechnicalButton, TechnicalLabel } from '../technical';
import {
  InterventionSeverity,
  SEVERITY_CONFIG,
  ENVIRONMENTAL_FACTORS,
  INTERVENTION_TEMPLATES,
} from '@/types/intervention';

interface InterventionWizardProps {
  familyMembers: { personId: string; name: string }[];
  onSubmit: (data: {
    title: string;
    description: string;
    whatHappened: string;
    severity: InterventionSeverity;
    personId?: string;
    personName?: string;
    environmentalFactors: string[];
  }) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

type WizardStep = 'template' | 'person' | 'details' | 'factors' | 'confirm';

export function InterventionWizard({
  familyMembers,
  onSubmit,
  onCancel,
  className = '',
}: InterventionWizardProps) {
  const [step, setStep] = useState<WizardStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof INTERVENTION_TEMPLATES[number] | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<{ personId: string; name: string } | null>(null);
  const [isHouseholdWide, setIsHouseholdWide] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [severity, setSeverity] = useState<InterventionSeverity>('moderate');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTemplateSelect = (template: typeof INTERVENTION_TEMPLATES[number]) => {
    setSelectedTemplate(template);
    setTitle(template.title);
    setDescription(template.description);
    setSeverity(template.defaultSeverity);
    setSelectedFactors([...template.suggestedFactors]);
    setStep('person');
  };

  const handlePersonSelect = (person: { personId: string; name: string } | null, householdWide: boolean) => {
    setSelectedPerson(person);
    setIsHouseholdWide(householdWide);
    setStep('details');
  };

  const handleDetailsComplete = () => {
    setStep('factors');
  };

  const handleFactorsComplete = () => {
    setStep('confirm');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        whatHappened,
        severity,
        personId: selectedPerson?.personId,
        personName: selectedPerson?.name,
        environmentalFactors: selectedFactors,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFactor = (factorId: string) => {
    setSelectedFactors((prev) =>
      prev.includes(factorId)
        ? prev.filter((f) => f !== factorId)
        : [...prev, factorId]
    );
  };

  return (
    <div className={className}>
      {/* Step: Select template */}
      {step === 'template' && (
        <TechnicalCard cornerBrackets shadowSize="lg" className="p-6">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-4">
            WHAT HAPPENED?
          </h2>
          <p className="text-slate-600 mb-6">
            Select the type of incident or describe your own.
          </p>

          <div className="space-y-3">
            {INTERVENTION_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="w-full text-left p-4 border-2 border-slate-200 hover:border-slate-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-mono font-bold text-slate-800">
                      {template.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {template.description}
                    </p>
                  </div>
                  <TechnicalLabel
                    variant="outline"
                    color={template.defaultSeverity === 'severe' || template.defaultSeverity === 'crisis' ? 'red' : 'amber'}
                    size="xs"
                  >
                    {template.defaultSeverity}
                  </TechnicalLabel>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <TechnicalButton variant="outline" onClick={onCancel}>
              CANCEL
            </TechnicalButton>
          </div>
        </TechnicalCard>
      )}

      {/* Step: Select person */}
      {step === 'person' && (
        <TechnicalCard cornerBrackets shadowSize="lg" className="p-6">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-4">
            WHO IS THIS ABOUT?
          </h2>

          <div className="space-y-3">
            {/* Household-wide option */}
            <button
              onClick={() => handlePersonSelect(null, true)}
              className="w-full text-left p-4 border-2 border-slate-200 hover:border-slate-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 flex items-center justify-center text-white font-mono text-sm">
                  HQ
                </div>
                <div>
                  <h3 className="font-mono font-bold text-slate-800">
                    Household-Wide
                  </h3>
                  <p className="text-sm text-slate-600">
                    Affects the whole family
                  </p>
                </div>
              </div>
            </button>

            {/* Individual family members */}
            {familyMembers.map((member) => (
              <button
                key={member.personId}
                onClick={() => handlePersonSelect(member, false)}
                className="w-full text-left p-4 border-2 border-slate-200 hover:border-slate-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-mono text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {member.name}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
            <TechnicalButton variant="outline" onClick={() => setStep('template')}>
              BACK
            </TechnicalButton>
          </div>
        </TechnicalCard>
      )}

      {/* Step: Details */}
      {step === 'details' && (
        <TechnicalCard cornerBrackets shadowSize="lg" className="p-6">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-4">
            TELL US MORE
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                WHAT HAPPENED?
              </label>
              <textarea
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                placeholder="Describe what happened in detail..."
                className="w-full p-3 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                rows={4}
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                SEVERITY
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['mild', 'moderate', 'severe', 'crisis'] as InterventionSeverity[]).map((sev) => {
                  const config = SEVERITY_CONFIG[sev];
                  return (
                    <button
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`
                        p-3 border-2 font-mono text-sm uppercase
                        ${severity === sev
                          ? `${config.bgColor} ${config.borderColor} ${config.textColor}`
                          : 'border-slate-300 text-slate-600 hover:border-slate-400'
                        }
                      `}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {SEVERITY_CONFIG[severity].description}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
            <TechnicalButton variant="outline" onClick={() => setStep('person')}>
              BACK
            </TechnicalButton>
            <TechnicalButton
              variant="primary"
              onClick={handleDetailsComplete}
              disabled={!title || !whatHappened}
            >
              CONTINUE
            </TechnicalButton>
          </div>
        </TechnicalCard>
      )}

      {/* Step: Factors */}
      {step === 'factors' && (
        <TechnicalCard cornerBrackets shadowSize="lg" className="p-6">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-4">
            CONTRIBUTING FACTORS
          </h2>
          <p className="text-slate-600 mb-4">
            What might have contributed to this? Select all that apply.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {ENVIRONMENTAL_FACTORS.map((factor) => (
              <button
                key={factor.id}
                onClick={() => toggleFactor(factor.id)}
                className={`
                  p-3 border-2 text-left
                  ${selectedFactors.includes(factor.id)
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }
                `}
              >
                <span className="font-mono text-xs">{factor.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
            <TechnicalButton variant="outline" onClick={() => setStep('details')}>
              BACK
            </TechnicalButton>
            <TechnicalButton variant="primary" onClick={handleFactorsComplete}>
              CONTINUE
            </TechnicalButton>
          </div>
        </TechnicalCard>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <TechnicalCard cornerBrackets shadowSize="lg" className="p-6">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-4">
            CONFIRM INTERVENTION
          </h2>

          <div className="space-y-3 mb-6">
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="font-mono text-xs text-slate-500 uppercase">Title</span>
              <p className="font-mono font-bold text-slate-800">{title}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="font-mono text-xs text-slate-500 uppercase">Person</span>
              <p className="font-mono text-slate-800">
                {isHouseholdWide ? 'Household-Wide' : selectedPerson?.name}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="font-mono text-xs text-slate-500 uppercase">Severity</span>
              <TechnicalLabel
                variant="filled"
                color={severity === 'severe' || severity === 'crisis' ? 'red' : 'amber'}
                size="sm"
              >
                {severity.toUpperCase()}
              </TechnicalLabel>
            </div>
          </div>

          <div className="flex gap-3">
            <TechnicalButton variant="outline" onClick={() => setStep('factors')}>
              BACK
            </TechnicalButton>
            <TechnicalButton
              variant="danger"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'CREATING...' : 'START INTERVENTION'}
            </TechnicalButton>
          </div>
        </TechnicalCard>
      )}
    </div>
  );
}

export default InterventionWizard;
