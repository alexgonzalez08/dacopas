import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type SendEmailParams = Parameters<typeof resend.emails.send>[0]

export async function sendEmail(params: SendEmailParams) {
  if (process.env.SKIP_EMAIL_NOTIFICATIONS === 'true') {
    console.log(`[email skipped] to=${Array.isArray(params.to) ? params.to.join(',') : params.to} subject="${params.subject}"`)
    return { data: null, error: null }
  }
  return resend.emails.send(params)
}
