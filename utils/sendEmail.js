const nodemailer = require("nodemailer");

async function sendEmail({ to, subject, html, replyTo }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // smtp-relay.brevo.com
      port: Number(process.env.SMTP_PORT), // 587 or 465
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER, // Brevo SMTP login
        pass: process.env.SMTP_PASS, // Brevo SMTP key
      },
    });

    await transporter.sendMail({
      from: `pawanshah84489@gmail.com`,
      to,
      replyTo,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
}

module.exports = sendEmail;
