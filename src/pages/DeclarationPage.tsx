import { useState } from 'react';
import type React from 'react';
import type { DeclarationData } from '../types';
import { submitDeclaration } from '../api';
import { buildDeclarationPayload } from '../utils/buildPayload';

interface Props {
  instructorNumber: string;
  territoryPostcode: string;
  onSuccess: () => void;
  onBack: () => void;
}

interface FormState {
  attendeeName: string;
  attendeeEmail: string;
  hasMedicalConditions: boolean;
  medicalConditionDetails: string;
  hasAllergies: boolean;
  allergyDetails: string;
  hasMobilityLimitations: boolean;
  mobilityDetails: string;
  isPregnant: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  additionalInfo: string;
  consentGiven: boolean;
}

const INITIAL_FORM: FormState = {
  attendeeName: '',
  attendeeEmail: '',
  hasMedicalConditions: false,
  medicalConditionDetails: '',
  hasAllergies: false,
  allergyDetails: '',
  hasMobilityLimitations: false,
  mobilityDetails: '',
  isPregnant: false,
  emergencyContactName: '',
  emergencyContactPhone: '',
  additionalInfo: '',
  consentGiven: false,
};

function YesNoToggle({
  value,
  onChange,
  name,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <div className="flex gap-3" role="group" aria-label={name}>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
          value
            ? 'border-[#006FAC] bg-[#006FAC] text-white'
            : 'border-[#D4E1E9] bg-white text-[#5A7A8F] hover:border-[#006FAC]'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
          !value
            ? 'border-[#006FAC] bg-[#006FAC] text-white'
            : 'border-[#D4E1E9] bg-white text-[#5A7A8F] hover:border-[#006FAC]'
        }`}
      >
        No
      </button>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_2px_8px_rgba(0,60,100,0.06)]">
      {children}
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-[#1A4359]"
    >
      {children}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-[#1A4359] placeholder-[#5A7A8F] focus:border-[#006FAC] focus:outline-none focus:ring-2 focus:ring-[#D4E8F5]"
    />
  );
}

function Textarea({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-[#1A4359] placeholder-[#5A7A8F] focus:border-[#006FAC] focus:outline-none focus:ring-2 focus:ring-[#D4E8F5]"
    />
  );
}

export function DeclarationPage({ instructorNumber, territoryPostcode, onSuccess, onBack }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = form.attendeeName.trim().length > 0 && form.consentGiven && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMessage(null);
    setSubmitting(true);

    const declarationData: DeclarationData = buildDeclarationPayload(form);

    const result = await submitDeclaration({
      instructor_number: instructorNumber,
      territory_postcode: territoryPostcode,
      attendee_name: form.attendeeName.trim(),
      attendee_email: form.attendeeEmail.trim() || undefined,
      declaration_data: declarationData,
      consent_given: true,
    });

    setSubmitting(false);

    if (result.ok) {
      onSuccess();
    } else {
      setErrorMessage(result.message);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-[#5A7A8F] hover:text-[#006FAC]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <h1 className="font-display text-2xl font-bold text-[#1A4359]">Health Declaration</h1>
        <p className="mt-1 text-sm text-[#5A7A8F]">
          Please answer honestly — this information helps your instructor keep you safe.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Attendee details */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Your details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="attendee-name">
                Full name <span className="text-[#DF542F]">*</span>
              </Label>
              <TextInput
                id="attendee-name"
                value={form.attendeeName}
                onChange={(v) => set('attendeeName', v)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="attendee-email">
                Email address <span className="text-[#5A7A8F] font-normal">(optional)</span>
              </Label>
              <TextInput
                id="attendee-email"
                type="email"
                value={form.attendeeEmail}
                onChange={(v) => set('attendeeEmail', v)}
                placeholder="your@email.com"
              />
              <p className="mt-1 text-xs text-[#5A7A8F]">
                Used only if your instructor needs to contact you about your declaration.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Medical conditions */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Medical conditions</h2>
          <div className="space-y-4">
            <div>
              <Label>Do you have any medical conditions we should be aware of?</Label>
              <YesNoToggle
                value={form.hasMedicalConditions}
                onChange={(v) => set('hasMedicalConditions', v)}
                name="Has medical conditions"
              />
            </div>
            {form.hasMedicalConditions && (
              <div>
                <Label htmlFor="medical-details">Please provide details</Label>
                <Textarea
                  id="medical-details"
                  value={form.medicalConditionDetails}
                  onChange={(v) => set('medicalConditionDetails', v)}
                  placeholder="e.g. epilepsy, diabetes, heart condition..."
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Allergies */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Allergies</h2>
          <div className="space-y-4">
            <div>
              <Label>Do you have any known allergies?</Label>
              <YesNoToggle
                value={form.hasAllergies}
                onChange={(v) => set('hasAllergies', v)}
                name="Has allergies"
              />
            </div>
            {form.hasAllergies && (
              <div>
                <Label htmlFor="allergy-details">Please provide details</Label>
                <Textarea
                  id="allergy-details"
                  value={form.allergyDetails}
                  onChange={(v) => set('allergyDetails', v)}
                  placeholder="e.g. latex, penicillin, nuts..."
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Mobility */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Mobility</h2>
          <div className="space-y-4">
            <div>
              <Label>Do you have any mobility limitations or physical restrictions?</Label>
              <YesNoToggle
                value={form.hasMobilityLimitations}
                onChange={(v) => set('hasMobilityLimitations', v)}
                name="Has mobility limitations"
              />
            </div>
            {form.hasMobilityLimitations && (
              <div>
                <Label htmlFor="mobility-details">Please provide details</Label>
                <Textarea
                  id="mobility-details"
                  value={form.mobilityDetails}
                  onChange={(v) => set('mobilityDetails', v)}
                  placeholder="e.g. back injury, wheelchair user, recent surgery..."
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Pregnancy */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Pregnancy</h2>
          <Label>Are you currently pregnant?</Label>
          <YesNoToggle
            value={form.isPregnant}
            onChange={(v) => set('isPregnant', v)}
            name="Is pregnant"
          />
        </SectionCard>

        {/* Emergency contact */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Emergency contact</h2>
          <p className="mb-4 text-sm text-[#5A7A8F]">Optional but recommended.</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ec-name">Contact name</Label>
              <TextInput
                id="ec-name"
                value={form.emergencyContactName}
                onChange={(v) => set('emergencyContactName', v)}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="ec-phone">Contact phone number</Label>
              <TextInput
                id="ec-phone"
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(v) => set('emergencyContactPhone', v)}
                placeholder="07700 000000"
              />
            </div>
          </div>
        </SectionCard>

        {/* Additional info */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Anything else?</h2>
          <Label htmlFor="additional-info">
            Any other information your instructor should know <span className="font-normal text-[#5A7A8F]">(optional)</span>
          </Label>
          <Textarea
            id="additional-info"
            value={form.additionalInfo}
            onChange={(v) => set('additionalInfo', v)}
            placeholder="Any other health or safety information..."
          />
        </SectionCard>

        {/* GDPR consent — prominent, required */}
        <div className="rounded-lg border-2 border-[#006FAC] bg-[#EDF5FA] p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-[#1A4359]">
            Consent to store health information
          </h2>
          <p className="mb-4 text-sm text-[#2D5570]">
            The information you have provided above is{' '}
            <strong>special-category health data</strong> under UK GDPR. Daisy First Aid will store
            it securely and use it solely to support the safe running of your first aid course.
            It will not be shared with third parties or used for marketing. You may request deletion
            at any time by contacting your instructor.
          </p>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.consentGiven}
              onChange={(e) => set('consentGiven', e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#006FAC]"
            />
            <span className="text-sm font-medium text-[#1A4359]">
              I consent to Daisy First Aid storing this health information for the purpose of
              running my first aid course safely, in accordance with their privacy policy.
            </span>
          </label>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-[#DF542F] bg-red-50 px-4 py-3 text-sm text-[#DF542F]"
          >
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-[#006FAC] px-6 py-4 text-lg font-semibold text-white shadow-[0_6px_20px_rgba(0,60,100,0.10)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          {submitting ? 'Submitting...' : 'Submit declaration'}
        </button>

        {!form.consentGiven && (
          <p className="text-center text-xs text-[#5A7A8F]">
            You must tick the consent box before submitting.
          </p>
        )}
      </form>
    </main>
  );
}
