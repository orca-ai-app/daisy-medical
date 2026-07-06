import { describe, it, expect } from 'vitest';
import {
  buildDeclarationPayload,
  buildSubmitPayload,
  canSubmitForm,
  toggleCondition,
} from './buildPayload';
import type { FormState } from './buildPayload';

const baseForm: FormState = {
  attendeeName: 'Jane Smith',
  attendeeEmail: '',
  bookerReference: '',
  photoConsent: false,
  conditions: new Set(['none']),
  propertyDisclaimerAcknowledged: true,
  specialRequirementsAdvised: 'not_applicable',
  emailOptIn: false,
  age16PlusConfirmed: true,
  consentGiven: true,
};

// ─── buildDeclarationPayload ────────────────────────────────────────────────

describe('buildDeclarationPayload', () => {
  it('serialises conditions set to an array', () => {
    const result = buildDeclarationPayload({
      ...baseForm,
      conditions: new Set(['back_neck_arm_knee', 'pregnant']),
    });
    expect(result.conditions).toContain('back_neck_arm_knee');
    expect(result.conditions).toContain('pregnant');
    expect(result.conditions).toHaveLength(2);
  });

  it('serialises "none" when that is the only selection', () => {
    const result = buildDeclarationPayload(baseForm);
    expect(result.conditions).toEqual(['none']);
  });

  it('always stamps the literal true acknowledgement flags', () => {
    const result = buildDeclarationPayload(baseForm);
    expect(result.property_disclaimer_acknowledged).toBe(true);
    expect(result.age_16_plus_confirmed).toBe(true);
    expect(result.gdpr_terms_agreed).toBe(true);
  });

  it('passes through special_requirements_advised', () => {
    const r1 = buildDeclarationPayload({ ...baseForm, specialRequirementsAdvised: 'yes' });
    expect(r1.special_requirements_advised).toBe('yes');
    const r2 = buildDeclarationPayload({ ...baseForm, specialRequirementsAdvised: 'not_applicable' });
    expect(r2.special_requirements_advised).toBe('not_applicable');
  });
});

// ─── buildSubmitPayload ─────────────────────────────────────────────────────

describe('buildSubmitPayload', () => {
  it('includes instructor_number and territory_postcode', () => {
    const result = buildSubmitPayload(baseForm, 'JEN1', 'SW1');
    expect(result.instructor_number).toBe('JEN1');
    expect(result.territory_postcode).toBe('SW1');
  });

  it('omits course_token when not provided', () => {
    const result = buildSubmitPayload(baseForm, 'JEN1', 'SW1');
    expect(result.course_token).toBeUndefined();
  });

  it('includes course_token when provided', () => {
    const result = buildSubmitPayload(baseForm, 'JEN1', 'SW1', 'tok_abc123');
    expect(result.course_token).toBe('tok_abc123');
  });

  it('omits booker_reference when blank', () => {
    const result = buildSubmitPayload({ ...baseForm, bookerReference: '  ' }, 'JEN1', 'SW1');
    expect(result.booker_reference).toBeUndefined();
  });

  it('includes booker_reference when provided', () => {
    const result = buildSubmitPayload({ ...baseForm, bookerReference: 'Sarah Jones' }, 'JEN1', 'SW1');
    expect(result.booker_reference).toBe('Sarah Jones');
  });

  it('omits attendee_email when blank', () => {
    const result = buildSubmitPayload({ ...baseForm, attendeeEmail: '' }, 'JEN1', 'SW1');
    expect(result.attendee_email).toBeUndefined();
  });

  it('includes attendee_email when provided', () => {
    const result = buildSubmitPayload(
      { ...baseForm, attendeeEmail: 'jane@example.com', emailOptIn: true },
      'JEN1',
      'SW1',
    );
    expect(result.attendee_email).toBe('jane@example.com');
  });

  it('always stamps consent_given as true', () => {
    const result = buildSubmitPayload(baseForm, 'JEN1', 'SW1');
    expect(result.consent_given).toBe(true);
  });

  it('trims whitespace from attendee_name', () => {
    const result = buildSubmitPayload({ ...baseForm, attendeeName: '  Jane  ' }, 'JEN1', 'SW1');
    expect(result.attendee_name).toBe('Jane');
  });
});

