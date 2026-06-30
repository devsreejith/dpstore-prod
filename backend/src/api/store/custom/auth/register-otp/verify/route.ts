import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger") || console;
  const email = (req.body as any)?.email;
  const otp = (req.body as any)?.otp;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email address is required" });
  }

  if (!otp || typeof otp !== "string" || !otp.trim()) {
    return res.status(400).json({ message: "Verification code (OTP) is required" });
  }

  const formattedEmail = email.trim().toLowerCase();
  const submittedOtp = otp.trim();

  try {
    const communicationService = req.scope.resolve("communication") as any;
    const verified = await communicationService.verifyOtp(formattedEmail, submittedOtp);

    if (!verified) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired verification code. Please check and try again." 
      });
    }

    logger.info(`[Register OTP Verify] Email verified: ${formattedEmail}`);
    return res.status(200).json({ success: true, verified: true, message: "Email verified successfully." });
  } catch (err: any) {
    logger.error(`[Register OTP Verify] Error occurred: ${err.message}`);
    return res.status(500).json({ message: err.message || "An unexpected error occurred." });
  }
}
