# #LlmLayer
# The runner's tolerance for imperfect model output. The LLM occasionally
# returns a patch that is *almost* well-formed, a stray escape, a near-miss
# encoding, and the runner repairs the recoverable cases rather than dead-end.
# Regression scenarios (tagged @regression) collect concrete model slips that
# once broke a real flow; see spec/behavior.md § Headless and
# spec/code-contract.md § Headless ("apply_spec_patch").
Feature: Resilience to imperfect model output

  Rule: A patch value the model JSON-encoded with a stray escape still applies

    # PR: the "Fix the capitalization of names" clean-up tour broke because the
    # recorded patch value embedded `'O\'BRIEN' → 'O\'Brien'`: `\'` is not a
    # valid JSON escape, so JSON.parse failed, the value was left a raw string,
    # the transformation failed schema validation, and the recovery retry hit an
    # unrecorded request ("no recording for this request"). The runner now
    # repairs invalid escapes before giving up.
    @headless @offline @regression
    Scenario: A mutate value with an invalid JSON escape decodes and applies
      Given a patch that adds a mutate whose JSON-encoded value contains an invalid backslash escape
      When the runner decodes and applies that patch
      Then the patch applies and the spec gains one mutate transformation

  Rule: A patch that only declares a column is sent back

    # Seen live on OpenRouter's free tier: "Add country column" came back as
    # a bare `columns` entry with no transformation writing it, a committed
    # silent no-op. The runner now rejects it into the recovery loop, and
    # the retry carries the computing step.
    @headless @scripted
    Scenario: A declared-but-unwritten column is rejected into the recovery loop
      Given load "customers-input.csv"
      And a request whose first patch only declares the new column
      When the spec patch is applied
      Then the recovery loop receives a declared-but-unwritten rejection
      And the corrected retry computes column "CountryCode"
