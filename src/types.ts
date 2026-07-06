export interface CourseCard {
  id: string;
  booking_token: string;
  template_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_postcode: string;
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
  age_16_plus_confirmed: true;
  gdpr_terms_agreed: true;
}

export interface SubmitPayload {
  instructor_number: string;
  territory_postcode: string;
  course_token?: string;
  booker_reference?: string;
  attendee_name: string;
  attendee_email?: string;
  email_opt_in: boolean;
  photo_consent: boolean;
  consent_given: true;
  declaration_data: DeclarationData;
}

export type AppStep = 'intro' | 'declaration' | 'success';

export type CourseResolutionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'locked'; course: CourseCard }
  | { status: 'pick'; courses: CourseCard[] }
  | { status: 'none' };
