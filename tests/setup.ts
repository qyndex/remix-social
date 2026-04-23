// Global test setup for Remix Social unit tests
// Runs before each test file via vitest setupFiles

// Node 18+ has globalThis.crypto — nothing extra needed for crypto.randomUUID().
// This file is the place to add global mocks / polyfills as the app grows.

// Reset module state between test files so in-memory stores don't bleed across suites.
// Individual test files that mutate POSTS/LIKES should do their own beforeEach resets
// by re-importing the module fresh via vi.resetModules() + dynamic import.
