import { env } from 'env';
import nodemailer from 'nodemailer';

const transporter =
    env.SMTP_HOST === undefined
        ? undefined
        : nodemailer.createTransport({
              host: env.SMTP_HOST,
              port: env.SMTP_PORT,
              secure: true,
              auth: { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD },
          });
const addresses = (list: string) => list.split(',').filter((address) => address !== '');
export async function sendEmail(to: string, title: string, body: string) {
    if (transporter === undefined || addresses(to).length === 0) return [];
    const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: addresses(to),
        cc: env.EMAIL_INBOX,
        subject: title,
        text: body, // Plain-text version of the message
    });
    return info.accepted;
}
