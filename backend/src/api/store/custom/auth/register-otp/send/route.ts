import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") || console;
  const email = (req.body as any)?.email;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email address is required" });
  }

  const formattedEmail = email.trim().toLowerCase();

  try {
    // 1. Check if the customer already exists
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: { email: formattedEmail },
    });

    if (customers && customers.length > 0) {
      return res.status(409).json({ message: "Customer email already exists" });
    }

    // 2. Resolve communication service and generate OTP
    const communicationService = req.scope.resolve("communication") as any;
    const otp = await communicationService.generateOtp(formattedEmail);

    // 3. Compile email content using HTML template
    const html = communicationService.loadTemplate("otp-email", {
      otp: otp,
    });

    // 4. Send email via Enterprise CPaaS
    const emailSent = await communicationService.sendEmail(
      formattedEmail,
      "Dubai Police Store - Account Verification Code",
      html
    );

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
    }

    logger.info(`[Register OTP Send] Verification email sent to ${formattedEmail}`);
    return res.status(200).json({ success: true, message: "Verification code sent successfully." });
  } catch (err: any) {
    logger.error(`[Register OTP Send] Error occurred: ${err.message}`);
    return res.status(500).json({ message: err.message || "An unexpected error occurred." });
  }
}
