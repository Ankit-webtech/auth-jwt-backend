import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (email, subject, html) => {
  const { error } = await resend.emails.send({
    from: 'Auth App <onboarding@resend.dev>',
    to: 'adankitnagar@gmail.com', 
    subject: `[To: ${email}] ${subject}`,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export default sendMail;


// import { createTransport } from 'nodemailer';

// // Simple helper for sending transactional emails
// const sendMail = async (email, subject, html) => {
// const transport = createTransport({
//     host: 'smtp.gmail.com',
//     port: 587,
//     secure: false, // port 587 ke liye false
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASSWORD,
//     },
// });
//   await transport.sendMail({
//     from: process.env.SMTP_USER,
//     to: email,
//     subject,
//     html,
//   });
// };

// export default sendMail;
