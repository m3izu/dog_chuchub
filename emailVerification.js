const transporter = require('./mailer.js');

function sendVerificationEmail(email, token) {
  const url = `https://dog-chuchub.onrender.com/api/verify?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Account',
    html: `<p>Hallo, welcome to Dogchuchu</p>
           <p>Please copy the following link and paste it into a new tab to verify your account:</p>
           <p>COPY: https://dog-chuchub.onrender.com/api/verify?token=${token}</>
           <p>made with love by Group 7 of CS2D AppDev 2024-25</p>
           <img alt="i love m" width="500" height="300" src="https://i.pinimg.com/originals/bb/cd/4a/bbcd4a8498bdfde55bfd6bf0fdbff66d.gif">`

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
