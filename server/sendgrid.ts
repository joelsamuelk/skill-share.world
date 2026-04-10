import { MailService } from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

let mailService: MailService | null = null;

if (SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(
  params: EmailParams
): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid not configured - email not sent');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

interface AdminNotificationParams {
  adminEmails: string[];
  fromEmail: string;
  profileName: string;
  profileEmail: string;
  profileId: string;
  appUrl: string;
}

export async function notifyAdminsOfPendingProfile(
  params: AdminNotificationParams
): Promise<{ sent: number; failed: number }> {
  if (!mailService) {
    console.warn('SendGrid not configured - admin notification not sent');
    return { sent: 0, failed: 0 };
  }

  const { adminEmails, fromEmail, profileName, profileEmail, profileId, appUrl } = params;

  if (adminEmails.length === 0) {
    console.log('No admin emails to notify');
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  const subject = `New Profile Pending Approval: ${profileName}`;
  const reviewUrl = `${appUrl}/admin`;

  for (const adminEmail of adminEmails) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Profile Needs Review</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            A new skill profile has been submitted and is waiting for your approval.
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #1e3a5f; margin-bottom: 25px;">
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${profileName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${profileEmail}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Review Profile
            </a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 25px;">
            Please review and approve or reject this profile in the admin dashboard.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
          <p>St Basil's Redemptive Enterprise - Skill Share</p>
        </div>
      </body>
      </html>
    `;

    const text = `
New Profile Needs Review

A new skill profile has been submitted and is waiting for your approval.

Name: ${profileName}
Email: ${profileEmail}

Please review this profile at: ${reviewUrl}

---
St Basil's Redemptive Enterprise - Skill Share
    `;

    const success = await sendEmail({
      to: adminEmail,
      from: fromEmail,
      subject,
      html,
      text,
    });

    if (success) {
      sent++;
      console.log(`Admin notification sent to ${adminEmail}`);
    } else {
      failed++;
      console.error(`Failed to send admin notification to ${adminEmail}`);
    }
  }

  console.log(`Admin notifications: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
