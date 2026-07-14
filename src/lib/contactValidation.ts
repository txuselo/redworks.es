export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export type ValidationResult = { valid: true; data: ContactFormData } | { valid: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(formData: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const name = (formData.name || '').trim();
  const email = (formData.email || '').trim();
  const phone = (formData.phone || '').trim();
  const message = (formData.message || '').trim();
  const accepted = formData.accepted === 'on' || formData.accepted === 'true';

  if (!name) errors.push('El nombre es obligatorio.');
  if (!email || !EMAIL_RE.test(email)) errors.push('El email no es válido.');
  if (!phone) errors.push('El teléfono es obligatorio.');
  if (!message) errors.push('El mensaje es obligatorio.');
  if (!accepted) errors.push('Debes aceptar la política de privacidad.');

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data: { name, email, phone, message } };
}
