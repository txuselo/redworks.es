import { describe, expect, it, vi } from 'vitest';
import { sendContactEmail } from './email';

const ENV = {
  RESEND_API_KEY: 're_test_key',
  CONTACT_TO_EMAIL: 'info@redworks.es',
  CONTACT_FROM_EMAIL: 'web@redworks.es',
};

const DATA = { name: 'Ana García', email: 'ana@example.com', phone: '600123456', message: 'Quiero un presupuesto.' };

describe('sendContactEmail', () => {
  it('POSTs to the Resend API with the right auth header and payload', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'abc' }), { status: 200 }));

    await sendContactEmail(DATA, ENV, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(['info@redworks.es']);
    expect(body.from).toBe('web@redworks.es');
    expect(body.reply_to).toBe('ana@example.com');
    expect(body.subject).toContain('Ana García');
    expect(body.text).toContain('Quiero un presupuesto.');
  });

  it('throws when Resend responds with a non-2xx status', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 422 }));
    await expect(sendContactEmail(DATA, ENV, fetchMock as unknown as typeof fetch)).rejects.toThrow(/422/);
  });
});
