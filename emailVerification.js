const transporter = require('./mailer.js');

function sendVerificationEmail(email, token) {
  const url = `https://dog-chuchub.onrender.com/api/verify?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Account',
    text: `Hello, welcome to Dogchuchu!
  
  Please click the link below to verify your account:
  https://dog-chuchub.onrender.com/api/verify?token=${token}
  
  Made with love by Group 7 of CS2D AppDev 2024-25`,
    html: `<p>Hello, welcome to Dogchuchu!</p>
           <p>Please click the link below to verify your account:</p>
           <p><a href="https://dog-chuchub.onrender.com/api/verify?token=${token}">Verify Your Account</a></p>
           <p>Made with love by Group 7 of CS2D AppDev 2024-25</p>
           <p><img alt="Decorative image" width="500" height="300" src="https://i.pinimg.com/originals/bb/cd/4a/bbcd4a8498bdfde55bfd6bf0fdbff66d.gif"></p>`
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
