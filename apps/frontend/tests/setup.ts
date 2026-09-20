import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one to mount.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = StubResizeObserver;

// jsdom has no WebSocket implementation; stub a minimal inert one so
// components using useLiveSocket() can mount in unit/integration tests
// without throwing. Individual tests never assert on socket behavior.
class StubWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close() {
    this.onclose?.();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = StubWebSocket;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
