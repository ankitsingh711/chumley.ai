import nodemailer from 'nodemailer';
import Logger from '../utils/logger';

// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT!),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASSWORD!,
    },
});

// Verify connection configuration
transporter.verify((error) => {
    if (error) {
        Logger.error('Email service configuration error:', error);
    } else {
        Logger.info('Email service is ready to send messages');
    }
});

interface PurchaseRequestEmailData {
    supplierEmail: string;
    supplierName: string;
    requesterName: string;
    requesterEmail: string;
    requestId: string;
    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
    }>;
    totalAmount: number;
    createdAt: Date;
    reason?: string;
}

export const sendPurchaseRequestNotification = async (data: PurchaseRequestEmailData): Promise<boolean> => {
    try {
        const {
            supplierEmail,
            supplierName,
            requesterName,
            requesterEmail,
            requestId,
            items,
            totalAmount,
            createdAt,
            reason,
        } = data;

        // Generate items HTML
        const itemsHtml = items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${item.unitPrice.toLocaleString('en-GB')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">£${(item.quantity * item.unitPrice).toLocaleString('en-GB')}</td>
            </tr>
        `).join('');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Purchase Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); max-width: 600px;">
                    <!-- Header with Logo and Badge -->
                    <tr>
                        <td style="padding: 32px 40px 24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="margin-bottom: 4px;">
                                            <img src="https://res.cloudinary.com/dzoeng5xp/image/upload/v1707252277/aspect-logo.png" alt="Aspect powered by chumley.ai" height="40" style="display: block; border: 0;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150x40/27549D/ffffff?text=ASPECT+powered+by+chumley.ai';" />
                                        </div>
                                        <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Global Corp Procurement</div>
                                    </td>
                                    <td align="right">
                                        <span style="background-color: #dde7f4; color: #172d53; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">New Request</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Title -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">New Purchase Request #${requestId.slice(0, 12)}</h1>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 0 40px 8px 40px;">
                            <p style="margin: 0; font-size: 15px; color: #111827; font-weight: 500;">Hello ${supplierName},</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">A new purchase request has been generated${reason ? '. ' + reason : ''}. Please review the details below and acknowledge receipt.</p>
                        </td>
                    </tr>

                    <!-- Info Grid -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="50%" style="padding-right: 12px; padding-bottom: 20px;">
                                        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; height: 100%;">
                                            <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">ISSUE DATE</div>
                                            <div style="color: #111827; font-size: 15px; font-weight: 600;">${new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding-left: 12px; padding-bottom: 20px;">
                                        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; height: 100%;">
                                            <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">TERMS</div>
                                            <div style="color: #111827; font-size: 15px; font-weight: 600;">Net 30</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="50%" style="padding-right: 12px;">
                                        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; height: 100%;">
                                            <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">SHIP VIA</div>
                                            <div style="color: #111827; font-size: 15px; font-weight: 600;">Standard Ground</div>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding-left: 12px;">
                                        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; height: 100%;">
                                            <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">REQUESTER</div>
                                            <div style="color: #111827; font-size: 15px; font-weight: 600;">${requesterName}</div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Order Summary -->
                    <tr>
                        <td style="padding: 0 40px 16px 40px;">
                            <h2 style="margin: 0; font-size: 13px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">ORDER SUMMARY</h2>
                        </td>
                    </tr>

                    <!-- Items Table -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                <thead>
                                    <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                                        <th style="padding: 14px 16px; text-align: left; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                                        <th style="padding: 14px 16px; text-align: center; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 60px;">Qty</th>
                                        <th style="padding: 14px 16px; text-align: right; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 100px;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.map((item, idx) => `
                                    <tr style="border-bottom: ${idx === items.length - 1 ? 'none' : '1px solid #e5e7eb'};">
                                        <td style="padding: 16px; color: #111827; font-size: 14px;">${item.description}</td>
                                        <td style="padding: 16px; text-align: center; color: #111827; font-size: 14px; font-weight: 500;">${item.quantity}</td>
                                        <td style="padding: 16px; text-align: right; color: #111827; font-size: 14px; font-weight: 600;">£${(item.quantity * item.unitPrice).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <!-- Total Amount -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="right" style="padding-right: 12px;">
                                        <span style="color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">TOTAL AMOUNT</span>
                                    </td>
                                    <td align="right" style="width: 120px;">
                                        <span style="color: #27549D; font-size: 24px; font-weight: 700;">\£${totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/requests?search=${requestId.slice(0, 8)}" style="display: block; background-color: #27549D; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-size: 15px; font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                                👁 View Full Order Details
                            </a>
                        </td>
                    </tr>

                    <!-- Action Links -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px; text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/requests?search=${requestId.slice(0, 8)}" style="color: #27549D; text-decoration: none; font-size: 13px; font-weight: 600; margin: 0 12px;">📄 Download PDF</a>
                            <span style="color: #d1d5db;">|</span>
                            <a href="mailto:${requesterEmail}" style="color: #6b7280; text-decoration: none; font-size: 13px; font-weight: 600; margin: 0 12px;">💬 Contact Buyer</a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center; line-height: 1.5;">
                                This is an automated notification from Global Corp's procurement system.<br/>
                                Please do not reply directly to this email.
                            </p>
                            <div style="text-align: center; margin: 16px 0;">
                                <span style="color: #d1d5db; margin: 0 8px; font-size: 18px;">🌐</span>
                                <span style="color: #d1d5db; margin: 0 8px; font-size: 18px;">🐦</span>
                                <span style="color: #d1d5db; margin: 0 8px; font-size: 18px;">💼</span>
                            </div>
                            <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} ASPECT POWERED BY CHUMLEY.AI
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Aspect by Chumley.ai" <${process.env.EMAIL_USER}>`,
            to: supplierEmail,
            subject: `New Purchase Request #${requestId.slice(0, 8)} - £${totalAmount.toLocaleString('en-GB')}`,
            html: htmlContent,
            text: `
New Purchase Request Notification

Hello ${supplierName},

A new purchase request has been created:

Request ID: #${requestId.slice(0, 8)}
Date: ${new Date(createdAt).toLocaleDateString()}
Requester: ${requesterName} (${requesterEmail})
Total Amount: £${totalAmount.toLocaleString('en-GB')}

Items:
${items.map(item => `- ${item.description} (Qty: ${item.quantity}, Price: £${item.unitPrice})`).join('\n')}

Please review this request and respond at your earliest convenience.

Reply to: ${requesterEmail}

---
This is an automated notification from Aspect by Chumley.ai
© ${new Date().getFullYear()} Aspect by Chumley.ai. All rights reserved.
            `.trim(),
        };

        await transporter.sendMail(mailOptions);
        Logger.info(`Purchase request notification sent to ${supplierEmail} for request ${requestId}`);
        return true;
    } catch (error) {
        Logger.error('Failed to send purchase request notification:', error);
        return false;
    }
};

interface ApprovalRequestEmailData {
    approverEmail: string;
    approverName: string;
    requesterName: string;
    requestId: string;
    totalAmount: number;
    manageUrl: string;
}

export const sendApprovalRequestEmail = async (data: ApprovalRequestEmailData): Promise<boolean> => {
    try {
        const { approverEmail, approverName, requesterName, requestId, totalAmount, manageUrl } = data;

        const htmlContent = `
            <h2>Purchase Request Approval Required</h2>
            <p>Hello ${approverName},</p>
            <p><strong>${requesterName}</strong> has submitted a new purchase request that requires your approval.</p>
            <ul>
                <li><strong>Request ID:</strong> #${requestId.slice(0, 8)}</li>
                <li><strong>Amount:</strong> £${totalAmount.toLocaleString('en-GB')}</li>
            </ul>
            <p>Please review and approve or reject this request.</p>
            <a href="${manageUrl}" style="background-color: #27549D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Aspect by Chumley.ai" <${process.env.EMAIL_USER}>`,
            to: approverEmail,
            subject: `Approval Required: Request #${requestId.slice(0, 8)}`,
            html: htmlContent,
        });

        Logger.info(`Approval request email sent to ${approverEmail}`);
        return true;
    } catch (error) {
        Logger.error('Failed to send approval request email:', error);
        return false;
    }
};

