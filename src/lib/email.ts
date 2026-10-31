import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export interface SendOtpEmailParams {
  to: string;
  code: string;
  type?: 'magic_link' | 'admin_login' | 'admin_reset' | 'user_reset' | 'register' | 'general';
  displayName?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  provider?: 'resend' | 'hostinger' | 'smtp' | 'sendgrid' | 'simulation';
  error?: string;
  simulated?: boolean;
  hint?: string;
}

/**
 * Clean and sanitize API key string from quotes or surrounding whitespace
 */
function sanitizeKey(key?: string): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Direct REST API call to Resend (https://api.resend.com/emails)
 * Extremely reliable, eliminates any Node SDK version discrepancies.
 */
async function sendViaResendRest(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  apiKey: string;
}): Promise<{ ok: boolean; id?: string; error?: string; status?: number; rawResponse?: any }> {
  try {
    const cleanKey = sanitizeKey(params.apiKey);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = data?.message || data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      console.warn(`[Resend REST] Error (${response.status}):`, errMsg);
      return { ok: false, error: errMsg, status: response.status, rawResponse: data };
    }

    return { ok: true, id: data?.id, status: response.status, rawResponse: data };
  } catch (err: any) {
    console.error('[Resend REST Exception]', err);
    return { ok: false, error: err.message || 'Network error connecting to Resend API' };
  }
}

/**
 * Send an email using Resend API (Primary engine for OTP Login)
 * Implements intelligent fallback: custom sender -> onboarding@resend.dev -> pure onboarding@resend.dev
 */
async function sendViaResend(params: {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
  apiKey: string;
}): Promise<EmailDispatchResult> {
  const cleanKey = sanitizeKey(params.apiKey);
  if (!cleanKey) {
    return {
      success: false,
      error: 'Resend API key is missing or empty',
      provider: 'resend',
    };
  }

  // Determine potential senders in order of priority:
  // 1. Explicit verified sender from RESEND_FROM or params.from
  // 2. GroupLinks <onboarding@resend.dev>
  // 3. onboarding@resend.dev
  const customFrom = sanitizeKey(process.env.RESEND_FROM) || sanitizeKey(params.from) || sanitizeKey(process.env.SMTP_FROM);
  const candidateSenders: string[] = [];
  
  if (customFrom && !customFrom.includes('onboarding@resend.dev')) {
    candidateSenders.push(customFrom);
  }
  candidateSenders.push('GroupLinks <onboarding@resend.dev>');
  candidateSenders.push('onboarding@resend.dev');

  let lastError = '';

  for (let i = 0; i < candidateSenders.length; i++) {
    const sender = candidateSenders[i];
    console.log(`[Email - Resend] Attempting dispatch to ${params.to} using sender: "${sender}" (attempt ${i + 1}/${candidateSenders.length})`);

    // Try via direct REST API first (fastest and most explicit)
    const restResult = await sendViaResendRest({
      to: params.to,
      from: sender,
      subject: params.subject,
      html: params.html,
      text: params.text,
      apiKey: cleanKey,
    });

    if (restResult.ok && restResult.id) {
      console.log(`[Email - Resend Success] Message delivered to ${params.to} (ID: ${restResult.id}) via sender ${sender}`);
      return {
        success: true,
        messageId: restResult.id,
        provider: 'resend',
      };
    }

    lastError = restResult.error || 'Unknown Resend error';

    // If SDK is also available, try with SDK as secondary attempt
    try {
      const resendSdk = new Resend(cleanKey);
      const sdkResult = await resendSdk.emails.send({
        from: sender,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (!sdkResult.error && sdkResult.data?.id) {
        console.log(`[Email - Resend SDK Success] Message delivered to ${params.to} (ID: ${sdkResult.data.id})`);
        return {
          success: true,
          messageId: sdkResult.data.id,
          provider: 'resend',
        };
      } else if (sdkResult.error) {
        lastError = sdkResult.error.message || lastError;
      }
    } catch (sdkErr: any) {
      console.warn('[Email - Resend SDK Exception]', sdkErr?.message);
    }

    // Check if error is due to domain verification; if so, proceed to next candidate sender
    const isDomainIssue =
      lastError.toLowerCase().includes('domain') ||
      lastError.toLowerCase().includes('verify') ||
      lastError.toLowerCase().includes('not registered') ||
      lastError.toLowerCase().includes('from');

    if (!isDomainIssue && i === 0 && candidateSenders.length > 1) {
      // If error is not strictly domain, still try fallback sender onboarding@resend.dev once
      continue;
    }
  }

  // Check for Resend Sandbox / Testing limitation:
  // e.g. "You can only send testing emails to your own email address..."
  const isSandboxRestriction =
    lastError.toLowerCase().includes('testing emails to your own email') ||
    lastError.toLowerCase().includes('only send testing') ||
    lastError.toLowerCase().includes('resend.com/domains');

  let friendlyError = lastError;
  let hint: string | undefined = undefined;

  if (isSandboxRestriction) {
    friendlyError = 'Resend Sandbox Mode: Resend testing domain (onboarding@resend.dev) can only deliver emails to your registered Resend account address. To send to any recipient, verify your custom domain in the Resend dashboard (resend.com/domains).';
    hint = 'Verify your domain in resend.com or test using your Resend account email address.';
  } else if (lastError.toLowerCase().includes('api key') || lastError.toLowerCase().includes('unauthorized')) {
    friendlyError = 'Invalid Resend API Key. Please verify RESEND_API_KEY in your settings.';
  }

  console.warn(`[Email - Resend Final Failure] ${friendlyError}`);

  return {
    success: false,
    error: friendlyError,
    hint,
    provider: 'resend',
  };
}

/**
 * Get or initialize the Nodemailer transporter using environment variables.
 * Automatically defaults to Hostinger SMTP (smtp.hostinger.com:465) when Hostinger email is detected.
 */
function getSmtpTransporter() {
  const user = sanitizeKey(process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.EMAIL_SERVER_USER);
  const pass = sanitizeKey(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD);
  
  let host = sanitizeKey(process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST);
  if (!host && user && (user.includes('grouplinks.app') || user.includes('hostinger'))) {
    host = 'smtp.hostinger.com';
  } else if (!host && pass) {
    host = 'smtp.hostinger.com';
  }

  const rawPort = process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT;
  const port = parseInt(rawPort || (host === 'smtp.hostinger.com' ? '465' : '587'), 10);
  const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : (port === 465);

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
  });
}

