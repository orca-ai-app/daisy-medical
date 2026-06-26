export interface DeclarationData {
  has_medical_conditions: boolean;
  medical_condition_details?: string;
  has_allergies: boolean;
  allergy_details?: string;
  has_mobility_limitations: boolean;
  mobility_details?: string;
  is_pregnant: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  additional_info?: string;
}

export interface SubmitPayload {
  instructor_number: string;
  territory_postcode: string;
  attendee_name: string;
  attendee_email?: string;
  declaration_data: DeclarationData;
  consent_given: true;
}

export type AppStep = 'intro' | 'declaration' | 'success';

export interface AppState {
  instructorNumber: string;
  territoryPostcode: string;
  step: AppStep;
  setInstructorNumber: (v: string) => void;
  setTerritoryPostcode: (v: string) => void;
  setStep: (s: AppStep) => void;
}