interface NewRequestRaisedEmailData {
    recipientEmail: string;
    recipientName: string;
    requesterName: string;
    requestId: string;
    totalAmount: number;
    manageUrl: string;
}

export const sendNewRequestRaisedEmail = async (data: NewRequestRaisedEmailData): Promise<boolean> => {
    try {
        const {
            recipientEmail,
            recipientName,
            requesterName,
            requestId,
            totalAmount,
            manageUrl,
        } = data;

        const requestShortId = requestId.slice(0, 8);

        const htmlContent = `
            <h2>New Purchase Request Raised</h2>
            <p>Hello ${recipientName},</p>
            <p><strong>${requesterName}</strong> has raised a new purchase request.</p>
            <ul>
                <li><strong>Request ID:</strong> #${requestShortId}</li>
                <li><strong>Amount:</strong> £${totalAmount.toLocaleString('en-GB')}</li>
            </ul>
            <p>You can view the request details using the link below.</p>
            <a href="${manageUrl}" style="background-color: #27549D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Aspect by Chumley.ai" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `New Purchase Request: #${requestShortId}`,
            html: htmlContent,
        });

        Logger.info(`New purchase request email sent to ${recipientEmail} for request ${requestId}`);
        return true;
    } catch (error) {
        Logger.error('Failed to send new purchase request email:', error);
        return false;
    }
};

