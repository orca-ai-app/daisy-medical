import { describe, it, expect } from 'vitest';
import {
  buildDeclarationPayload,
  buildSubmitPayload,
  canSubmitForm,
  isValidEmail,
  toggleCondition,
} from './buildPayload';
import type { FormState } from './buildPayload';
import type { CourseCard } from '../types';

const baseForm: FormState = {
  attendeeName: 'Jane Smith',
  attendeeEmail: '',
  bookerReference: '',
  photoConsent: false,
  conditions: new Set(['none']),
  propertyDisclaimerAcknowledged: true,
  specialRequirementsAdvised: 'not_applicable',
  specialRequirementsDetail: '',
  emailOptIn: false,
  age16PlusConfirmed: true,
  consentGiven: true,
};

describe('special_requirements_detail', () => {
  it('includes trimmed detail when advised is yes and text present', () => {
    const data = buildDeclarationPayload({
      ...baseForm,
      specialRequirementsAdvised: 'yes',
      specialRequirementsDetail: '  Wheelchair access needed  ',
    });
    expect(data.special_requirements_detail).toBe('Wheelchair access needed');
  });

  it('omits detail when not applicable or empty', () => {
    expect(buildDeclarationPayload(baseForm).special_requirements_detail).toBeUndefined();
    expect(
      buildDeclarationPayload({
        ...baseForm,
        specialRequirementsAdvised: 'yes',
        specialRequirementsDetail: '   ',
      }).special_requirements_detail,
    ).toBeUndefined();
  });
});

/** A minimal CourseCard with franchisee_name for testing. */
const makeCourseCard = (overrides: Partial<CourseCard> = {}): CourseCard => ({
  id: 'c1',
  booking_token: 'tok_abc',
  template_name: 'Baby & Child First Aid',
  event_date: '2026-07-06',
  start_time: '10:00:00',
  end_time: '12:00:00',
  venue_name: 'Town Hall',
  venue_postcode: 'SW1A 1AA',
  franchisee_name: 'Jenni Dunman',
  ...overrides,
});

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

  it('omits submission_id when not provided', () => {
    const result = buildSubmitPayload(baseForm, 'JEN1', 'SW1');
    expect(result.submission_id).toBeUndefined();
  });

  it('includes submission_id when provided (idempotent retries)', () => {
    const result = buildSubmitPayload(
      baseForm,
      'JEN1',
      'SW1',
      undefined,
      '4f7c9a2e-1b3d-4c5e-8f6a-0d1e2f3a4b5c',
    );
    expect(result.submission_id).toBe('4f7c9a2e-1b3d-4c5e-8f6a-0d1e2f3a4b5c');
  });

  it('includes both course_token and submission_id when both provided', () => {
    const result = buildSubmitPayload(baseForm, 'JEN1', 'SW1', 'tok_abc', 'uuid-1');
    expect(result.course_token).toBe('tok_abc');
    expect(result.submission_id).toBe('uuid-1');
  });

  it('trims whitespace from attendee_name', () => {
    const result = buildSubmitPayload({ ...baseForm, attendeeName: '  Jane  ' }, 'JEN1', 'SW1');
    expect(result.attendee_name).toBe('Jane');
  });

  it('omits instructor_number when blank (token-only path — server derives the franchisee)', () => {
    const result = buildSubmitPayload(baseForm, '', 'SW1', 'tok_abc');
    expect(result.instructor_number).toBeUndefined();
    expect(result.course_token).toBe('tok_abc');
  });

  it('omits instructor_number when whitespace only', () => {
    const result = buildSubmitPayload(baseForm, '   ', 'SW1', 'tok_abc');
    expect(result.instructor_number).toBeUndefined();
  });

  it('trims whitespace from instructor_number', () => {
    const result = buildSubmitPayload(baseForm, '  JEN1  ', 'SW1');
    expect(result.instructor_number).toBe('JEN1');
  });

  // ── Instructor-number → resolved course → venue-derived postcode ──────────

  it('accepts venue_postcode derived from a resolved course as territory_postcode', () => {
    // App derives territoryPostcode = lockedCourse.venue_postcode when a course is resolved.
    // This test verifies buildSubmitPayload forwards that derived value correctly.
    const course = makeCourseCard({ venue_postcode: 'SW1A 1AA' });
    const result = buildSubmitPayload(baseForm, 'JEN1', course.venue_postcode, course.booking_token);
    expect(result.territory_postcode).toBe('SW1A 1AA');
    expect(result.course_token).toBe('tok_abc');
  });

  it('uses the legacy postcode param value when no course resolves (fallback path)', () => {
    // When courseState is 'none', App uses manualPostcode (pre-filled from ?postcode= URL param).
    const legacyPostcode = 'BS1';
    const result = buildSubmitPayload(baseForm, 'UNKNOWN99', legacyPostcode);
    expect(result.territory_postcode).toBe('BS1');
    expect(result.course_token).toBeUndefined();
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

  it('returns false when a non-empty email is malformed (no opt-in)', () => {
    expect(canSubmitForm({ ...baseForm, attendeeEmail: 'sarah.gmail.com' })).toBe(false);
  });

  it('returns false when email_opt_in is true and email is malformed', () => {
    expect(
      canSubmitForm({ ...baseForm, emailOptIn: true, attendeeEmail: 'sarah.gmail.com' }),
    ).toBe(false);
  });

  it('returns true when a non-empty email is well formed (no opt-in)', () => {
    expect(canSubmitForm({ ...baseForm, attendeeEmail: 'sarah@gmail.com' })).toBe(true);
  });
});

