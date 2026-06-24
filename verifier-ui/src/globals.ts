// Browser polyfills the Midnight.js stack expects. Must be imported FIRST,
// before any @midnight-ntwrk module, so `Buffer`/`process` exist on globalThis.
import { Buffer } from 'buffer';

const g = globalThis as unknown as {
  process?: { env: Record<string, string | undefined> };
  Buffer?: typeof Buffer;
};

// Some third-party libraries read process.env.NODE_ENV in the browser.
g.process = g.process ?? { env: { NODE_ENV: import.meta.env.MODE } };

// The Midnight serialization paths use Buffer.
g.Buffer = g.Buffer ?? Buffer;