interface RejectionEmailData {
    requesterEmail: string;
    requesterName: string;
    requestId: string;
    totalAmount: number;
    reason?: string;
}

export const sendRejectionNotification = async (data: RejectionEmailData): Promise<boolean> => {
    try {
        const { requesterEmail, requesterName, requestId, totalAmount, reason } = data;

        const htmlContent = `
            <h2>Purchase Request Rejected</h2>
            <p>Hello ${requesterName},</p>
            <p>Your purchase request has been <strong>rejected</strong> by the approver.</p>
            <ul>
                <li><strong>Request ID:</strong> #${requestId.slice(0, 8)}</li>
                <li><strong>Amount:</strong> £${totalAmount.toLocaleString('en-GB')}</li>
            </ul>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>Please contact your manager for more details.</p>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Aspect by Chumley.ai" <${process.env.EMAIL_USER}>`,
            to: requesterEmail,
            subject: `Request Rejected: #${requestId.slice(0, 8)}`,
            html: htmlContent,
        });

        Logger.info(`Rejection email sent to ${requesterEmail}`);
        return true;
    } catch (error) {
        Logger.error('Failed to send rejection email:', error);
        return false;
    }
};

interface SupplierConversationEmailData {
    supplierEmail: string;
    supplierName: string;
    senderName: string;
    senderEmail: string;
    replyToAddress?: string;
    subject?: string;
    content: string;
    medium?: string;
}

interface SupplierConversationEmailResult {
    sent: boolean;
    providerMessageId?: string;
    error?: string;
}

export const sendSupplierConversationEmail = async (
    data: SupplierConversationEmailData
): Promise<SupplierConversationEmailResult> => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            const error = 'Email service not configured';
            Logger.warn(`Supplier conversation email skipped: ${error}`);
            return { sent: false, error };
        }

        const {
            supplierEmail,
            supplierName,
            senderName,
            senderEmail,
            replyToAddress,
            subject,
            content,
            medium = 'EMAIL',
        } = data;

        const resolvedSubject = subject?.trim() || `Message from ${senderName}`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Aspect by Chumley.ai" <${process.env.EMAIL_USER}>`,
            to: supplierEmail,
            replyTo: replyToAddress || senderEmail,
            subject: resolvedSubject,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
                    <p style="margin: 0 0 12px;">Hello ${supplierName || 'Supplier'},</p>
                    <p style="margin: 0 0 16px;">You have received a new message from <strong>${senderName}</strong>.</p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                        <p style="margin: 0; white-space: pre-wrap;">${content}</p>
                    </div>
                    <p style="margin: 0 0 8px; color: #475569; font-size: 13px;">
                        <strong>Medium:</strong> ${medium}<br />
                        <strong>Reply-to:</strong> ${replyToAddress || senderEmail}
                    </p>
                    <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">
                        Sent via Aspect by Chumley.ai.
                    </p>
                    <p style="margin: 8px 0 0;">
                        <a href="${frontendUrl}/suppliers" style="color: #1d4ed8; text-decoration: none;">Open Supplier Inbox</a>
                    </p>
                </div>
            `,
            text: `
Hello ${supplierName || 'Supplier'},

You have received a new message from ${senderName}.

${content}

Medium: ${medium}
Reply-to: ${replyToAddress || senderEmail}

Open Supplier Inbox: ${frontendUrl}/suppliers
            `.trim(),
        };

        const info = await transporter.sendMail(mailOptions);
        Logger.info(`Supplier conversation email sent to ${supplierEmail}`);

        return {
            sent: true,
            providerMessageId: info.messageId,
        };
    } catch (error: unknown) {
        Logger.error('Failed to send supplier conversation email:', error);
        return {
            sent: false,
            error: error instanceof Error ? error.message : 'Failed to send supplier message email',
        };
    }
};

export default {
    sendPurchaseRequestNotification,
    sendApprovalRequestEmail,
    sendNewRequestRaisedEmail,
    sendRejectionNotification,
    sendSupplierConversationEmail,
};
