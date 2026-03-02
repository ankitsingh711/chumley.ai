import nodemailer from 'nodemailer';
import Logger from './logger';
import { getFrontendUrl } from '../config/runtime';

// Create a transporter using environment variables
const createTransporter = () => {
    const config = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT!),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    };

    return nodemailer.createTransport(config);
};

export interface SendInvitationEmailParams {
    to: string;
    name: string;
    inviteLink: string;
    invitedBy?: string;
    role?: string;
    companyName?: string;
}

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const redactInviteToken = (url: string): string => {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.searchParams.has('token')) {
            parsedUrl.searchParams.set('token', '[REDACTED]');
        }
        return parsedUrl.toString();
    } catch {
        return '[REDACTED_INVITE_LINK]';
    }
};

export const sendInvitationEmail = async ({
    to,
    name,
    inviteLink,
    invitedBy = 'Your administrator',
    role = 'Team Member',
    companyName = 'Aspect',
}: SendInvitationEmailParams): Promise<boolean> => {
    try {
        // Check if email is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            Logger.warn('Email not configured. Skipping invitation email.');
            Logger.info(`Invitation link for ${to}: ${redactInviteToken(inviteLink)}`);
            return false;
        }

        const transporter = createTransporter();
        const frontendUrl = getFrontendUrl();
        const safeName = escapeHtml(name);
        const safeInvitedBy = escapeHtml(invitedBy);
        const safeCompanyName = escapeHtml(companyName);
        const safeInviteLink = inviteLink;

        // Role descriptions
        const getRoleDescription = (role: string) => {
            const descriptions: Record<string, string> = {
                'SYSTEM_ADMIN': 'You will have full system access and can manage all users, suppliers, and purchase orders.',
                'SENIOR_MANAGER': 'You will have the authority to manage suppliers and approve purchase requests for your department.',
                'MANAGER': 'You will have the authority to review and approve purchase requisitions within your department\'s budget.',
                'MEMBER': 'You will be able to create purchase requests and view your submitted requests.',
            };
            return descriptions[role] || 'You will have access to the procurement platform.';
        };

        const getRoleDisplayName = (role: string) => {
            const displayNames: Record<string, string> = {
                'SYSTEM_ADMIN': 'Administrator',
                'SENIOR_MANAGER': 'Senior Manager',
                'MANAGER': 'Manager',
                'MEMBER': 'Team Member',
            };
            return displayNames[role] || role;
        };

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Aspect" <${process.env.EMAIL_USER}>`,
            to,
            subject: `You're invited to join ${companyName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6; 
                            color: #1f2937; 
                            margin: 0;
                            padding: 0;
                            background-color: #f3f4f6;
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 40px auto; 
                            background: #ffffff;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }
                        .header { 
                            background: #ffffff;
                            padding: 32px 40px 24px;
                            border-bottom: 1px solid #e5e7eb;
                        }
                        .logo-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 24px;
                        }
                        .logo {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            font-size: 18px;
                            font-weight: 600;
                            color: #3d6fc2;
                        }
                        .logo-icon {
                            width: 32px;
                            height: 32px;
                            background: #3d6fc2;
                            border-radius: 6px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                        }
                        .badge {
                            background: #eff6ff;
                            color: #3d6fc2;
                            padding: 4px 12px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .content { 
                            padding: 32px 40px;
                        }
                        h1 {
                            font-size: 24px;
                            font-weight: 700;
                            color: #111827;
                            margin: 0 0 20px 0;
                            line-height: 1.3;
                        }
                        .greeting {
                            color: #6b7280;
                            margin-bottom: 12px;
                        }
                        .intro-text {
                            color: #4b5563;
                            margin-bottom: 28px;
                            line-height: 1.6;
                        }
                        .intro-text strong {
                            color: #111827;
                            font-weight: 600;
                        }
                        .role-box {
                            background: #eff6ff;
                            border: 1px solid #bfdbfe;
                            border-radius: 8px;
                            padding: 20px;
                            margin: 24px 0;
                        }
                        .role-label {
                            color: #3d6fc2;
                            font-size: 11px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 6px;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        }
                        .role-name {
                            color: #111827;
                            font-size: 18px;
                            font-weight: 700;
                            margin-bottom: 8px;
                        }
                        .role-description {
                            color: #4b5563;
                            font-size: 14px;
                            line-height: 1.5;
                        }
                        .button-container {
                            text-align: center;
                            margin: 32px 0;
                        }
                        .button { 
                            display: inline-block;
                            padding: 14px 32px;
                            background: #3d6fc2;
                            color: white !important;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 15px;
                            transition: background 0.2s;
                        }
                        .button:hover {
                            background: #2a559e;
                        }
                        .expiry-note {
                            text-align: center;
                            color: #6b7280;
                            font-size: 13px;
                            margin-top: 16px;
                        }
                        .security-section {
                            background: #f9fafb;
                            border-top: 1px solid #e5e7eb;
                            padding: 24px 40px;
                        }
                        .security-header {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            color: #111827;
                            font-weight: 600;
                            font-size: 14px;
                            margin-bottom: 6px;
                        }
                        .security-text {
                            color: #6b7280;
                            font-size: 13px;
                            margin-bottom: 8px;
                        }
                        .security-link {
                            color: #3d6fc2;
                            text-decoration: none;
                            font-size: 13px;
                            font-weight: 500;
                        }
                        .footer { 
                            text-align: center;
                            padding: 24px 40px;
                            background: #f9fafb;
                            border-top: 1px solid #e5e7eb;
                        }
                        .footer-links {
                            margin-bottom: 16px;
                        }
                        .footer-links a {
                            color: #6b7280;
                            text-decoration: none;
                            font-size: 13px;
                            margin: 0 12px;
                        }
                        .footer-text {
                            color: #9ca3af;
                            font-size: 12px;
                            line-height: 1.5;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo-row">
                                <div class="logo">
                                    <div class="logo-icon">C</div>
                                    Aspect
                                </div>
                                <div class="badge">OFFICIAL INVITATION</div>
                            </div>
                        </div>
                        
                        <div class="content">
                            <h1>Join ${safeCompanyName}</h1>
                            
                            <p class="greeting">Hello ${safeName},</p>
                            
                            <p class="intro-text">
                                ${safeInvitedBy} has invited you to join the <strong>${safeCompanyName}</strong> procurement team. 
                                Access centralized purchasing, vendor management, and streamlined approvals.
                            </p>
                            
                            <div class="role-box">
                                <div class="role-label">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#3d6fc2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    YOUR ASSIGNED ROLE
                                </div>
                                <div class="role-name">${getRoleDisplayName(role)}</div>
                                <div class="role-description">${getRoleDescription(role)}</div>
                            </div>
                            
                            <div class="button-container">
                                <a href="${safeInviteLink}" class="button">
                                    Accept Invitation & Set Up Password →
                                </a>
                            </div>
                            
                            <p class="expiry-note">This link is valid for 24 hours</p>
                        </div>
                        
                        <div class="security-section">
                            <div class="security-header">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Secure Invitation
                            </div>
                            <p class="security-text">This is a verified invitation from your organization's administrator.</p>
                            <a href="${frontendUrl}/security" class="security-link">Security Center →</a>
                        </div>
                        
                        <div class="footer">
                            <div class="footer-links">
                                <a href="${frontendUrl}/privacy">Privacy Policy</a>
                                <a href="${frontendUrl}/terms">Terms of Service</a>
                                <a href="${frontendUrl}/support">Contact Support</a>
                            </div>
                            <p class="footer-text">
                                © ${new Date().getFullYear()} Aspect Inc. ${process.env.COMPANY_ADDRESS || '123 Enterprise Way, Suite 600, San Francisco, CA'}.<br>
                                You received this because an administrator invited you.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Hello ${name},

${invitedBy} has invited you to join the ${companyName} procurement team.

YOUR ASSIGNED ROLE: ${getRoleDisplayName(role)}
${getRoleDescription(role)}

To get started, please visit the following link to set up your account:
${inviteLink}

This link is valid for 24 hours.

SECURE INVITATION
This is a verified invitation from your organization's administrator.

© ${new Date().getFullYear()} Aspect Inc. You received this because an administrator invited you.
            `.trim(),
        };

        await transporter.sendMail(mailOptions);
        Logger.info(`Invitation email sent to: ${to}`);
        return true;
    } catch (error) {
        Logger.error('Failed to send invitation email:', error);
        Logger.info(`Invitation link for ${to}: ${redactInviteToken(inviteLink)}`);
        return false;
    }
};
