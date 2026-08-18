import { useState } from 'react';
import type React from 'react';
import type { CourseCard, MedicalConditionKey, SpecialRequirementsChoice } from '../types';
import { submitDeclaration } from '../api';
import { buildSubmitPayload, canSubmitForm, isValidEmail, toggleCondition } from '../utils/buildPayload';
import type { FormState } from '../utils/buildPayload';

interface Props {
  instructorNumber: string;
  territoryPostcode: string;
  courseToken?: string;
  lockedCourse?: CourseCard;
  onSuccess: (reference?: string) => void;
  onBack: () => void;
}

const INITIAL_FORM: FormState = {
  attendeeName: '',
  attendeeEmail: '',
  bookerReference: '',
  photoConsent: null,
  conditions: new Set(),
  propertyDisclaimerAcknowledged: false,
  specialRequirementsAdvised: null,
  specialRequirementsDetail: '',
  emailOptIn: false,
  age16PlusConfirmed: false,
  consentGiven: false,
};

const CONDITION_OPTIONS: { key: MedicalConditionKey; label: string }[] = [
  { key: 'back_neck_arm_knee', label: 'Back/Neck/Arm/Knee problems' },
  { key: 'rupture_hernia', label: 'Rupture or Hernia' },
  {
    key: 'heart_bp_chest',
    label: 'Heart Disease/High Blood Pressure/Bronchitis/Asthma/chest problems',
  },
  { key: 'blackouts_seizures_epilepsy', label: 'Blackouts/Seizures/Epilepsy' },
  { key: 'pregnant', label: 'Currently or recently pregnant' },
  { key: 'none', label: 'Not applicable' },
];

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_2px_8px_rgba(0,60,100,0.06)]">
      {children}
    </div>
  );
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#1A4359]">
      {children}
      {required && <span className="ml-1 text-[#DF542F]">*</span>}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-lg border border-[#D4E1E9] bg-white px-4 py-3 text-[#1A4359] placeholder-[#5A7A8F] focus:border-[#006FAC] focus:outline-none focus:ring-2 focus:ring-[#D4E8F5]"
    />
  );
}

