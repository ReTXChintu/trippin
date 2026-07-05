interface SendEmailResult {
  sent: boolean;
  logged?: boolean;
}

function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function getTransporter() {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log("[email:not-configured]", { to, subject, text: text ?? html });
    return { sent: false, logged: true };
  }

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  });

  return { sent: true };
}

export async function sendTripMemberAddedEmail(params: {
  toEmail: string;
  toName: string;
  tripTitle: string;
  tripId: string;
  addedByName: string;
}): Promise<SendEmailResult> {
  const tripUrl = `${appBaseUrl()}/trips/${params.tripId}`;
  const subject = `You've been added to "${params.tripTitle}"`;
  const html = `
    <p>Hi ${params.toName},</p>
    <p><strong>${params.addedByName}</strong> added you to the trip <strong>${params.tripTitle}</strong>.</p>
    <p><a href="${tripUrl}">Open trip</a></p>
    <p>You can view and edit the itinerary, trip details, and places for this trip.</p>
  `;
  const text = `${params.addedByName} added you to "${params.tripTitle}". Open: ${tripUrl}`;

  return sendEmail(params.toEmail, subject, html, text);
}

export async function sendTripMemberLeftEmail(params: {
  toEmail: string;
  toName: string;
  tripTitle: string;
  tripId: string;
  memberName: string;
  memberEmail: string;
}): Promise<SendEmailResult> {
  const tripUrl = `${appBaseUrl()}/trips/${params.tripId}`;
  const subject = `${params.memberName} left "${params.tripTitle}"`;
  const html = `
    <p>Hi ${params.toName},</p>
    <p><strong>${params.memberName}</strong> (${params.memberEmail}) left your trip <strong>${params.tripTitle}</strong>.</p>
    <p><a href="${tripUrl}">View trip</a></p>
  `;
  const text = `${params.memberName} left "${params.tripTitle}". View: ${tripUrl}`;

  return sendEmail(params.toEmail, subject, html, text);
}
