/**
 * Thin Resend wrapper used by every transactional email the app sends.
 *
 * Usage:
 *   const { sendMail } = require("./sendMail");
 *   await sendMail({
 *     to: "iris@example.com",
 *     subject: "Scott invited you to Relish",
 *     html: "<p>...</p>",
 *     text: "...",
 *   });
 *
 * Requires the RESEND_API_KEY secret at the call site — each Cloud
 * Function that invokes sendMail must list it in its `secrets:` array.
 *
 * The FROM_ADDRESS defaults to Resend's sandbox so we can test before
 * the relish.my domain finishes DNS verification. Once the domain is
 * verified in the Resend console, flip this to "Relish <hello@relish.my>".
 */

const FROM_ADDRESS_DEFAULT = "Relish <onboarding@resend.dev>";

let resendClient = null;
function getClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
        "RESEND_API_KEY is not set. Run: " +
      "firebase functions:secrets:set RESEND_API_KEY",
    );
  }
  const {Resend} = require("resend");
  resendClient = new Resend(apiKey);
  return resendClient;
}

async function sendMail({to, subject, html, text, from}) {
  const logger = require("firebase-functions/logger");
  const client = getClient();
  const payload = {
    from: from || process.env.RESEND_FROM || FROM_ADDRESS_DEFAULT,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };
  const {data, error} = await client.emails.send(payload);
  if (error) {
    logger.error("sendMail: Resend error", {error, to, subject});
    throw new Error(`Resend send failed: ${error.message || "unknown"}`);
  }
  logger.info("sendMail: sent", {id: data?.id, to, subject});
  return data;
}

module.exports = {sendMail, FROM_ADDRESS_DEFAULT};
