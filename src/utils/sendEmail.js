const nodemailer = require("nodemailer");

/**
 * @name sendEmail
 * @description Sends an email using Nodemailer. Falls back to console logging in development.
 */
async function sendEmail({ to, subject, text, html }) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    // Fallback: If SMTP variables are missing, log the email/OTP to console
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn("\n=======================================================");
        console.warn("[SMTP Warn] SMTP credentials missing in environment (.env).");
        console.warn(`[SMTP Log] Sending Email To: ${to}`);
        console.warn(`[SMTP Log] Subject: ${subject}`);
        if (text) console.warn(`[SMTP Log] Text Content: ${text}`);
        if (html) console.warn(`[SMTP Log] HTML Content: ${html}`);
        console.warn("=======================================================\n");
        return { success: true, loggedToConsole: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT || "587"),
            secure: SMTP_PORT === "465", // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        });

        const info = await transporter.sendMail({
            from: `"PrepAI Support" <${SMTP_USER}>`,
            to,
            subject,
            text,
            html
        });

        console.log(`[SMTP Log] Email sent successfully: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error("[SMTP Error] Failed to send email via SMTP:", err.message);
        throw err;
    }
}

module.exports = sendEmail;
