// @vitest-environment node
// Proves the printed QR actually works: generate → decode → must equal the menu URL.
import { describe, it, expect } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const roundtrip = async (url) => {
  const buf = await QRCode.toBuffer(url, { width: 300, margin: 2 });
  const png = PNG.sync.read(buf);
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
};

describe("QR codes are real and scannable", () => {
  it("main menu QR decodes to the menu URL", async () => {
    const url = "https://grorbit.app/r/spice-junction";
    expect(await roundtrip(url)).toBe(url);
  });
  it("location QR keeps its ?src= attribution tag", async () => {
    const url = "https://grorbit.app/r/spice-junction?src=counter";
    expect(await roundtrip(url)).toBe(url);
  });
});