/**
 * Send an email using SendGrid HTTP API if key is present
 */
async function sendViaSendGrid(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  apiKey: string;
}): Promise<EmailDispatchResult> {
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sanitizeKey(params.apiKey)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: {
          email: params.from.includes('<') ? params.from.match(/<([^>]+)>/)?.[1] || params.from : params.from,
          name: 'GroupLinks'
        },
        subject: params.subject,
        content: [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html }
        ]
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Email - SendGrid Error]', errorText);
      return { success: false, error: errorText, provider: 'sendgrid' };
    }

    return { success: true, provider: 'sendgrid' };
  } catch (err: any) {
    return { success: false, error: err.message, provider: 'sendgrid' };
  }
}

/**
 * Send an email using Hostinger Mail REST API (https://api.mail.hostinger.com)
 * Official endpoint: POST https://api.mail.hostinger.com/api/v1/mailboxes/{mailboxResourceId}/send
 */
async function sendViaHostingerMailApi(params: {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
  token: string;
  mailboxId: string;
}): Promise<EmailDispatchResult> {
  try {
    const cleanToken = sanitizeKey(params.token);
    const cleanMailboxId = params.mailboxId.trim();

    if (!cleanToken || !cleanMailboxId) {
      return {
        success: false,
        error: 'Hostinger Mail API token or mailbox resource ID is missing',
        provider: 'hostinger',
      };
    }

    const endpoint = `https://api.mail.hostinger.com/api/v1/mailboxes/${encodeURIComponent(cleanMailboxId)}/send`;
    
    // Determine friendly display name
    let displayName = 'GroupLinks';
    if (params.from && params.from.includes('<')) {
      const parsedName = params.from.split('<')[0].trim().replace(/^["']|["']$/g, '');
      if (parsedName) displayName = parsedName;
    }

    const payload = {
      to: [params.to],
      displayName,
      subject: params.subject,
      html: params.html,
      text: params.text,
    };

    console.log(`[Email - Hostinger API] Sending email to ${params.to} from mailbox ${cleanMailboxId}...`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      let errDetail = errBody;
      try {
        const parsed = JSON.parse(errBody);
        errDetail = parsed.message || parsed.error || errBody;
      } catch {}

      console.error(`[Email - Hostinger API Error] HTTP ${res.status}:`, errDetail);
      return {
        success: false,
        error: `Hostinger Mail API error (${res.status}): ${errDetail}`,
        provider: 'hostinger',
      };
    }

    console.log(`[Email - Hostinger API Success] Email successfully sent to ${params.to}`);
    return {
      success: true,
      provider: 'hostinger',
    };
  } catch (err: any) {
    console.error('[Email - Hostinger API Exception]', err);
    return {
      success: false,
      error: err.message || 'Failed to connect to Hostinger Mail API',
      provider: 'hostinger',
    };
  }
}

/**
 * Generate a responsive, branded HTML email template for GroupLinks OTP
 */
function buildOtpEmailHtml(code: string, type: SendOtpEmailParams['type'] = 'magic_link', to: string): string {
  let title = 'Sign in to GroupLinks';
  let subtitle = 'Here is your 6-digit one-time passcode to sign in instantly to your account.';
  
  if (type === 'admin_login') {
    title = 'Admin Portal 2FA Verification';
    subtitle = 'A secure login attempt to the GroupLinks Administrator Portal was initiated.';
  } else if (type === 'admin_reset') {
    title = 'Admin Password Reset';
    subtitle = 'Use the verification code below to securely reset your administrator password.';
  } else if (type === 'user_reset') {
    title = 'Account Password Reset';
    subtitle = 'Use the verification code below to securely reset your account password.';
  } else if (type === 'register') {
    title = 'Welcome to GroupLinks';
    subtitle = 'Use the verification code below to create and verify your new account.';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%); padding: 36px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 9999px; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 800; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">One-Time Passcode</span>
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">GroupLinks</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #e0e7ff; font-weight: 500;">Community Directory &amp; Hub</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center;">${title}</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #475569; text-align: center;">${subtitle}</p>
              
              <!-- Verification Code Box -->
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 24px 0;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b; display: block; margin-bottom: 10px;">Verification Code</span>
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #4f46e5; display: inline-block; padding-left: 10px;">${code}</span>
              </div>
              
              <div style="background-color: #eef2ff; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #3730a3; font-weight: 500; text-align: center;">
                  ⏳ This code expires in <strong>15 minutes</strong>. Never share this code with anyone.
                </p>
              </div>

              <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 18px; color: #94a3b8; text-align: center;">
                If you did not request this login code, you can safely ignore this email. No password is stored.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Sent to <strong style="color: #64748b;">${to}</strong> by <a href="https://grouplinks.app" style="color: #4f46e5; text-decoration: none; font-weight: 600;">GroupLinks</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Primary dispatch function to send real OTP verification emails
 */
export async function sendOtpEmail(params: SendOtpEmailParams): Promise<EmailDispatchResult> {
  const { to, code, type = 'magic_link' } = params;
  const cleanTo = to.trim().toLowerCase();

  const defaultFrom = sanitizeKey(process.env.HOSTINGER_FROM) || sanitizeKey(process.env.RESEND_FROM) || sanitizeKey(process.env.SMTP_FROM) || sanitizeKey(process.env.EMAIL_FROM) || 'GroupLinks <noreply@grouplinks.app>';
  const subject = type === 'admin_login'
    ? `[GroupLinks] Admin Portal 2FA Verification Code: ${code}`
    : type === 'admin_reset'
    ? `[GroupLinks] Password Reset Code: ${code}`
    : type === 'user_reset'
    ? `[GroupLinks] Reset Your Password: ${code}`
    : type === 'register'
    ? `[GroupLinks] Complete Your Registration: ${code}`
    : `Your GroupLinks Verification Code: ${code}`;

  const html = buildOtpEmailHtml(code, type, cleanTo);
  const text = `Your GroupLinks Verification Code is: ${code}\n\nThis code will expire in 15 minutes. Never share this code with anyone.\n\nIf you did not request this code, you can safely ignore this message.\n\nGroupLinks.app`;

  const isAdmin = type === 'admin_login' || type === 'admin_reset';

  // 1. Hostinger Mail REST API Engine (https://api.mail.hostinger.com)
  const hostingerToken = sanitizeKey(process.env.HOSTINGER_MAIL_API_TOKEN) || sanitizeKey(process.env.HOSTINGER_API_KEY) || sanitizeKey(process.env.HOSTINGER_API_TOKEN);
  const hostingerMailboxId = sanitizeKey(process.env.HOSTINGER_MAILBOX_ID) || sanitizeKey(process.env.HOSTINGER_MAILBOX_RESOURCE_ID);

  if (hostingerToken && hostingerMailboxId) {
    console.log(`[Email - Hostinger] Dispatching OTP email to ${cleanTo} via Hostinger Mail API (${type})...`);
    const hostingerResult = await sendViaHostingerMailApi({
      to: cleanTo,
      from: defaultFrom,
      subject,
      html,
      text,
      token: hostingerToken,
      mailboxId: hostingerMailboxId,
    });

    if (hostingerResult.success) {
      return hostingerResult;
    }

    console.warn(`[Email - Hostinger Alert] Hostinger Mail API failed: ${hostingerResult.error}. Checking fallback channels...`);
  }

  // 2. Hostinger SMTP / Custom SMTP Transporter (Option 2 - noreply@grouplinks.app)
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const smtpHost = sanitizeKey(process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST) || 'smtp.hostinger.com';
      console.log(`[Email - SMTP] Dispatching OTP email to ${cleanTo} via SMTP (${smtpHost}) (${type})...`);
      const info = await transporter.sendMail({
        from: defaultFrom,
        to: cleanTo,
        subject,
        text,
        html,
      });

      console.log(`[Email - SMTP Success] Message sent to ${cleanTo}: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
      };
    } catch (smtpErr: any) {
      console.error('[Email - SMTP Failure]', smtpErr);
      // If SMTP fails, continue to fallback channels below
    }
  }

  const resendKey = sanitizeKey(process.env.RESEND_API_KEY);

  // 3. Resend API Engine (if configured)
  if (resendKey) {
    console.log(`[Email - Resend] Dispatching OTP email to ${cleanTo} via Resend API (${type})...`);
    const resendResult = await sendViaResend({
      to: cleanTo,
      from: defaultFrom,
      subject,
      html,
      text,
      apiKey: resendKey,
    });

    if (resendResult.success) {
      return resendResult;
    }

    console.warn(`[Email - Resend Alert] Resend API attempt: ${resendResult.error}. Checking fallback channels...`);
  }

  // 4. Fallback: Try SendGrid API if configured
  const sendgridKey = sanitizeKey(process.env.SENDGRID_API_KEY);
  if (sendgridKey) {
    console.log(`[Email] Dispatching fallback to ${cleanTo} via SendGrid...`);
    const sgResult = await sendViaSendGrid({
      to: cleanTo,
      from: defaultFrom,
      subject,
      html,
      text,
      apiKey: sendgridKey,
    });
    if (sgResult.success) {
      return sgResult;
    }
  }

  // 5. If Hostinger API was provided and failed, and no other fallback succeeded:
  if (hostingerToken) {
    return {
      success: false,
      error: 'Hostinger Mail API dispatch failed. Please verify HOSTINGER_MAIL_API_TOKEN and HOSTINGER_MAILBOX_ID.',
      hint: 'Ensure your mailbox resource ID and token are active in Hostinger hPanel -> Agentic Mail -> API access.',
      provider: 'hostinger',
    };
  }

  // 6. If RESEND_API_KEY was provided and failed, and no other fallback succeeded:
  if (resendKey) {
    return {
      success: false,
      error: 'Resend API dispatch failed. Please verify your RESEND_API_KEY and sender domain.',
      hint: 'If using onboarding@resend.dev, emails can only be sent to the email address registered with your Resend account.',
      provider: 'resend',
    };
  }

  // 7. If no email API keys or SMTP credentials are configured:
  // Log the code clearly so developer / previewer can sign in immediately
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n======================================================`);
    console.log(`[EMAIL OTP DISPATCH - LOCAL DEV PREVIEW ONLY]`);
    console.log(`Recipient: ${cleanTo}`);
    console.log(`Subject:   ${subject}`);
    console.log(`OTP Code:  [HIDDEN IN PRODUCTION] (${code.slice(0, 2)}****)`);
    console.log(`To receive live emails in your inbox, set HOSTINGER_MAIL_API_TOKEN or SMTP_PASS (Hostinger SMTP)`);
    console.log(`======================================================\n`);
  }

  return {
    success: true,
    simulated: true,
    provider: 'simulation',
  };
}

export interface SendGroupFeedbackEmailParams {
  groupId?: string;
  groupTitle?: string;
  groupUrl?: string;
  groupPlatform?: string;
  category?: string;
  feedbackType: 'broken_link' | 'expired_invite' | 'inaccurate_info' | 'spam_or_abuse' | 'feature_suggestion' | 'general_feedback' | 'other';
  message: string;
  userEmail?: string;
  userIp?: string;
  pageUrl?: string;
}

const FEEDBACK_TYPE_LABELS: Record<string, { label: string; badgeColor: string; icon: string }> = {
  broken_link: { label: 'Broken / Invalid Link', badgeColor: '#ef4444', icon: '🚨' },
  expired_invite: { label: 'Expired Invite Link', badgeColor: '#f97316', icon: '⏳' },
  inaccurate_info: { label: 'Inaccurate Information', badgeColor: '#eab308', icon: '⚠️' },
  spam_or_abuse: { label: 'Spam / Abusive Content', badgeColor: '#dc2626', icon: '🛡️' },
  feature_suggestion: { label: 'Feature Suggestion', badgeColor: '#6366f1', icon: '💡' },
  general_feedback: { label: 'General Feedback', badgeColor: '#3b82f6', icon: '💬' },
  other: { label: 'Other Issue / Suggestion', badgeColor: '#64748b', icon: '📌' },
};

/**
 * Dispatch group feedback / broken link report email directly to the administrator.
 * Target email configured via ADMIN_EMAIL in .env.
 */
export async function sendGroupFeedbackEmail(
  params: SendGroupFeedbackEmailParams
): Promise<EmailDispatchResult> {
  const adminEmail = sanitizeKey(process.env.ADMIN_EMAIL) || 'kirankumar8728@gmail.com';
  const typeMeta = FEEDBACK_TYPE_LABELS[params.feedbackType] || FEEDBACK_TYPE_LABELS.other;
  const groupLabel = params.groupTitle ? `[${params.groupPlatform?.toUpperCase() || 'Group'}] ${params.groupTitle}` : 'Community Directory Feedback';
  const subject = `${typeMeta.icon} [Feedback: ${typeMeta.label}] ${groupLabel}`;

  const defaultFrom = sanitizeKey(process.env.SMTP_FROM) ||
    sanitizeKey(process.env.HOSTINGER_FROM) ||
    sanitizeKey(process.env.RESEND_FROM) ||
    'GroupLinks <noreply@grouplinks.app>';

  const timestamp = new Date().toUTCString();

  const text = `
=== GROUPLINKS FEEDBACK & REPORT ===
Type: ${typeMeta.label}
Date: ${timestamp}
Reporter Email: ${params.userEmail || 'Anonymous'}

GROUP DETAILS:
Title: ${params.groupTitle || 'N/A'}
ID: ${params.groupId || 'N/A'}
Platform: ${params.groupPlatform || 'N/A'}
Category: ${params.category || 'N/A'}
Invite URL: ${params.groupUrl || 'N/A'}
Directory Page: ${params.pageUrl || 'N/A'}

USER MESSAGE:
${params.message}

Technical Info:
IP: ${params.userIp || 'Hidden'}
====================================
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%); padding: 32px; text-align: left;">
              <div style="display: inline-block; background-color: ${typeMeta.badgeColor}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                ${typeMeta.icon} ${typeMeta.label}
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                ${params.groupTitle ? params.groupTitle : 'Directory User Feedback'}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">
                GroupLinks Administrative Alert &amp; Feedback System
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <!-- User Message Box -->
              <div style="background-color: #0f172a; border-left: 4px solid ${typeMeta.badgeColor}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">
                  User Message / Description
                </h3>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #f1f5f9; white-space: pre-wrap;">
                  ${params.message}
                </p>
              </div>

              <!-- Group Metadata Table -->
              ${params.groupTitle ? `
              <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">
                Target Community Information
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin-bottom: 24px; font-size: 13px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8; width: 35%;">Community Title:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #ffffff; font-weight: 600;">${params.groupTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8;">Platform / Category:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #ffffff;">${params.groupPlatform?.toUpperCase()} • ${params.category || 'General'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8;">Group ID:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #cbd5e1; font-family: monospace;">${params.groupId}</td>
                </tr>
                ${params.groupUrl ? `
                <tr>
                  <td style="padding: 12px 16px; color: #94a3b8;">Invite URL:</td>
                  <td style="padding: 12px 16px; color: #38bdf8; word-break: break-all;">
                    <a href="${params.groupUrl}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${params.groupUrl}</a>
                  </td>
                </tr>
                ` : ''}
              </table>
              ` : ''}

              <!-- Reporter Details -->
              <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">
                Submission Details
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; font-size: 13px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8; width: 35%;">Reporter Email:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #ffffff;">
                    ${params.userEmail ? `<a href="mailto:${params.userEmail}" style="color: #818cf8; text-decoration: underline;">${params.userEmail}</a>` : '<em style="color: #64748b;">Anonymous visitor</em>'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8;">Timestamp:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #cbd5e1;">${timestamp}</td>
                </tr>
                ${params.pageUrl ? `
                <tr>
                  <td style="padding: 12px 16px; color: #94a3b8;">Origin Page:</td>
                  <td style="padding: 12px 16px; color: #cbd5e1; word-break: break-all;">${params.pageUrl}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Quick Action Button -->
              ${params.pageUrl ? `
              <div style="text-align: center; margin-top: 24px;">
                <a href="${params.pageUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px;">
                  Open Group in Directory &rarr;
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 20px 28px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Delivered to administrator inbox (${adminEmail}) via GroupLinks Feedback Engine
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  console.log(`[Feedback Email] Dispatching feedback for "${params.groupTitle || 'General'}" to admin (${adminEmail})...`);

  // 1. Try Hostinger Mail API if token configured
  const hostingerToken = sanitizeKey(process.env.HOSTINGER_MAIL_API_TOKEN);
  const hostingerMailbox = sanitizeKey(process.env.HOSTINGER_MAILBOX_ID);
  if (hostingerToken && hostingerMailbox) {
    const result = await sendViaHostingerMailApi({
      to: adminEmail,
      from: defaultFrom,
      subject,
      html,
      text,
      token: hostingerToken,
      mailboxId: hostingerMailbox,
    });
    if (result.success) return result;
  }

  // 2. Try SMTP
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: defaultFrom,
        to: adminEmail,
        subject,
        text,
        html,
      });
      console.log(`[Feedback Email - SMTP Success] Delivered to ${adminEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err: any) {
      console.error('[Feedback Email - SMTP Failure]', err.message);
    }
  }

  // 3. Try Resend
  const resendKey = sanitizeKey(process.env.RESEND_API_KEY);
  if (resendKey) {
    const result = await sendViaResend({
      to: adminEmail,
      from: defaultFrom,
      subject,
      html,
      text,
      apiKey: resendKey,
    });
    if (result.success) return result;
  }

  // 4. Try SendGrid
  const sendgridKey = sanitizeKey(process.env.SENDGRID_API_KEY);
  if (sendgridKey) {
    const result = await sendViaSendGrid({
      to: adminEmail,
      from: defaultFrom,
      subject,
      html,
      text,
      apiKey: sendgridKey,
    });
    if (result.success) return result;
  }

  // 5. Fallback simulation
  console.log(`\n======================================================`);
  console.log(`[ADMIN FEEDBACK DISPATCHED (Simulation Fallback)]`);
  console.log(`Recipient (Admin): ${adminEmail}`);
  console.log(`Subject:           ${subject}`);
  console.log(`Type:              ${typeMeta.label}`);
  console.log(`Group:             ${params.groupTitle || 'N/A'} (ID: ${params.groupId || 'N/A'})`);
  console.log(`Reporter:          ${params.userEmail || 'Anonymous'}`);
  console.log(`Message:           ${params.message}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    simulated: true,
    provider: 'simulation',
  };
}
