import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import nodemailer from 'nodemailer';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Enable JSON body parsing for API endpoints
app.use(express.json());

/**
 * Sends an email using environment-configured SMTP settings.
 * When no SMTP config is provided, a Nodemailer test account is used.
 */
async function createTransporter() {
  const host = process.env['SMTP_HOST'];
  const port = process.env['SMTP_PORT'] ? Number(process.env['SMTP_PORT']) : undefined;
  const secure = process.env['SMTP_SECURE'] === 'true';
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Fallback to Nodemailer test account (ethereal.email) for local development.
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function sendContactEmail({ name, email, message }: { name: string; email: string; message: string; }) {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env['SMTP_FROM'] ?? `"Portfolio Contact" <${email}>`,
    to: process.env['SMTP_TO'] ?? 'josemoralescampo70@gmail.com',
    subject: process.env['SMTP_SUBJECT'] ?? 'Nuevo mensaje desde el formulario de contacto',
    text: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * API: Contact form
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body as {
      name: string;
      email: string;
      message: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const info = await sendContactEmail({ name, email, message });

    // When using the test account, nodemailer provides a preview URL.
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('Contact email sent', {
      to: process.env['SMTP_TO'] ?? 'josemoralescampo70@gmail.com',
      previewUrl,
    });

    return res.json({ ok: true, previewUrl });
  } catch (err) {
    console.error('Error sending contact email', err);
    return res.status(500).json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo más tarde.' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
