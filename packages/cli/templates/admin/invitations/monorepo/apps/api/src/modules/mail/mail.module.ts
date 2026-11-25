import { Injectable, Logger, Module } from '@nestjs/common'

/**
 * The API's mail port. Services inject it with
 * `@Inject(MAIL_SENDER) private readonly mail: MailSender`.
 *
 * REPLACE ConsoleMailSender WITH YOUR PROVIDER (SMTP via nodemailer, Resend,
 * SES...): write a class with the same `send()` and point `useClass` at it.
 * The default only logs the message, so invitations work in development
 * without an account anywhere: the accept link shows up in the API's output.
 */
export const MAIL_SENDER = Symbol('MAIL_SENDER')

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface MailSender {
  send(message: MailMessage): Promise<void>
}

@Injectable()
export class ConsoleMailSender implements MailSender {
  private readonly logger = new Logger('Mail')

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `(console sender: replace it in modules/mail/mail.module.ts)\n  to: ${message.to}\n  subject: ${message.subject}\n\n${message.text}\n`
    )
  }
}

@Module({
  providers: [{ provide: MAIL_SENDER, useClass: ConsoleMailSender }],
  exports: [MAIL_SENDER],
})
export class MailModule {}
