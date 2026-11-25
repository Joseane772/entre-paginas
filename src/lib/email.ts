import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends mail through SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465) when it's set.
 * Without it (local / self-hosted), the message is printed to the server log instead, so
 * password-reset links still work during development.
 */
const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transport) {
    console.log(`\n[email não enviado: SMTP_URL vazio]\nPara: ${to}\nAssunto: ${subject}\n\n${text}\n`);
    return;
  }
  await transport.sendMail({ from: process.env.MAIL_FROM ?? "Entre Páginas <no-reply@localhost>", to, subject, text });
}
