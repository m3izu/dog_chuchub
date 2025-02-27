require('dotenv').config();
const transporter = require('./mailer');

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: 'galendezronald13@gmail.com',
  subject: 'mariel i love you',
  text: 'i love mariel',
};

transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    console.error('Error sending test email:', err);
  } else {
    console.log('Test email sent:', info.response);
  }
});