// ─── isValidEmail ───────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('accepts a plain something@something.something address', () => {
    expect(isValidEmail('jane@example.com')).toBe(true);
    expect(isValidEmail('jane.smith+daisy@sub.example.co.uk')).toBe(true);
  });

  it('accepts an address padded with whitespace (form trims before submit)', () => {
    expect(isValidEmail('  jane@example.com  ')).toBe(true);
  });

  it('rejects addresses missing an @ or a dot in the domain', () => {
    expect(isValidEmail('sarah.gmail.com')).toBe(false);
    expect(isValidEmail('sarah@gmailcom')).toBe(false);
    expect(isValidEmail('sarah@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects addresses containing internal whitespace', () => {
    expect(isValidEmail('sarah smith@example.com')).toBe(false);
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

// ─── CourseCard.franchisee_name ─────────────────────────────────────────────

describe('CourseCard franchisee_name field', () => {
  it('accepts a string franchisee_name', () => {
    const card = makeCourseCard({ franchisee_name: 'Jenni Dunman (double test)' });
    expect(card.franchisee_name).toBe('Jenni Dunman (double test)');
  });

  it('accepts null franchisee_name for courses without a named franchisee', () => {
    const card = makeCourseCard({ franchisee_name: null });
    expect(card.franchisee_name).toBeNull();
  });

  it('payload built from a resolved course contains the venue-derived territory_postcode', () => {
    const card = makeCourseCard({ venue_postcode: 'EX1 1AA', franchisee_name: 'Jenni Dunman' });
    // Simulate App: territoryPostcode = lockedCourse.venue_postcode
    const derived = card.venue_postcode;
    const result = buildSubmitPayload(baseForm, 'JEN1', derived, card.booking_token);
    expect(result.territory_postcode).toBe('EX1 1AA');
  });

  it('banner fallback uses "your instructor" when franchisee_name is null', () => {
    // This is the display logic; verify the type permits null and the fallback label is defined.
    const card = makeCourseCard({ franchisee_name: null });
    const trainerLabel = card.franchisee_name ?? 'your instructor';
    expect(trainerLabel).toBe('your instructor');
  });

  it('banner uses franchisee_name when present', () => {
    const card = makeCourseCard({ franchisee_name: 'Jenni Dunman' });
    const trainerLabel = card.franchisee_name ?? 'your instructor';
    expect(trainerLabel).toBe('Jenni Dunman');
  });
});

// ─── Instructor-number resolution scenarios ──────────────────────────────────

describe('instructor-number resolution state → postcode handling', () => {
  it('when several courses are found, picking one locks and uses its venue_postcode', () => {
    // Simulate the user picking from a list.
    const picked = makeCourseCard({ venue_postcode: 'OX1 3BQ', template_name: 'Paediatric' });
    // App state after pick: lockedCourse = picked, territoryPostcode = picked.venue_postcode
    const territoryPostcode = picked.venue_postcode;
    const result = buildSubmitPayload(baseForm, 'JEN1', territoryPostcode, picked.booking_token);
    expect(result.territory_postcode).toBe('OX1 3BQ');
    expect(result.course_token).toBe('tok_abc');
  });

  it('when no course resolves and user typed a postcode, that postcode is used', () => {
    // courseState = 'none'; user typed 'BS1' into the postcode field.
    const manualPostcode = 'BS1';
    // App: territoryPostcode = manualPostcode (no lockedCourse)
    const result = buildSubmitPayload(baseForm, 'NOPE', manualPostcode);
    expect(result.territory_postcode).toBe('BS1');
    expect(result.course_token).toBeUndefined();
  });

  it('falls back to the manual postcode when the locked course has no venue_postcode', () => {
    // Private classes (migration 040) can have venue_postcode null; App derives
    // territoryPostcode = lockedCourse?.venue_postcode ?? manualPostcode.
    const course = makeCourseCard({ venue_postcode: null });
    const manualPostcode = 'SW1';
    const territoryPostcode = course.venue_postcode ?? manualPostcode;
    const result = buildSubmitPayload(baseForm, 'JEN1', territoryPostcode, course.booking_token);
    expect(result.territory_postcode).toBe('SW1');
    expect(result.course_token).toBe('tok_abc');
  });

  it('legacy ?postcode= param pre-fills the postcode field when no course resolves', () => {
    // Simulates App initialising manualPostcode from readQueryParam('postcode').
    // The typed value ends up in territory_postcode when no course is locked.
    const legacyParam = 'SW1';
    const result = buildSubmitPayload(baseForm, 'JEN1', legacyParam);
    expect(result.territory_postcode).toBe('SW1');
  });
});
