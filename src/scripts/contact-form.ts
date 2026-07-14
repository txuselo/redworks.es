const form = document.querySelector<HTMLFormElement>('#contact-form');
const status = document.querySelector<HTMLElement>('#contact-form-status');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!status) return;
  status.textContent = 'Enviando...';

  const response = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
  const result = (await response.json()) as { ok: boolean; errors?: string[] };

  if (result.ok) {
    status.textContent = 'Gracias, tu mensaje ha sido enviado. Te responderemos lo antes posible.';
    form.reset();
  } else {
    status.textContent = (result.errors ?? ['Ha ocurrido un error.']).join(' ');
  }
});
