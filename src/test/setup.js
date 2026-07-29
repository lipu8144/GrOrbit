import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom lacks these — stub so components/canvas/share code don't crash in tests
beforeEach(() => { if (typeof localStorage !== "undefined") localStorage.clear(); });
afterEach(() => { cleanup(); });

if (typeof HTMLCanvasElement !== "undefined" && !HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, drawImage() {}, fillStyle: "" });
}
if (typeof HTMLCanvasElement !== "undefined") HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new Blob()); };
if (typeof window !== "undefined" && !window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
if (typeof navigator !== "undefined" && !navigator.clipboard) Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(() => Promise.resolve()) }, configurable: true });
