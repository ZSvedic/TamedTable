# #LlmLayer
# The runner's tolerance for imperfect model output. The LLM occasionally
# returns a patch that is *almost* well-formed — a stray escape, a near-miss
# encoding — and the runner repairs the recoverable cases rather than dead-end.
# Regression scenarios (tagged @regression) collect concrete model slips that
# once broke a real flow; see spec/behavior.md § Headless and
# spec/code-contract.md § Headless ("apply_spec_patch").
Feature: Resilience to imperfect model output

  Rule: A patch value the model JSON-encoded with a stray escape still applies

    # PR: the "Fix the capitalization of names" clean-up tour broke because the
    # recorded patch value embedded `'O\'BRIEN' → 'O\'Brien'` — `\'` is not a
    # valid JSON escape, so JSON.parse failed, the value was left a raw string,
    # the transformation failed schema validation, and the recovery retry hit an
    # unrecorded request ("no recording for this request"). The runner now
    # repairs invalid escapes before giving up.
    @headless @offline @regression
    Scenario: A mutate value with an invalid JSON escape decodes and applies
      Given a patch that adds a mutate whose JSON-encoded value contains an invalid backslash escape
      When the runner decodes and applies that patch
      Then the patch applies and the spec gains one mutate transformation