function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-3" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
            value === opt.value
              ? 'border-[#006FAC] bg-[#006FAC] text-white'
              : 'border-[#D4E1E9] bg-white text-[#5A7A8F] hover:border-[#006FAC]'
          }`}
        >
          {opt.label}
        </button>
      ))}
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  );
}

function CheckboxRow({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#006FAC]"
      />
      <span className="text-sm text-[#1A4359]">{children}</span>
    </label>
  );
}

function formatEventDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DeclarationPage({
  instructorNumber,
  territoryPostcode,
  courseToken,
  lockedCourse,
  onSuccess,
  onBack,
}: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // One id per form session, reused on every retry so the backend can dedupe
  // if an earlier attempt actually landed.
  const [submissionId] = useState<string>(() => crypto.randomUUID());

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleConditionToggle(key: MedicalConditionKey) {
    setForm((prev) => ({ ...prev, conditions: toggleCondition(prev.conditions, key) }));
  }

  const canSubmit = canSubmitForm(form) && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMessage(null);
    setSubmitting(true);

    const payload = buildSubmitPayload(
      form,
      instructorNumber,
      territoryPostcode,
      courseToken,
      submissionId,
    );
    const result = await submitDeclaration(payload);

    setSubmitting(false);

    if (result.ok) {
      onSuccess(result.reference);
    } else {
      // Form state is left untouched — everything entered survives a retry.
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
      </header>

      {/* Course confirmation line */}
      {lockedCourse && (
        <div className="mb-5 rounded-lg border border-[#D4E8F5] bg-[#EDF5FA] px-4 py-3">
          <p className="text-sm font-medium text-[#1A4359]">
            You&apos;re at:{' '}
            <span className="font-semibold">{lockedCourse.template_name}</span>
            {' — '}
            {formatEventDate(lockedCourse.event_date)}
            {(lockedCourse.venue_name || lockedCourse.venue_postcode)
              ? `, ${lockedCourse.venue_name || lockedCourse.venue_postcode}`
              : ''}
          </p>
        </div>
      )}

      {/* Intro copy */}
      <div className="mb-6 rounded-lg bg-white p-5 shadow-[0_2px_8px_rgba(0,60,100,0.06)]">
        <p className="text-sm text-[#2D5570]">
          Welcome to your Daisy First Aid Class. Please complete this form before the class starts.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* 1. Attendee details */}
        <SectionCard>
          <h2 className="mb-4 font-display text-lg font-bold text-[#1A4359]">Your details</h2>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="attendee-name" required>
                Full name
              </FieldLabel>
              <TextInput
                id="attendee-name"
                value={form.attendeeName}
                onChange={(v) => set('attendeeName', v)}
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <FieldLabel
                htmlFor="attendee-email"
                required={form.emailOptIn}
              >
                Email
                {!form.emailOptIn && (
                  <span className="ml-1 font-normal text-[#5A7A8F]">(optional)</span>
                )}
              </FieldLabel>
              <TextInput
                id="attendee-email"
                type="email"
                value={form.attendeeEmail}
                onChange={(v) => set('attendeeEmail', v)}
                placeholder="your@email.com"
                required={form.emailOptIn}
              />
              {form.attendeeEmail.trim().length > 0 && !isValidEmail(form.attendeeEmail) && (
                <p role="alert" className="mt-1.5 text-sm text-[#DF542F]">
                  Please enter a valid email address, e.g. your@email.com
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* 2. Booker reference */}
        <SectionCard>
          <FieldLabel htmlFor="booker-reference">
            Who made the booking?
          </FieldLabel>
          <TextInput
            id="booker-reference"
            value={form.bookerReference}
            onChange={(v) => set('bookerReference', v)}
            placeholder="e.g. Sarah Jones"
          />
          <p className="mt-1.5 text-xs text-[#5A7A8F]">
            e.g. the person who paid — this links your form to the right booking. If you booked
            yourself, put your own name.
          </p>
        </SectionCard>

        {/* 3. Photo consent */}
        <SectionCard>
          <p className="mb-3 text-sm font-medium text-[#1A4359]">
            Can we use any photos taken of you or your minors today for Daisy First Aid
            promotion?
            <span className="ml-1 text-[#DF542F]">*</span>
          </p>
          <RadioGroup<'yes' | 'no'>
            name="photo-consent"
            value={form.photoConsent === null ? null : form.photoConsent ? 'yes' : 'no'}
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
            onChange={(v) => set('photoConsent', v === 'yes')}
          />
        </SectionCard>

        {/* 4. Medical conditions */}
        <SectionCard>
          <p className="mb-3 text-sm font-medium text-[#1A4359]">
            Please inform your trainer if you are currently suffering or have ever suffered from
            the following medical problems or conditions&hellip;
            <span className="ml-1 text-[#DF542F]">*</span>
          </p>
          <div className="space-y-2.5">
            {CONDITION_OPTIONS.map(({ key, label }) => (
              <CheckboxRow
                key={key}
                id={`condition-${key}`}
                checked={form.conditions.has(key)}
                onChange={() => handleConditionToggle(key)}
              >
                {label}
              </CheckboxRow>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#5A7A8F]">
            Please note that we reserve the right to prevent you from completing this course if
            you attend with any of the above medical conditions or if you are pregnant and we feel
            you will put yourself or others at risk.
          </p>
        </SectionCard>

        {/* 5. Property disclaimer */}
        <SectionCard>
          <CheckboxRow
            id="property-disclaimer"
            checked={form.propertyDisclaimerAcknowledged}
            onChange={(v) => set('propertyDisclaimerAcknowledged', v)}
          >
            <span>
              I acknowledge that Daisy First Aid cannot be held responsible for loss or damage to
              personal property while attending the course.
              <span className="ml-1 text-[#DF542F]">*</span>
            </span>
          </CheckboxRow>
        </SectionCard>

        {/* 6. Special requirements */}
        <SectionCard>
          <p className="mb-3 text-sm font-medium text-[#1A4359]">
            I have advised my trainer of any special requirements I may have.
            <span className="ml-1 text-[#DF542F]">*</span>
          </p>
          <RadioGroup<SpecialRequirementsChoice>
            name="special-requirements"
            value={form.specialRequirementsAdvised}
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'not_applicable', label: 'Not applicable' },
            ]}
            onChange={(v) => set('specialRequirementsAdvised', v)}
          />
          {form.specialRequirementsAdvised === 'yes' && (
            <div className="mt-3">
              <label
                htmlFor="special-requirements-detail"
                className="mb-1 block text-sm font-medium text-[#1A4359]"
              >
                Please tell us about your requirements
              </label>
              <textarea
                id="special-requirements-detail"
                rows={3}
                maxLength={500}
                value={form.specialRequirementsDetail}
                onChange={(e) => set('specialRequirementsDetail', e.target.value)}
                className="w-full rounded-xl border border-[#D4E8F5] px-4 py-3 text-[16px] text-[#1A4359] focus:ring-2 focus:ring-[#D4E8F5] focus:outline-none"
              />
            </div>
          )}
        </SectionCard>

        {/* 7. Email opt-in */}
        <SectionCard>
          <CheckboxRow
            id="email-opt-in"
            checked={form.emailOptIn}
            onChange={(v) => set('emailOptIn', v)}
          >
            I&apos;d like to receive emails with useful content to help and remind me.
          </CheckboxRow>
        </SectionCard>

        {/* 8. Age confirmation */}
        <SectionCard>
          <CheckboxRow
            id="age-16-plus"
            checked={form.age16PlusConfirmed}
            onChange={(v) => set('age16PlusConfirmed', v)}
          >
            <span>
              I confirm that I am at least 16 years of age or older.
              <span className="ml-1 text-[#DF542F]">*</span>
            </span>
          </CheckboxRow>
        </SectionCard>

        {/* 9. GDPR / storage consent */}
        <div className="rounded-lg border-2 border-[#006FAC] bg-[#EDF5FA] p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-[#1A4359]">
            Consent to store health information
          </h2>
          <p className="mb-4 text-sm text-[#2D5570]">
            The information you have provided above is{' '}
            <strong>special-category health data</strong> under UK GDPR. Daisy First Aid will
            store it securely and use it solely to support the safe running of your first aid
            course. It will not be shared with third parties or used for marketing. You may
            request deletion at any time by contacting your instructor.
          </p>
          <CheckboxRow
            id="consent-given"
            checked={form.consentGiven}
            onChange={(v) => set('consentGiven', v)}
          >
            <span>
              I consent to Daisy First Aid storing this health information for the purpose of
              running my first aid course safely, in accordance with their privacy policy and GDPR
              terms. I understand I have the right to access or request deletion of my data.
              <span className="ml-1 text-[#DF542F]">*</span>
            </span>
          </CheckboxRow>
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
          {submitting ? (
            <span className="inline-flex items-center justify-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Submitting&hellip;
            </span>
          ) : (
            'Submit declaration'
          )}
        </button>

        {!form.consentGiven && (
          <p className="text-center text-xs text-[#5A7A8F]">
            Please complete all required fields before submitting.
          </p>
        )}
      </form>
    </main>
  );
}
