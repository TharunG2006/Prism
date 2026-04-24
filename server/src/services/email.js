const nodemailer = require("nodemailer");
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your Prism Verification Code",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 40px 20px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #818cf8; margin: 0; font-size: 28px;">PRISM</h1>
          <p style="color: #64748b; font-size: 12px; letter-spacing: 4px; margin-top: 4px;">SECURE MESSAGING</p>
        </div>
        <div style="background: #1e293b; border-radius: 12px; padding: 30px; text-align: center;">
          <p style="color: #94a3b8; font-size: 16px; margin-top: 0;">Your verification code is:</p>
          <div style="background: #0f172a; border: 2px solid #4f46e5; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #818cf8;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in <strong style="color: #e2e8f0;">10 minutes</strong>.</p>
        </div>
        <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification code sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending verification code:", err);
    throw err;
  }
};

module.exports = { sendVerificationCode, generateVerificationCode };
