const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendAgentEmail = async ({
  email,
  name,
  password,
  activationCode,
  downloadLink,
}) => {
  try {
    await transporter.sendMail({
      from: `"IWF Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to IWF - Install Your Agent",
      html: `
        <div style="font-family: Arial, sans-serif; padding:20px;">
          
          <h2>Welcome ${name}!</h2>

          <p>
            Your IWF account has been successfully created.
            Below are your login details:
          </p>

          <p><strong>Email:</strong> ${email}</p>


          <p>
            <strong>Activation Code:</strong>
            ${activationCode}
          </p>

          <p>
            Please download and install the IWF Agent using the button below:
          </p>

          <a
            href="${downloadLink}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#4f46e5;
              color:white;
              text-decoration:none;
              border-radius:8px;
            "
          >
            Download IWF Agent
          </a>

          <p style="margin-top:20px;">
            Please keep this information secure and do not share it with others.
          </p>

          <p>
            If you have any questions, contact support.
          </p>

          <br/>

          <p>
            Best Regards,<br/>
            IWF Team
          </p>

        </div>
      `,
    });

    console.log("IWF Email Sent Successfully");
  } catch (err) {
    console.error("Email Error:", err.message);
  }
};

module.exports = {
  sendAgentEmail,
};