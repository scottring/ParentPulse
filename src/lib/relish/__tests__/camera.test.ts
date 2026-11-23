import { describe, expect, it } from "vitest";
import {
  cameraName,
  cameraOptions,
  cameraProblem,
  chooseCamera,
  frameSize,
  hasIPhoneCamera,
  photoFile,
  usesNativeCamera,
  type CameraEnv,
} from "../camera";

const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const desktop: CameraEnv = { userAgent: mac, maxTouchPoints: 0, coarsePointer: false, inApp: false, canStream: true };

describe("usesNativeCamera", () => {
  it("gives a Mac or PC browser the camera sheet", () => {
    expect(usesNativeCamera(desktop)).toBe(false);
    expect(
      usesNativeCamera({ ...desktop, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0" }),
    ).toBe(false);
  });
  it("keeps the phone's own camera on phones, tablets and the iPhone app", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
    expect(usesNativeCamera({ ...desktop, userAgent: iphone })).toBe(true);
    expect(usesNativeCamera({ ...desktop, userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile Safari" })).toBe(true);
    // iPadOS requests desktop sites with a Mac user agent.
    expect(usesNativeCamera({ ...desktop, maxTouchPoints: 5 })).toBe(true);
    expect(usesNativeCamera({ ...desktop, coarsePointer: true })).toBe(true);
    expect(usesNativeCamera({ ...desktop, inApp: true })).toBe(true);
  });
  it("falls back to the file input when the browser can't stream a camera", () => {
    expect(usesNativeCamera({ ...desktop, canStream: false })).toBe(true);
  });
});

describe("chooseCamera", () => {
  const facetime = { deviceId: "ft", label: "FaceTime HD Camera (05ac:8514)" };
  const iphone = { deviceId: "ip", label: "Scott’s iPhone Camera" };
  const usb = { deviceId: "usb", label: "Logitech BRIO" };
  it("prefers an iPhone (Continuity Camera)", () => {
    expect(chooseCamera([facetime, iphone, usb])).toBe("ip");
    expect(chooseCamera([facetime, { deviceId: "ip2", label: "iPhone Camera" }])).toBe("ip2");
  });
  it("keeps the camera chosen last time while it's still here", () => {
    expect(chooseCamera([facetime, iphone, usb], "usb")).toBe("usb");
    expect(chooseCamera([facetime, usb], "ip")).toBe("ft");
  });
  it("uses the first camera, or none", () => {
    expect(chooseCamera([facetime, usb])).toBe("ft");
    expect(chooseCamera([])).toBeUndefined();
  });
  it("lists only named video cameras and tidies their names", () => {
    const list = cameraOptions([
      { kind: "audioinput", deviceId: "mic", label: "Mic" },
      { kind: "videoinput", deviceId: "", label: "" },
      { kind: "videoinput", deviceId: "ft", label: facetime.label },
    ]);
    expect(list).toEqual([facetime]);
    expect(cameraName(facetime, 0)).toBe("FaceTime HD Camera");
    expect(cameraName({ deviceId: "x", label: "" }, 1)).toBe("Camera 2");
    expect(hasIPhoneCamera(list)).toBe(false);
    expect(hasIPhoneCamera([iphone])).toBe(true);
  });
});

describe("cameraProblem", () => {
  it("names what went wrong", () => {
    const err = (name: string) => Object.assign(new Error(name), { name });
    expect(cameraProblem(err("NotAllowedError"))).toBe("denied");
    expect(cameraProblem(err("NotFoundError"))).toBe("none");
    expect(cameraProblem(err("NotReadableError"))).toBe("in-use");
    expect(cameraProblem(err("TypeError"))).toBe("other");
    expect(cameraProblem(null)).toBe("other");
  });
});

describe("frames", () => {
  it("keeps frames within the size limit and their shape", () => {
    expect(frameSize(1920, 1080)).toEqual({ width: 1920, height: 1080 });
    expect(frameSize(4032, 3024)).toEqual({ width: 2560, height: 1920 });
    expect(frameSize(0, 0)).toBeNull();
  });
  it("makes a JPEG file for the photo path", () => {
    const file = photoFile(new Blob([new Uint8Array([1, 2, 3])]), new Date(2026, 10, 23, 9, 5, 7));
    expect(file.type).toBe("image/jpeg");
    expect(file.name).toBe("photo-2026-11-23-090507.jpg");
    expect(file.size).toBe(3);
  });
});
