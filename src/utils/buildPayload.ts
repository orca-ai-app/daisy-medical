import type {
  DeclarationData,
  MedicalConditionKey,
  SpecialRequirementsChoice,
  SubmitPayload,
} from '../types';

export interface FormState {
  attendeeName: string;
  attendeeEmail: string;
  bookerReference: string;
  photoConsent: boolean | null;
  conditions: Set<MedicalConditionKey>;
  propertyDisclaimerAcknowledged: boolean;
  specialRequirementsAdvised: SpecialRequirementsChoice | null;
  emailOptIn: boolean;
  age16PlusConfirmed: boolean;
  consentGiven: boolean;
}

/**
 * Build the declaration_data block from form state.
 */
export function buildDeclarationPayload(form: FormState): DeclarationData {
  return {
    conditions: Array.from(form.conditions),
    property_disclaimer_acknowledged: true,
    special_requirements_advised: form.specialRequirementsAdvised as SpecialRequirementsChoice,
    age_16_plus_confirmed: true,
    gdpr_terms_agreed: true,
  };
}

/**
 * Build the full SubmitPayload from form state and context.
 */
export function buildSubmitPayload(
  form: FormState,
  instructorNumber: string,
  territoryPostcode: string,
  courseToken?: string,
  submissionId?: string,
): SubmitPayload {
  const payload: SubmitPayload = {
    instructor_number: instructorNumber,
    territory_postcode: territoryPostcode,
    attendee_name: form.attendeeName.trim(),
    email_opt_in: form.emailOptIn,
    photo_consent: form.photoConsent === true,
    consent_given: true,
    declaration_data: buildDeclarationPayload(form),
  };

  if (courseToken) {
    payload.course_token = courseToken;
  }

  // Client-generated UUID, held constant across retries so the backend can
  // deduplicate a submission whose first attempt actually landed.
  if (submissionId) {
    payload.submission_id = submissionId;
  }

  const booker = form.bookerReference.trim();
  if (booker) {
    payload.booker_reference = booker;
  }

  const email = form.attendeeEmail.trim();
  if (email) {
    payload.attendee_email = email;
  }

  return payload;
}

/**
 * Returns true only when all required fields are valid and the form can be submitted.
 *
 * Rules:
 * - attendee name non-empty
 * - photo_consent selected (not null)
 * - at least one condition checked (the checkbox group counts 'none' as a valid selection)
 * - property disclaimer acknowledged
 * - special requirements choice made
 * - age 16+ confirmed
 * - consent (GDPR) given
 * - if email_opt_in is true, attendee_email must be non-empty
 */
export function canSubmitForm(form: FormState): boolean {
  if (form.attendeeName.trim().length === 0) return false;
  if (form.photoConsent === null) return false;
  if (form.conditions.size === 0) return false;
  if (!form.propertyDisclaimerAcknowledged) return false;
  if (form.specialRequirementsAdvised === null) return false;
  if (!form.age16PlusConfirmed) return false;
  if (!form.consentGiven) return false;
  if (form.emailOptIn && form.attendeeEmail.trim().length === 0) return false;
  return true;
}

/**
 * When 'none' is toggled on, clear all other conditions.
 * When any other condition is toggled on, remove 'none'.
 */
export function toggleCondition(
  current: Set<MedicalConditionKey>,
  key: MedicalConditionKey,
): Set<MedicalConditionKey> {
  const next = new Set(current);
  if (key === 'none') {
    if (next.has('none')) {
      next.delete('none');
    } else {
      next.clear();
      next.add('none');
    }
  } else {
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.delete('none');
      next.add(key);
    }
  }
  return next;
}
