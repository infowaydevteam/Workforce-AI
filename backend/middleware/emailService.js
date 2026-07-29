const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Welcome email sent to new employee when admin creates their account ───

const sendAgentEmail = async ({
  email,
  name,
  activationCode,
  downloadLink,
}) => {
  try {
    await transporter.sendMail({
      from: `"IWF Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to IWF - Install Your Agent",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9fafb;border-radius:12px;">

          <div style="background:#4f46e5;padding:24px;border-radius:10px;text-align:center;margin-bottom:24px;">
            <h1 style="color:white;margin:0;font-size:24px;">IWF InfoWorkforce</h1>
          </div>

          <h2 style="color:#111827;">Welcome, ${name}!</h2>

          <p style="color:#374151;">
            Your IWF account has been created. Follow the steps below to get started.
          </p>

          <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:20px 0;">

            <h3 style="color:#4f46e5;margin-top:0;">Step 1 — Download the Agent</h3>
            <p style="color:#374151;">Click the button below to download the IWF Agent for your Mac:</p>
            <a
              href="${downloadLink}"
              style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:bold;"
            >
              Download IWF Agent (.dmg)
            </a>

            <h3 style="color:#4f46e5;margin-top:24px;">Step 2 — Install &amp; Open</h3>
            <p style="color:#374151;">
              Open the downloaded <strong>.dmg</strong> file, drag IWF Agent to your Applications folder, then launch it from Applications.
            </p>

            <h3 style="color:#4f46e5;margin-top:24px;">Step 3 — Enter Your Activation Code</h3>
            <p style="color:#374151;">When prompted, enter this activation code:</p>
            <div style="background:#f3f4f6;border:2px dashed #4f46e5;border-radius:8px;padding:16px;text-align:center;">
              <code style="font-size:18px;font-weight:bold;color:#4f46e5;letter-spacing:2px;">${activationCode}</code>
            </div>

          </div>

          <p style="color:#6b7280;font-size:13px;">
            Keep this code private. If you have questions, contact your administrator.
          </p>

          <p style="color:#374151;">
            Best Regards,<br/>
            <strong>IWF Team</strong>
          </p>

        </div>
      `,
    });

    console.log("Welcome email sent to:", email);
  } catch (err) {
    console.error("Email Error:", err.message);
  }
};

// ── Alert email sent to admin (and optionally manager) on restricted usage ─

const sendRestrictedWebsiteAlert = async ({
  recipientEmail,
  recipientName,
  employeeName,
  employeeEmail,
  website,
  duration,
}) => {
  try {
    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    await transporter.sendMail({
      from: `"IWF Team" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `🚨 IWF Alert — ${employeeName} visited ${website}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9fafb;border-radius:12px;">

          <div style="background:#dc2626;padding:20px;border-radius:10px;text-align:center;margin-bottom:24px;">
            <h1 style="color:white;margin:0;font-size:22px;">🚨 Restricted Website Alert</h1>
          </div>

          <p style="color:#374151;">Hello <strong>${recipientName}</strong>,</p>

          <p style="color:#374151;">
            An employee under your organization has been detected visiting a restricted website.
          </p>

          <div style="background:white;border:1px solid #fca5a5;border-radius:10px;padding:20px;margin:20px 0;">

            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:10px 8px;color:#6b7280;font-weight:bold;width:40%;">Employee</td>
                <td style="padding:10px 8px;color:#111827;">${employeeName}</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:10px 8px;color:#6b7280;font-weight:bold;">Email</td>
                <td style="padding:10px 8px;color:#111827;">${employeeEmail}</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:10px 8px;color:#6b7280;font-weight:bold;">Website Visited</td>
                <td style="padding:10px 8px;color:#dc2626;font-weight:bold;">${website}</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:10px 8px;color:#6b7280;font-weight:bold;">Duration</td>
                <td style="padding:10px 8px;color:#111827;">${duration} minute(s)</td>
              </tr>
              <tr>
                <td style="padding:10px 8px;color:#6b7280;font-weight:bold;">Detected At</td>
                <td style="padding:10px 8px;color:#111827;">${timestamp}</td>
              </tr>
            </table>

          </div>

          <p style="color:#374151;">Please review the employee's activity in the IWF dashboard.</p>

          <p style="color:#374151;">
            Regards,<br/>
            <strong>IWF Team</strong>
          </p>

        </div>
      `,
    });

    console.log(`Restricted alert sent to: ${recipientEmail}`);
  } catch (err) {
    console.error("Alert Email Error:", err.message);
    throw err;
  }
};

const sendIdleAlertEmail = async ({
  managerEmail,
  managerName,
  employeeName,
  duration,
}) => {
  try {
    await transporter.sendMail({
      from: `"IWF Team" <${process.env.EMAIL_USER}>`,
      to: managerEmail,
      subject: "🚨 IWF Alert - Employee Idle for More Than 1 Hour",

      html: `
      <div style="font-family:Arial;padding:20px;line-height:1.6;">

        <h2 style="color:#f59e0b;">
          Employee Idle Alert
        </h2>

        <p>Hello <b>${managerName}</b>,</p>

        <p>
          An employee has been idle for more than <b>1 hour</b>.
        </p>

        <table
          style="
            border-collapse:collapse;
            margin-top:15px;
          "
        >

          <tr>
            <td style="padding:8px;font-weight:bold;">
              Employee
            </td>

            <td style="padding:8px;">
              ${employeeName}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold;">
              Idle Duration
            </td>

            <td style="padding:8px;">
              ${Math.floor(duration / 60)} Minutes
            </td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold;">
              Alert Time
            </td>

            <td style="padding:8px;">
              ${new Date().toLocaleString()}
            </td>
          </tr>

        </table>

        <br>

        <p style="color:#b45309;font-weight:bold;">
          Please verify the employee's activity.
        </p>

        <br>

        <p>
          Regards,<br>
          IWF Team
        </p>

      </div>
      `,
    });

    console.log("Idle Alert Email Sent");
  } catch (err) {
    console.error("Idle Alert Email Error:", err.message);
  }
};

module.exports = {
  sendAgentEmail,
  sendRestrictedWebsiteAlert,
  sendIdleAlertEmail
};
