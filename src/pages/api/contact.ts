import type { APIRoute } from 'astro';
import { validateContactForm } from '../../lib/contactValidation';
import { sendContactEmail } from '../../lib/email';

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    values[key] = String(value);
  }

  const result = validateContactForm(values);
  if (!result.valid) {
    return new Response(JSON.stringify({ ok: false, errors: result.errors }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env =
    (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ??
    (process.env as Record<string, string>);

  try {
    await sendContactEmail(result.data, {
      RESEND_API_KEY: env.RESEND_API_KEY,
      CONTACT_TO_EMAIL: env.CONTACT_TO_EMAIL,
      CONTACT_FROM_EMAIL: env.CONTACT_FROM_EMAIL,
    });
  } catch {
    return new Response(
      JSON.stringify({ ok: false, errors: ['No se ha podido enviar el mensaje. Inténtalo de nuevo o llámanos.'] }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
