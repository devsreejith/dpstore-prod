import { MedusaService } from "@medusajs/framework/utils";
import OtpVerification from "./models/otp-verification";
import fs from "fs";
import path from "path";

type ModuleOptions = {
  apiUrl?: string;
  email?: string;
  password?: string;
  emailFrom?: string;
  emailDisplayName?: string;
};

class CommunicationModuleService extends MedusaService({
  OtpVerification,
}) {
  private apiUrl: string;
  private email: string;
  private password: string;
  private emailFrom: string;
  private emailDisplayName: string;

  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private logger: any;

  constructor(
    { logger }: any, // DI container
    options?: ModuleOptions
  ) {
    super(...arguments);
    this.logger = logger || console;

    this.apiUrl = (options?.apiUrl || process.env.ENTERPRISE_API_URL || "https://nexus.eandenterprise.com/api").trim().replace(/\/$/, "");
    this.email = (options?.email || process.env.ENTERPRISE_EMAIL || "").trim();
    this.password = (options?.password || process.env.ENTERPRISE_PASSWORD || "").trim();
    this.emailFrom = (options?.emailFrom || process.env.EMAIL_FROM || "").trim();
    this.emailDisplayName = (options?.emailDisplayName || process.env.EMAIL_DISPLAY_NAME || "Dubai Police Store").trim();
  }

  /**
   * Helper to retrieve or refresh access token with memory caching
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    // Cache access token; subtract 60s buffer
    if (this.accessToken && this.tokenExpiresAt && now < this.tokenExpiresAt - 60000) {
      return this.accessToken as string;
    }

    this.logger.info("[Enterprise CPaaS] Requesting new access token...");
    const url = `${this.apiUrl}/v1/accounts/users/login`;
    const body = {
      email: this.email,
      password: this.password,
      required: true,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Authentication failed with status ${response.status}: ${errText}`);
      }

      const resData = (await response.json()) as any;
      // Handle various response token paths
      const token = resData?.access_token ?? resData?.accessToken ?? resData?.token ?? resData?.data?.token ?? resData?.data?.access_token;
      
      if (!token) {
        throw new Error(`Authentication succeeded but no token was returned in response: ${JSON.stringify(resData)}`);
      }

      this.accessToken = token;
      // Default to 1 hour expiry (3600 seconds) if not returned
      const expiresIn = resData?.expires_in ?? resData?.data?.expires_in ?? 3600;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      this.logger.info("[Enterprise CPaaS] Access token refreshed and cached.");
      
      return this.accessToken as string;
    } catch (error: any) {
      this.logger.error(`[Enterprise CPaaS] Login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send transactional email using Enterprise CPaaS Email API
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    this.logger.info(`[Enterprise CPaaS] Preparing to send email to "${to}" with subject "${subject}"`);
    
    try {
      const token = await this.getAccessToken();
      const url = `${this.apiUrl}/v1/email/send`;

      // Construct a highly compatible schema supporting both flat and nested properties
      const payload = {
        from: this.emailFrom,
        fromName: this.emailDisplayName,
        from_name: this.emailDisplayName,
        sender: this.emailFrom,
        to: to,
        recipient: to,
        subject: subject,
        body: html,
        html: html,
        content: html,
        // Support nested format if needed
        message: {
          from: { email: this.emailFrom, name: this.emailDisplayName },
          to: [{ email: to }],
          subject: subject,
          html: html,
          body: html,
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Email sending failed with status ${response.status}: ${errText}`);
      }

      this.logger.info(`[Enterprise CPaaS] Email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`[Enterprise CPaaS] Failed to send email to ${to}. Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Send SMS using Enterprise CPaaS SMS API (Ready for future SMS support)
   */
  async sendSms(to: string, message: string): Promise<boolean> {
    this.logger.info(`[Enterprise CPaaS] Preparing to send SMS to "${to}"`);
    
    try {
      const token = await this.getAccessToken();
      const url = `${this.apiUrl}/v1/sms/send`;

      const payload = {
        to: to,
        recipient: to,
        message: message,
        body: message,
        text: message,
        sender: this.emailDisplayName,
        from: this.emailDisplayName,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`SMS sending failed with status ${response.status}: ${errText}`);
      }

      this.logger.info(`[Enterprise CPaaS] SMS sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`[Enterprise CPaaS] Failed to send SMS to ${to}. Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Load and compile HTML email template
   */
  loadTemplate(templateName: string, replacements: Record<string, string>): string {
    try {
      let templatePath: string | null = null;
      let currentDir = __dirname;
      
      // Walk up the directory tree to find the template
      while (true) {
        // Check 1: templates/name.html (e.g. in development or if copied to build dir)
        const directPath = path.join(currentDir, "templates", `${templateName}.html`);
        if (fs.existsSync(directPath)) {
          templatePath = directPath;
          break;
        }
        
        // Check 2: src/modules/communication/templates/name.html (relative to project root)
        const srcPath = path.join(currentDir, "src", "modules", "communication", "templates", `${templateName}.html`);
        if (fs.existsSync(srcPath)) {
          templatePath = srcPath;
          break;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          break;
        }
        currentDir = parentDir;
      }

      if (!templatePath || !fs.existsSync(templatePath)) {
        throw new Error(`Template file "${templateName}.html" not found starting from ${__dirname}`);
      }

      let html = fs.readFileSync(templatePath, "utf8");

      for (const [key, value] of Object.entries(replacements)) {
        html = html.replace(new RegExp(`{{${key}}}`, "g"), value || "");
      }

      return html;
    } catch (error: any) {
      this.logger.error(`[Enterprise CPaaS] Failed to load template "${templateName}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a secure 6-digit OTP and store it in the database
   */
  async generateOtp(email: string): Promise<string> {
    const formattedEmail = email.trim().toLowerCase();
    
    // Generate secure 6-digit number
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Mark previous OTPs as expired/invalid
    const existing = await this.listOtpVerifications({ email: formattedEmail, verified: false });
    if (existing && existing.length > 0) {
      await this.deleteOtpVerifications(existing.map((e) => e.id));
    }

    // Save new OTP
    await this.createOtpVerifications({
      email: formattedEmail,
      otp,
      verified: false,
      expires_at: expiry,
    });

    this.logger.info(`[Enterprise CPaaS] Generated OTP for email: ${formattedEmail}`);
    return otp;
  }

  /**
   * Verify OTP submitted by customer
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const formattedEmail = email.trim().toLowerCase();
    const submittedOtp = otp.trim();

    const records = await this.listOtpVerifications(
      { email: formattedEmail, verified: false },
      { order: { created_at: "DESC" }, take: 1 }
    );

    const latestRecord = records?.[0];

    if (!latestRecord) {
      this.logger.warn(`[Enterprise CPaaS] No pending OTP record found for email: ${formattedEmail}`);
      return false;
    }

    if (new Date() > new Date(latestRecord.expires_at)) {
      this.logger.warn(`[Enterprise CPaaS] OTP has expired for email: ${formattedEmail}`);
      await this.deleteOtpVerifications([latestRecord.id]);
      return false;
    }

    if (latestRecord.otp !== submittedOtp) {
      this.logger.warn(`[Enterprise CPaaS] OTP mismatch for email: ${formattedEmail}`);
      return false;
    }

    // Mark as verified
    await this.updateOtpVerifications({
      id: latestRecord.id,
      verified: true,
    });

    this.logger.info(`[Enterprise CPaaS] OTP verified successfully for email: ${formattedEmail}`);
    return true;
  }

  /**
   * Check if the email has a recently verified OTP record (valid for 15 minutes)
   */
  async isOtpVerified(email: string): Promise<boolean> {
    const formattedEmail = email.trim().toLowerCase();
    const records = await this.listOtpVerifications(
      { email: formattedEmail, verified: true },
      { order: { updated_at: "DESC" }, take: 1 }
    );

    const latest = records?.[0];
    if (!latest) return false;

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const isRecent = new Date(latest.updated_at) >= fifteenMinutesAgo;
    
    return isRecent;
  }
}

export default CommunicationModuleService;
