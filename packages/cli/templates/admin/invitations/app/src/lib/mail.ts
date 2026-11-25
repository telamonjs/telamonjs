/**
 * The app's mail port: every email goes through `sendMail()`. Server-only.
 *
 * REPLACE THE BODY WITH YOUR PROVIDER (SMTP via nodemailer, Resend, SES...).
 * The default only logs the message to the server console, so invitations
 * work in development without an account anywhere: the accept link shows up
 * in the `pnpm dev` output.
 */
export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendMail(message: MailMessage): Promise<void> {
  console.info(
    `[mail] (console sender: replace src/lib/mail.ts with your provider)\n` +
      `  to: ${message.to}\n  subject: ${message.subject}\n\n${message.text}\n`
  )
}
