const nodemailer = require('nodemailer');

/**
 * Send email using Nodemailer via Gmail SMTP
 * @param {Object} options - { email, subject, message, html }
 */
const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });

    const senderEmail = process.env.EMAIL_USER || 'unknownalexa77@gmail.com';

    const mailOptions = {
        from: `SCAAMS Admin <${senderEmail}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
};

module.exports = sendEmail;
