async function sendOtpEmail(toEmail, otp) {
  const payload = {
    name: "Nehru Attendance System",           // REQUIRED
    email: "no-reply@yourdomain.com",         // REQUIRED (use a real sender email you control)
    to: toEmail,
    subject: "Your OTP for Attendance Login",
    message: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
    senderName: "Nehru Attendance System",
  };

  const response = await fetch("https://mailserver.metatronnest.com/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error("Status:", response.status);
    console.error("Response body:", raw);
    throw new Error(`Server error: ${response.status}`);
  }

  const result = JSON.parse(raw);
  console.log("OTP sent successfully:", result);
  return result;
}

const otp = Math.floor(100000 + Math.random() * 900000);
sendOtpEmail("hexafammalaysia@gmail.com", otp).catch(console.error);
