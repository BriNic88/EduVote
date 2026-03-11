import { Resend } from 'resend';

let connectionSettings: any;
let resendClient: Resend | null = null;

async function getResendClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );

  const data = await response.json();
  connectionSettings = data.items?.[0];

  if (!connectionSettings?.settings?.api_key) {
    throw new Error('Resend not connected or API key not found');
  }

  return {
    client: new Resend(connectionSettings.settings.api_key),
    fromEmail: connectionSettings.settings.from_email
  };
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  try {
    console.log('[Email] Attempting to send password reset email to:', toEmail);
    console.log('[Email] REPLIT_CONNECTORS_HOSTNAME:', process.env.REPLIT_CONNECTORS_HOSTNAME ? 'SET' : 'NOT SET');

    // Check if Resend is properly configured
    if (!process.env.REPLIT_CONNECTORS_HOSTNAME) {
      console.error('[Email] ERROR: Resend connector hostname not found. Email service is not configured.');
      throw new Error('Resend email service is not configured. Please check Replit integration settings.');
    }

    const { client, fromEmail } = await getResendClient();
    console.log('[Email] Resend client initialized. Sending from:', fromEmail);

    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Reset Your EduVote Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>EduVote Password Reset</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your EduVote password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                  <a href="${resetLink}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link in your browser:</p>
                <p><code>${resetLink}</code></p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>Best regards,<br>EduVote Team</p>
              </div>
              <div class="footer">
                <p>© 2024 EduVote Online Voting System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log('[Email] Password reset email sent successfully. Message ID:', result.id);
    return result;
  } catch (error: any) {
    console.error('[Email] Failed to send password reset email:', error.message || error);
    throw error;
  }
}

export async function sendWelcomeEmail(toEmail: string, studentName: string) {
  try {
    const { client, fromEmail } = await getResendClient();

    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Welcome to EduVote - Your Account is Pending Approval',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to EduVote</h1>
              </div>
              <div class="content">
                <p>Hello ${studentName},</p>
                <p>Thank you for registering with EduVote! Your account has been created successfully.</p>
                <p><strong>Your account status:</strong> Pending Approval</p>
                <p>An administrator will review your account and you'll be notified once it's approved. Once approved, you'll be able to participate in school elections and cast your vote.</p>
                <p>You can log in anytime to view upcoming elections and your profile.</p>
                <p>Best regards,<br>EduVote Team</p>
              </div>
              <div class="footer">
                <p>© 2024 EduVote Online Voting System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}
