import { describe, it, expect } from 'vitest';
import { buildDeclarationPayload, canSubmitForm } from './buildPayload';

const baseForm = {
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
};

describe('buildDeclarationPayload', () => {
  it('sets all boolean flags from form state', () => {
    const result = buildDeclarationPayload(baseForm);
    expect(result.has_medical_conditions).toBe(false);
    expect(result.has_allergies).toBe(false);
    expect(result.has_mobility_limitations).toBe(false);
    expect(result.is_pregnant).toBe(false);
  });

  it('omits optional string fields when conditions are false', () => {
    const result = buildDeclarationPayload({
      ...baseForm,
      hasMedicalConditions: false,
      medicalConditionDetails: 'should be omitted',
    });
    expect(result.medical_condition_details).toBeUndefined();
  });

  it('includes medical_condition_details when condition is true and details provided', () => {
    const result = buildDeclarationPayload({
      ...baseForm,
      hasMedicalConditions: true,
      medicalConditionDetails: 'Epilepsy',
    });
    expect(result.has_medical_conditions).toBe(true);
    expect(result.medical_condition_details).toBe('Epilepsy');
  });

  it('omits medical_condition_details when condition is true but details are blank', () => {
    const result = buildDeclarationPayload({
      ...baseForm,
      hasMedicalConditions: true,
      medicalConditionDetails: '   ',
    });
    expect(result.medical_condition_details).toBeUndefined();
  });

  it('includes allergy_details when has_allergies is true', () => {
    const result = buildDeclarationPayload({
      ...baseForm,
      hasAllergies: true,
      allergyDetails: 'Latex, nuts',
    });
    expect(result.allergy_details).toBe('Latex, nuts');
  });

  it('includes emergency contact fields when provided', () => {
    const result = buildDeclarationPayload({
      ...baseForm,
      emergencyContactName: 'Jane Smith',
      emergencyContactPhone: '07700 900000',
    });
    expect(result.emergency_contact_name).toBe('Jane Smith');
    expect(result.emergency_contact_phone).toBe('07700 900000');
  });

  it('omits emergency contact fields when blank', () => {
    const result = buildDeclarationPayload(baseForm);
    expect(result.emergency_contact_name).toBeUndefined();
    expect(result.emergency_contact_phone).toBeUndefined();
  });

  it('trims whitespace from string fields', () => {
    const result = buildDeclarationPayload({
      ...baseForm,
      hasMedicalConditions: true,
      medicalConditionDetails: '  Asthma  ',
    });
    expect(result.medical_condition_details).toBe('Asthma');
  });

  it('sets is_pregnant correctly', () => {
    const result = buildDeclarationPayload({ ...baseForm, isPregnant: true });
    expect(result.is_pregnant).toBe(true);
  });
});

describe('canSubmitForm', () => {
  it('returns false when name is empty', () => {
    expect(canSubmitForm('', true)).toBe(false);
  });

  it('returns false when name is whitespace only', () => {
    expect(canSubmitForm('   ', true)).toBe(false);
  });

  it('returns false when consent is not given', () => {
    expect(canSubmitForm('Jane Smith', false)).toBe(false);
  });

  it('returns true when name is provided and consent is given', () => {
    expect(canSubmitForm('Jane Smith', true)).toBe(true);
  });

  it('returns false when both name is empty and consent is false', () => {
    expect(canSubmitForm('', false)).toBe(false);
  });
});
