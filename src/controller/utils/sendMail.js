import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


const User = "pavansaini8888@gmail.com";
const pass = "oahy bfbl zwmp pcug";


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: User,
    pass: pass,
  },
});

// Function to send OTP email
export const sendOTP = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"Your App Name" <${User}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<h2>Your OTP is: <b>${otp}</b></h2><p>This code is valid for 5 minutes.</p>`,
    });

    console.log("✅ Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
};
