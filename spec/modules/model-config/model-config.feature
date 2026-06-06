# #ModelConfig
# Zero-dependency module: resolves provider/key/model from env + stored values.
Feature: Model config

  Rule: resolveConfig defaults

    @headless
    Scenario: Empty env and empty stored yields anthropic defaults
      When resolveConfig is called with empty env and empty stored
      Then the resolved provider is "anthropic"
      And the resolved model is "claude-sonnet-4-6"
      And the resolved anthropicKey is null
      And the resolved geminiKey is null

  Rule: resolveConfig picks provider from env

    @headless
    Scenario: ANTHROPIC_API_KEY in env sets provider and key
      When resolveConfig is called with env ANTHROPIC_API_KEY="sk-ant-test"
      Then the resolved provider is "anthropic"
      And the resolved anthropicKey is "sk-ant-test"
      And the resolved geminiKey is null

    @headless
    Scenario: GEMINI_API_KEY in env sets provider and key
      When resolveConfig is called with env GEMINI_API_KEY="AIza-test"
      Then the resolved provider is "gemini"
      And the resolved geminiKey is "AIza-test"
      And the resolved anthropicKey is null

    @headless
    Scenario: Both keys in env — Gemini wins
      When resolveConfig is called with env ANTHROPIC_API_KEY="sk-ant-test" and GEMINI_API_KEY="AIza-test"
      Then the resolved provider is "gemini"
      And the resolved geminiKey is "AIza-test"
      And the resolved anthropicKey is null

  Rule: resolveConfig respects stored values

    @headless
    Scenario: Stored provider=gemini with no env key is used
      When resolveConfig is called with empty env and stored provider "gemini" and geminiKey "AIza-stored"
      Then the resolved provider is "gemini"
      And the resolved geminiKey is "AIza-stored"

    @headless
    Scenario: Env values override stored values
      When resolveConfig is called with env ANTHROPIC_API_KEY="sk-env" and stored anthropicKey "sk-stored"
      Then the resolved anthropicKey is "sk-env"

    @headless
    Scenario: TAMEDTABLE_MODEL in env overrides stored model
      When resolveConfig is called with env TAMEDTABLE_MODEL="claude-haiku-4-5" and stored model "claude-opus-4-7"
      Then the resolved model is "claude-haiku-4-5"

  Rule: providerFor

    @headless
    Scenario: providerFor returns anthropic for a claude-* id
      When providerFor is called with "claude-sonnet-4-6"
      Then the result is "anthropic"

    @headless
    Scenario: providerFor returns gemini for a gemini-* id
      When providerFor is called with "gemini-3-flash"
      Then the result is "gemini"

  Rule: defaultModel

    @headless
    Scenario: defaultModel for anthropic returns claude-sonnet-4-6
      When defaultModel is called with "anthropic"
      Then the result is "claude-sonnet-4-6"

    @headless
    Scenario: defaultModel for gemini returns gemini-3-flash
      When defaultModel is called with "gemini"
      Then the result is "gemini-3-flash"

  Rule: ALL_MODELS catalogue

    @headless
    Scenario: ALL_MODELS has at least one Anthropic and one Gemini entry
      Then ALL_MODELS contains at least one model with provider "anthropic"
      And ALL_MODELS contains at least one model with provider "gemini"
