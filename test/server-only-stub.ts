// Vitest stub for the `server-only` package. In the real app `server-only`
// throws if a Server-Component module is imported into a Client bundle; under
// the Node test runner there is no such boundary, so we alias it to this no-op
// (see vitest.config.mts) to allow unit-testing server-only modules directly.
export {};
