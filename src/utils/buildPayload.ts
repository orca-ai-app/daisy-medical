import type { DeclarationData } from '../types';

/**
 * Shape the raw form state into the DeclarationData payload that the
 * Edge Function expects. Omits optional string fields when empty.
 */
export function buildDeclarationPayload(form: {
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
}): DeclarationData {
  const data: DeclarationData = {
    has_medical_conditions: form.hasMedicalConditions,
    has_allergies: form.hasAllergies,
    has_mobility_limitations: form.hasMobilityLimitations,
    is_pregnant: form.isPregnant,
  };

  if (form.hasMedicalConditions && form.medicalConditionDetails.trim()) {
    data.medical_condition_details = form.medicalConditionDetails.trim();
  }
  if (form.hasAllergies && form.allergyDetails.trim()) {
    data.allergy_details = form.allergyDetails.trim();
  }
  if (form.hasMobilityLimitations && form.mobilityDetails.trim()) {
    data.mobility_details = form.mobilityDetails.trim();
  }
  if (form.emergencyContactName.trim()) {
    data.emergency_contact_name = form.emergencyContactName.trim();
  }
  if (form.emergencyContactPhone.trim()) {
    data.emergency_contact_phone = form.emergencyContactPhone.trim();
  }
  if (form.additionalInfo.trim()) {
    data.additional_info = form.additionalInfo.trim();
  }

  return data;
}

/**
 * Returns true if the attendee name is non-empty and consent has been given.
 * Used to gate the submit button.
 */
export function canSubmitForm(attendeeName: string, consentGiven: boolean): boolean {
  return attendeeName.trim().length > 0 && consentGiven;
}
