const transporter = require('./mailer.js');

function sendVerificationEmail(email, token) {
  const url = `https://dog-chuchub.onrender.com/api/verify?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'psst pogi, Verify Your Account',
    html: `<p>Hallo, welcome to Dogchuchu</p>
           <p>Please click the following link to verify your account:</p>
           <a href="${url}">Verify Email lods</a>
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
