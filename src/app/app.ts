import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('angular-portafolio');

  protected async sendEmail(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const name = (data.get('name') as string)?.trim() ?? '';
    const email = (data.get('email') as string)?.trim() ?? '';
    const message = (data.get('message') as string)?.trim() ?? '';

    if (!name || !email || !message) {
      alert('Por favor completa todos los campos.');
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || 'Error desconocido');
      }

      const previewMsg = json?.previewUrl
        ? `\n\n(Email preview: ${json.previewUrl})`
        : '';

      alert(`Mensaje enviado correctamente!${previewMsg}`);
      form.reset();
    } catch (error) {
      console.error('Error al enviar el mensaje', error);
      alert('No se pudo enviar el mensaje. Por favor inténtalo de nuevo más tarde.');
    }
  }
}
