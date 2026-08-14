// Preloaded before every `bun test` file (bunfig.toml [test] preload). It lives
// at the src root, beside the bunfig that names it, and NOT under tests/:
// cucumber imports `tests/**/!(*.test).ts` into every profile, and lifting the
// cap there would disarm the limiter on live record runs too.
//
// The unit suite makes no network call: every model turn is a fake `fetch`
// injected through HeadlessRunnerOptions, so the engine's requests-per-minute
// limiter can only add idle delay here. It is process-wide and seeded at module
// load, so once a run crosses the default 40 calls/minute it stalls whatever
// test comes next into its timeout, however offline that test is. Lift the cap,
// exactly as cucumber.js does for cassette replay.
//
// `??=`, not `=`: a test that deliberately runs under a specific value (the
// TAMEDTABLE_RPM=0 misconfiguration in headless/request-settle.test.ts) sets it
// in its own environment and must keep it.
process.env.TAMEDTABLE_RPM ??= String(Number.MAX_SAFE_INTEGER);
