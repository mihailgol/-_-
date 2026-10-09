import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost:8000",
});

Object.defineProperty(globalThis, "localStorage", {
  value: dom.window.localStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "sessionStorage", {
  value: dom.window.sessionStorage,
  writable: true,
  configurable: true,
});
