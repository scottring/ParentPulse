/**
 * sendFamilyInvite — callable Cloud Function that emails a pending
 * invite so the recipient can register and join the family.
 *
 * Client contract (src/hooks/useFamily.ts):
 *   1. Writes the pending-invite document into the family doc
 *      (existing behavior — nothing changes there)
 *   2. Calls this function with the inviteEmail + context, which
 *      renders a templated email and sends via Resend
 *
 * The email is content-only — there's no "token" embedded. The
 * existing `checkPendingInvite` onCall handler matches by email on
 * registration, so all the recipient needs is to click through to
 * /register with their email address in hand.
 */

const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {sendMail} = require("./sendMail");

const DEFAULT_APP_URL = "https://relish.my";

exports.sendFamilyInvite = onCall(
    {
      region: "us-central1",
      secrets: ["RESEND_API_KEY", "RESEND_FROM"],
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {
        email,
        inviterName,
        familyName,
      } = request.data || {};

      if (!email || typeof email !== "string") {
        throw new Error("email is required");
      }

      const appUrl = process.env.RELISH_APP_URL || DEFAULT_APP_URL;
      const inviter = (inviterName || "Someone").trim();
      const family = (familyName || "").trim();
      const registerUrl = `${appUrl}/register?email=${encodeURIComponent(email)}`;

      const subject = `${inviter} invited you to Relish`;
      const html = renderInviteHtml({
        inviterName: inviter,
        familyName: family,
        registerUrl,
        recipientEmail: email,
      });
      const text = renderInviteText({
        inviterName: inviter,
        familyName: family,
        registerUrl,
      });

      try {
        const data = await sendMail({to: email, subject, html, text});
        return {sent: true, id: data?.id ?? null};
      } catch (err) {
        logger.error("sendFamilyInvite: send failed", {
          email,
          error: err instanceof Error ? err.message : String(err),
        });
        throw new Error("Failed to send invitation email");
      }
    },
);

/**
 * Cream paper background, italic serif headline, fleuron, one CTA.
 * Same editorial voice as the rest of the app. Deliberately simple —
 * readable on mobile, no hero image, no brand gradients.
 */
function renderInviteHtml({inviterName, familyName, registerUrl, recipientEmail}) {
  const familyLine = familyName ?
    `to the ${escapeHtml(familyName)} family book` :
    "to their family book";
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(inviterName)} invited you to Relish</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F0E8;font-family:Georgia,'Times New Roman',serif;color:#3A3530;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBF8F2;border:1px solid #D8D3CA;border-radius:3px;padding:48px 44px;">
            <tr>
              <td align="center" style="padding-bottom:8px;color:#B5A99A;font-size:20px;line-height:1;">❦</td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <div style="font-family:Georgia,serif;font-size:34px;font-style:italic;font-weight:300;letter-spacing:-0.015em;line-height:1.1;color:#3A3530;">
                  You&rsquo;re invited to Relish.
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-size:16.5px;line-height:1.6;color:#5C5347;padding-bottom:12px;">
                <em style="color:#3A3530;">${escapeHtml(inviterName)}</em> added you
                ${familyLine}.
              </td>
            </tr>
            <tr>
              <td style="font-size:16.5px;line-height:1.6;color:#5C5347;padding-bottom:28px;">
                Relish is a long-running family journal that gives something back.
                You write about the people in your life, they write their own perspective,
                and the book finds what becomes visible only when both views are held
                together. Your account below lets you add your own voice.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 0 28px;">
                <a href="${escapeAttr(registerUrl)}" style="display:inline-block;padding:12px 28px;background:#14100C;color:#FBF8F2;text-decoration:none;border-radius:999px;font-family:Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">
                  Accept &amp; begin
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.55;color:#887C68;padding-top:12px;border-top:1px solid #E5E0D8;">
                Register with <em style="color:#5C5347;">${escapeHtml(recipientEmail)}</em> to join ${escapeHtml(inviterName)}&rsquo;s family automatically. If the button above
                doesn&rsquo;t work, paste this link in your browser:<br>
                <span style="color:#A89373;">${escapeHtml(registerUrl)}</span>
              </td>
            </tr>
          </table>
          <div style="padding-top:20px;font-family:Georgia,serif;font-style:italic;font-size:13px;color:#887C68;">
            Relish &mdash; Operating manuals for the people you love.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderInviteText({inviterName, familyName, registerUrl}) {
  const familyLine = familyName ? ` to the ${familyName} family book` : "";
  return [
    `${inviterName} invited you to Relish.`,
    "",
    `${inviterName} added you${familyLine}.`,
    "",
    "Relish is a long-running family journal that gives something back.",
    "You write about the people in your life, they write their own",
    "perspective, and the book finds what becomes visible only when both",
    "views are held together.",
    "",
    "Accept and begin:",
    registerUrl,
    "",
    "— Relish",
  ].join("\n");
}

function escapeHtml(s) {
  return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s);
}
