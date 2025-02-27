// In the same file or a separate file (e.g., utils/emailVerification.js)
const transporter = require('./mailer');

function sendVerificationEmail(email, token) {
  // Construct the verification URL – change the domain as needed (e.g., your Render URL)
  const url = `https://dog-chuchub.onrender.com/api/verify?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Account',
    html: `<p>Please click the following link to verify your account:</p>
           <a href="${url}">Verify Email</a>`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Verification email sent:', info.response);
    }
  });
}

module.exports = sendVerificationEmail;