// ─── canSubmitForm ──────────────────────────────────────────────────────────

describe('canSubmitForm', () => {
  it('returns true for a fully valid form', () => {
    expect(canSubmitForm(baseForm)).toBe(true);
  });

  it('returns false when attendee name is empty', () => {
    expect(canSubmitForm({ ...baseForm, attendeeName: '' })).toBe(false);
  });

  it('returns false when attendee name is whitespace only', () => {
    expect(canSubmitForm({ ...baseForm, attendeeName: '   ' })).toBe(false);
  });

  it('returns false when photo_consent is null', () => {
    expect(canSubmitForm({ ...baseForm, photoConsent: null })).toBe(false);
  });

  it('returns true when photo_consent is false (explicit No)', () => {
    expect(canSubmitForm({ ...baseForm, photoConsent: false })).toBe(true);
  });

  it('returns false when no conditions are selected', () => {
    expect(canSubmitForm({ ...baseForm, conditions: new Set() })).toBe(false);
  });

  it('returns true when "none" is the only condition selected', () => {
    expect(canSubmitForm({ ...baseForm, conditions: new Set(['none']) })).toBe(true);
  });

  it('returns false when property disclaimer not acknowledged', () => {
    expect(canSubmitForm({ ...baseForm, propertyDisclaimerAcknowledged: false })).toBe(false);
  });

  it('returns false when special requirements choice not made', () => {
    expect(canSubmitForm({ ...baseForm, specialRequirementsAdvised: null })).toBe(false);
  });

  it('returns false when age 16+ not confirmed', () => {
    expect(canSubmitForm({ ...baseForm, age16PlusConfirmed: false })).toBe(false);
  });

  it('returns false when GDPR consent not given', () => {
    expect(canSubmitForm({ ...baseForm, consentGiven: false })).toBe(false);
  });

  it('returns false when email_opt_in is true but email is empty', () => {
    expect(canSubmitForm({ ...baseForm, emailOptIn: true, attendeeEmail: '' })).toBe(false);
  });

  it('returns true when email_opt_in is true and email is provided', () => {
    expect(
      canSubmitForm({ ...baseForm, emailOptIn: true, attendeeEmail: 'jane@example.com' }),
    ).toBe(true);
  });

  it('returns true when email_opt_in is false and email is empty', () => {
    expect(canSubmitForm({ ...baseForm, emailOptIn: false, attendeeEmail: '' })).toBe(true);
  });
});

// ─── toggleCondition ────────────────────────────────────────────────────────

describe('toggleCondition', () => {
  it('adds a condition when not present', () => {
    const result = toggleCondition(new Set(), 'pregnant');
    expect(result.has('pregnant')).toBe(true);
  });

  it('removes a condition when already present', () => {
    const result = toggleCondition(new Set(['pregnant']), 'pregnant');
    expect(result.has('pregnant')).toBe(false);
  });

  it('selecting "none" clears all other conditions', () => {
    const result = toggleCondition(new Set(['pregnant', 'back_neck_arm_knee']), 'none');
    expect(result.has('none')).toBe(true);
    expect(result.has('pregnant')).toBe(false);
    expect(result.has('back_neck_arm_knee')).toBe(false);
    expect(result.size).toBe(1);
  });

  it('toggling "none" off when it is already selected removes it', () => {
    const result = toggleCondition(new Set(['none']), 'none');
    expect(result.has('none')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('selecting a medical condition removes "none" if present', () => {
    const result = toggleCondition(new Set(['none']), 'back_neck_arm_knee');
    expect(result.has('none')).toBe(false);
    expect(result.has('back_neck_arm_knee')).toBe(true);
  });

  it('does not mutate the original set', () => {
    const original = new Set<'pregnant' | 'none'>(['pregnant']);
    toggleCondition(original, 'none');
    expect(original.has('pregnant')).toBe(true);
  });
});
