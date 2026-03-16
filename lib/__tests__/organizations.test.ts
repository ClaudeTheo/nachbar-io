// lib/__tests__/organizations.test.ts
// Unit-Tests fuer Organisations-Validierung (Pro Community)

import { describe, it, expect } from 'vitest';
import {
  validateOrgCreate,
  validateOrgMemberAdd,
  ORG_TYPES,
  ORG_MEMBER_ROLES,
} from '../organizations';

describe('validateOrgCreate', () => {
  const validInput = {
    name: 'Stadtverwaltung Bad Säckingen',
    type: 'municipality',
    hr_vr_number: 'HRB 12345',
    contact_email: 'kontakt@bad-saeckingen.de',
  };

  it('akzeptiert gueltige Eingabe', () => {
    const result = validateOrgCreate(validInput);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('akzeptiert alle gueltigen Organisationstypen', () => {
    for (const type of ORG_TYPES) {
      const result = validateOrgCreate({ ...validInput, type });
      expect(result.valid).toBe(true);
    }
  });

  it('erfordert einen Namen', () => {
    const result = validateOrgCreate({ ...validInput, name: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Name');
  });

  it('lehnt zu kurzen Namen ab (< 2 Zeichen)', () => {
    const result = validateOrgCreate({ ...validInput, name: 'X' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('mindestens 2 Zeichen');
  });

  it('lehnt zu langen Namen ab (> 200 Zeichen)', () => {
    const result = validateOrgCreate({ ...validInput, name: 'A'.repeat(201) });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('maximal 200 Zeichen');
  });

  it('erfordert einen gueltigen Organisationstyp', () => {
    const result = validateOrgCreate({ ...validInput, type: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Organisationstyp');
  });

  it('lehnt ungueltigen Organisationstyp ab', () => {
    const result = validateOrgCreate({ ...validInput, type: 'hospital' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ungueltiger Organisationstyp');
    expect(result.error).toContain('municipality');
  });

  it('erfordert eine HR/VR-Nummer', () => {
    const result = validateOrgCreate({ ...validInput, hr_vr_number: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Vereinsregisternummer');
  });

  it('lehnt zu kurze HR/VR-Nummer ab (< 3 Zeichen)', () => {
    const result = validateOrgCreate({ ...validInput, hr_vr_number: 'AB' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('min. 3 Zeichen');
  });

  it('erfordert eine Kontakt-E-Mail', () => {
    const result = validateOrgCreate({ ...validInput, contact_email: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('E-Mail');
  });

  it('lehnt ungueltige E-Mail-Adresse ab', () => {
    const result = validateOrgCreate({ ...validInput, contact_email: 'keine-email' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ungueltige E-Mail');
  });

  it('lehnt null/undefined Body ab', () => {
    expect(validateOrgCreate(null).valid).toBe(false);
    expect(validateOrgCreate(undefined).valid).toBe(false);
  });

  it('lehnt nicht-Objekt Body ab', () => {
    expect(validateOrgCreate('string').valid).toBe(false);
    expect(validateOrgCreate(42).valid).toBe(false);
  });
});

describe('validateOrgMemberAdd', () => {
  const validInput = {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'admin',
  };

  it('akzeptiert gueltige Eingabe', () => {
    const result = validateOrgMemberAdd(validInput);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('akzeptiert alle gueltigen Rollen', () => {
    for (const role of ORG_MEMBER_ROLES) {
      const result = validateOrgMemberAdd({ ...validInput, role });
      expect(result.valid).toBe(true);
    }
  });

  it('erfordert eine user_id', () => {
    const result = validateOrgMemberAdd({ ...validInput, user_id: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Benutzer-ID');
  });

  it('lehnt ungueltige UUID ab', () => {
    const result = validateOrgMemberAdd({ ...validInput, user_id: 'nicht-uuid' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('UUID');
  });

  it('erfordert eine Rolle', () => {
    const result = validateOrgMemberAdd({ ...validInput, role: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Rolle');
  });

  it('lehnt ungueltige Rolle ab', () => {
    const result = validateOrgMemberAdd({ ...validInput, role: 'superadmin' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ungueltige Rolle');
    expect(result.error).toContain('admin');
  });

  it('lehnt null/undefined Body ab', () => {
    expect(validateOrgMemberAdd(null).valid).toBe(false);
    expect(validateOrgMemberAdd(undefined).valid).toBe(false);
  });
});
