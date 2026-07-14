import type { ContactFormData } from './contactValidation';

export interface EmailEnv {
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
  CONTACT_FROM_EMAIL: string;
}

export async function sendContactEmail(
  data: ContactFormData,
  env: EmailEnv,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [env.CONTACT_TO_EMAIL],
      from: env.CONTACT_FROM_EMAIL,
      reply_to: data.email,
      subject: `Nuevo mensaje de contacto de ${data.name}`,
      text: `Nombre: ${data.name}\nEmail: ${data.email}\nTeléfono: ${data.phone}\n\n${data.message}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API respondió ${res.status}: ${body}`);
  }
}
