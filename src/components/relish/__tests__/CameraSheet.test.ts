// @vitest-environment happy-dom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CameraSheet from "../CameraSheet";
import { PhotoPicker } from "../Photos";
import { CAMERA_KEY } from "@/lib/relish/camera";

vi.mock("@/lib/relish/camera", async (original) => ({
  ...(await original<typeof import("@/lib/relish/camera")>()),
  captureFrame: vi.fn(async () => new File([new Uint8Array([1])], "photo.jpg", { type: "image/jpeg" })),
}));

const cameras = [
  { kind: "videoinput", deviceId: "ft", label: "FaceTime HD Camera (05ac:8514)", groupId: "" },
  { kind: "videoinput", deviceId: "ip", label: "Scott’s iPhone Camera", groupId: "" },
];
let tracks: { stop: ReturnType<typeof vi.fn> }[];
let getUserMedia: ReturnType<typeof vi.fn>;
function stream(deviceId: string) {
  const track = { stop: vi.fn(), getSettings: () => ({ deviceId }) };
  tracks.push(track);
  return { getTracks: () => [track], getVideoTracks: () => [track] };
}
function devices(list: unknown[], media = getUserMedia) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: media,
      enumerateDevices: vi.fn(async () => list),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    configurable: true,
  });
}
// happy-dom only accepts a real MediaStream here.
Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
  configurable: true,
  get() {
    return null;
  },
  set() {},
});
beforeEach(() => {
  tracks = [];
  getUserMedia = vi.fn(async (c: { video: { deviceId?: { exact: string } } }) =>
    stream(c.video.deviceId?.exact ?? "ft"),
  );
  devices(cameras);
  localStorage.clear();
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:shot");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const sheet = () => {
  const onPhoto = vi.fn(),
    onClose = vi.fn(),
    onChooseFile = vi.fn();
  const view = render(createElement(CameraSheet, { onPhoto, onClose, onChooseFile }));
  return { onPhoto, onClose, onChooseFile, ...view };
};
const live = async () => {
  await screen.findByRole("combobox");
  fireEvent.loadedData(screen.getByLabelText("Camera preview"));
};

describe("CameraSheet", () => {
  it("starts the iPhone, takes a photo, and hands it on as a JPEG", async () => {
    const { onPhoto, onClose } = sheet();
    expect(screen.getByRole("dialog", { name: "Take a photo" })).toBeTruthy();
    await live();
    expect(getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({ video: expect.objectContaining({ deviceId: { exact: "ip" } }) }),
    );
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("ip");
    expect(screen.getByRole("option", { name: "FaceTime HD Camera" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    await screen.findByRole("heading", { name: "Keep this photo?" });
    // The camera is off as soon as the photo is taken.
    expect(tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));
    expect(onPhoto).toHaveBeenCalledWith(expect.any(File));
    expect((onPhoto.mock.calls[0][0] as File).type).toBe("image/jpeg");
    expect(onClose).toHaveBeenCalled();
  });
  it("retakes, and remembers the camera chosen", async () => {
    sheet();
    await live();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ft" } });
    expect(localStorage.getItem(CAMERA_KEY)).toBe("ft");
    await waitFor(() =>
      expect(getUserMedia).toHaveBeenLastCalledWith(
        expect.objectContaining({ video: expect.objectContaining({ deviceId: { exact: "ft" } }) }),
      ),
    );
    await live();
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retake" }));
    await live();
    expect(screen.getByRole("button", { name: "Take photo" })).toBeTruthy();
  });
  it("explains a refused camera and offers a file instead", async () => {
    getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    devices(cameras, getUserMedia);
    const { onChooseFile, onClose } = sheet();
    expect((await screen.findByRole("alert")).textContent).toMatch(/isn’t allowed to use the camera/);
    fireEvent.click(screen.getByRole("button", { name: "Choose a file instead" }));
    expect(onChooseFile).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
  it("says when there's no camera, or it's busy", async () => {
    getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error("no"), { name: "NotFoundError" }));
    devices([], getUserMedia);
    sheet();
    expect((await screen.findByRole("alert")).textContent).toMatch(/No camera was found/);
    cleanup();
    getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error("no"), { name: "NotReadableError" }));
    devices(cameras, getUserMedia);
    sheet();
    expect((await screen.findByRole("alert")).textContent).toMatch(/used by another app/);
  });
  it("closes on Escape and turns the camera off", async () => {
    const { onClose, unmount } = sheet();
    await live();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    unmount();
    expect(tracks.at(-1)!.stop).toHaveBeenCalled();
  });
});

describe("PhotoPicker Take a photo", () => {
  const picker = () =>
    render(
      createElement(PhotoPicker, {
        photos: [],
        access: { add: vi.fn(), load: vi.fn() },
        onChange: vi.fn(),
        disabled: false,
        onBusy: vi.fn(),
      }),
    );
  const coarse = (matches: boolean) =>
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q: string) => ({ matches: matches && q.includes("coarse"), media: q }) as MediaQueryList,
    );
  it("opens the camera sheet on a computer", async () => {
    coarse(false);
    picker();
    fireEvent.click(screen.getByRole("button", { name: /Take a photo/ }));
    expect(screen.getByRole("dialog", { name: "Take a photo" })).toBeTruthy();
    await act(async () => {});
  });
  it("keeps the phone's own camera on a touch screen", () => {
    coarse(true);
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    picker();
    fireEvent.click(screen.getByRole("button", { name: /Take a photo/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(click).toHaveBeenCalled();
    expect((click.mock.contexts[0] as HTMLInputElement).getAttribute("capture")).toBe("environment");
  });
});
