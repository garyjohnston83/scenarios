// Polyfill TextEncoder/TextDecoder for jsdom environment (required by react-router-dom v7)
/* eslint-disable @typescript-eslint/no-require-imports */
const { TextEncoder, TextDecoder } = require('util');

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}
