import { model } from "@medusajs/framework/utils"

const OtpVerification = model.define("otp_verification", {
  id: model.id().primaryKey(),
  email: model.text().searchable(),
  otp: model.text(),
  verified: model.boolean().default(false),
  expires_at: model.dateTime(),
})

export default OtpVerification
