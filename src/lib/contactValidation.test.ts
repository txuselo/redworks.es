import { describe, expect, it } from 'vitest';
import { validateContactForm } from './contactValidation';

describe('validateContactForm', () => {
  it('accepts a fully filled valid form', () => {
    const result = validateContactForm({
      name: 'Ana García',
      email: 'ana@example.com',
      phone: '600123456',
      message: 'Quiero un presupuesto para redes wifi.',
      accepted: 'on',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual({
        name: 'Ana García',
        email: 'ana@example.com',
        phone: '600123456',
        message: 'Quiero un presupuesto para redes wifi.',
      });
    }
  });

  it('rejects a missing name', () => {
    const result = validateContactForm({
      name: '',
      email: 'a@b.com',
      phone: '600123456',
      message: 'hola',
      accepted: 'on',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('El nombre es obligatorio.');
  });

  it('rejects an invalid email', () => {
    const result = validateContactForm({
      name: 'Ana',
      email: 'not-an-email',
      phone: '600123456',
      message: 'hola',
      accepted: 'on',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('El email no es válido.');
  });

  it('rejects when the privacy checkbox is not accepted', () => {
    const result = validateContactForm({
      name: 'Ana',
      email: 'a@b.com',
      phone: '600123456',
      message: 'hola',
      accepted: '',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('Debes aceptar la política de privacidad.');
  });
});
