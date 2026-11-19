import { describe, expect, it, vi } from "vitest";
import { inviteFriend, INVITE_TEXT, INVITE_URL } from "../invite";

describe("invite a friend", () => {
  it("uses the share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await inviteFriend({ share })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Relish", text: INVITE_TEXT, url: INVITE_URL });
  });
  it("closing the share sheet is not an error and copies nothing", async () => {
    const abort = Object.assign(new Error("closed"), { name: "AbortError" });
    const writeText = vi.fn();
    expect(await inviteFriend({ share: vi.fn().mockRejectedValue(abort), clipboard: { writeText } })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });
  it("copies the message and link without a share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await inviteFriend({ clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(`${INVITE_TEXT} ${INVITE_URL}`);
  });
  it("falls back to showing the link when nothing works", async () => {
    expect(await inviteFriend({})).toBe("failed");
    expect(await inviteFriend({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })).toBe("failed");
  });
});
