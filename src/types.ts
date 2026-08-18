export interface CourseCard {
  id: string;
  booking_token: string;
  template_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  /** Null for private classes without a fixed venue (platform migration 040). */
  venue_postcode: string | null;
  franchisee_name: string | null;
}

export type MedicalConditionKey =
  | 'back_neck_arm_knee'
  | 'rupture_hernia'
  | 'heart_bp_chest'
  | 'blackouts_seizures_epilepsy'
  | 'pregnant'
  | 'none';

export type SpecialRequirementsChoice = 'yes' | 'not_applicable';

export interface DeclarationData {
  conditions: MedicalConditionKey[];
  property_disclaimer_acknowledged: true;
  special_requirements_advised: SpecialRequirementsChoice;
  /** Free text shown when the attendee answers 'yes' (M3 feedback §6). */
  special_requirements_detail?: string;
  age_16_plus_confirmed: true;
  gdpr_terms_agreed: true;
}

export interface SubmitPayload {
  /** Omitted on the token-only path — the server derives the franchisee from the course row. */
  instructor_number?: string;
  territory_postcode: string;
  course_token?: string;
  /** Client-generated UUID, reused across retries so the backend can dedupe. */
  submission_id?: string;
  booker_reference?: string;
  attendee_name: string;
  attendee_email?: string;
  email_opt_in: boolean;
  photo_consent: boolean;
  consent_given: true;
  declaration_data: DeclarationData;
}

export type AppStep = 'intro' | 'declaration' | 'success';

/** How a lookup/submit call failed: fetch threw (network) vs the server said no. */
export type FailureKind = 'network' | 'server';

export type CourseResolutionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'locked'; course: CourseCard }
  | { status: 'pick'; courses: CourseCard[] }
  | { status: 'none' }
  | { status: 'error'; kind: FailureKind; message: string };
