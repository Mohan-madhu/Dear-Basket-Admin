const nodemailer = require("nodemailer");

async function sendOtpEmail(toEmail, otp) {
  // 1. Create transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for 587
    auth: {
      user: "otp.harryclinton@gmail.com",      // 🔴 your Gmail
      pass: "fvhh izqg hqkp mhgi" // 🔴 Gmail App Password
    }
  });

  // 2. Mail options
  const mailOptions = {
    from: `"Nehru Attendance System" <yourgmail@gmail.com>`,
    to: toEmail,
    subject: "Your OTP for Attendance Login",
    text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
    html: `
      <h2>Nehru Attendance System</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for <b>5 minutes</b>.</p>
    `
  };

  // 3. Send mail
  const info = await transporter.sendMail(mailOptions);
  console.log("OTP sent:", info.messageId);
  return info;
}

// Generate OTP
const otp = Math.floor(100000 + Math.random() * 900000);

// Test
sendOtpEmail("mohan326856@gmail.com", otp)
  .catch(console.error);
