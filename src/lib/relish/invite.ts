// Inviting a friend to start their own Relish: a plain link to the sign-up,
// shared from the device's share sheet or copied. It joins nothing; the
// friend's account and books are entirely their own. (Inviting a partner
// into your family is a different flow, in Family.)
export const INVITE_URL = "https://app.relish.my/";
export const INVITE_TEXT =
  "I’ve been using Relish, a private journal our family keeps together. Start your own family’s journal here:";

type Nav = {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export type InviteResult = "shared" | "copied" | "cancelled" | "failed";

export async function inviteFriend(nav: Nav | undefined = globalThis.navigator): Promise<InviteResult> {
  if (nav?.share) {
    try {
      await nav.share({ title: "Relish", text: INVITE_TEXT, url: INVITE_URL });
      return "shared";
    } catch (e) {
      // Closing the share sheet is a choice, not a failure.
      if (e instanceof Error && e.name === "AbortError") return "cancelled";
    }
  }
  try {
    await nav?.clipboard?.writeText(`${INVITE_TEXT} ${INVITE_URL}`);
    return nav?.clipboard ? "copied" : "failed";
  } catch {
    return "failed";
  }
}

export const inviteNotice: Record<InviteResult, string> = {
  shared: "",
  cancelled: "",
  copied: "Invite link copied. Paste it into a message to a friend.",
  failed: `Copy this link to invite a friend: ${INVITE_URL}`,
};
