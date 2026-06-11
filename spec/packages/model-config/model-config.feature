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
      And the resolved openaiKey is null

  Rule: resolveConfig picks provider from env

    @headless
    Scenario: ANTHROPIC_API_KEY in env sets provider and key
      When resolveConfig is called with env ANTHROPIC_API_KEY="sk-ant-test"
      Then the resolved provider is "anthropic"
      And the resolved anthropicKey is "sk-ant-test"
      And the resolved geminiKey is null
      And the resolved openaiKey is null

    @headless
    Scenario: GEMINI_API_KEY in env sets provider and key
      When resolveConfig is called with env GEMINI_API_KEY="AIza-test"
      Then the resolved provider is "gemini"
      And the resolved geminiKey is "AIza-test"
      And the resolved anthropicKey is null
      And the resolved openaiKey is null

    @headless
    Scenario: OPENAI_API_KEY in env sets provider and key
      When resolveConfig is called with env OPENAI_API_KEY="sk-openai-test"
      Then the resolved provider is "openai"
      And the resolved openaiKey is "sk-openai-test"
      And the resolved anthropicKey is null
      And the resolved geminiKey is null

    @headless
    Scenario: Both keys in env — Gemini wins
      When resolveConfig is called with env ANTHROPIC_API_KEY="sk-ant-test" and GEMINI_API_KEY="AIza-test"
      Then the resolved provider is "gemini"
      And the resolved geminiKey is "AIza-test"
      And the resolved anthropicKey is null

    @headless
    Scenario: All three keys in env — Gemini wins
      When resolveConfig is called with env ANTHROPIC_API_KEY="sk-ant-test" and GEMINI_API_KEY="AIza-test" and OPENAI_API_KEY="sk-openai-test"
      Then the resolved provider is "gemini"
      And the resolved geminiKey is "AIza-test"

    @headless
    Scenario: ANTHROPIC_API_KEY and OPENAI_API_KEY in env — OpenAI wins
      When resolveConfig is called with env ANTHROPIC_API_KEY="sk-ant-test" and OPENAI_API_KEY="sk-openai-test"
      Then the resolved provider is "openai"
      And the resolved openaiKey is "sk-openai-test"

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

    @headless
    Scenario: providerFor returns openai for a gpt-* id
      When providerFor is called with "gpt-4o-audio-preview"
      Then the result is "openai"

  Rule: defaultModel

    @headless
    Scenario: defaultModel for anthropic returns claude-sonnet-4-6
      When defaultModel is called with "anthropic"
      Then the result is "claude-sonnet-4-6"

    @headless
    Scenario: defaultModel for gemini returns gemini-3.5-flash
      When defaultModel is called with "gemini"
      Then the result is "gemini-3.5-flash"

    @headless
    Scenario: defaultModel for openai returns gpt-4o
      When defaultModel is called with "openai"
      Then the result is "gpt-4o"

  Rule: ALL_MODELS catalogue

    @headless
    Scenario: ALL_MODELS has at least one Anthropic and one Gemini entry
      Then ALL_MODELS contains at least one model with provider "anthropic"
      And ALL_MODELS contains at least one model with provider "gemini"

    @headless
    Scenario: ALL_MODELS has at least one OpenAI entry
      Then ALL_MODELS contains at least one model with provider "openai"

    @headless
    Scenario: ALL_MODELS entries each have a voiceInput boolean
      Then every ALL_MODELS entry has a voiceInput boolean field

    @headless
    Scenario: gpt-4o-audio-preview has voiceInput true
      Then the model "gpt-4o-audio-preview" has voiceInput true

    @headless
    Scenario: gpt-4o has voiceInput false
      Then the model "gpt-4o" has voiceInput false

    @headless
    Scenario: claude-sonnet-4-6 has voiceInput false
      Then the model "claude-sonnet-4-6" has voiceInput false

    @headless
    Scenario: gemini-3.5-flash has voiceInput true
      Then the model "gemini-3.5-flash" has voiceInput true

  Rule: ModelChooser component

    The provider accordion is a pure React component, mounted on the package
    demo page over local state; these scenarios drive that page in a browser.

    @web
    Scenario: Clicking a provider card expands it and selects the provider
      Given the model-config demo page
      When the user clicks the "Google" provider card
      Then the "gemini" card shows its API-key field and model list
      And the demo shows resolved provider "gemini"

    @web
    Scenario: Clicking the expanded card collapses it without changing the provider
      Given the model-config demo page
      When the user clicks the "Google" provider card
      And the user clicks the "Google" provider card
      Then no card shows an API-key field
      And the demo shows resolved provider "gemini"

    @web
    Scenario: Picking a model updates the resolved config
      Given the model-config demo page
      When the user clicks the "Google" provider card
      And the user picks the model "gemini-2.5-pro"
      Then the demo shows resolved model "gemini-2.5-pro"

    @web
    Scenario: A typed API key stays masked until the eye toggle reveals it
      Given the model-config demo page
      When the user clicks the "Anthropic" provider card
      And the user types "sk-ant-demo" into the "anthropic" key field
      Then the "anthropic" key field hides its value
      And the demo shows resolved anthropicKey "sk-ant-demo"
      When the user clicks the "anthropic" key reveal toggle
      Then the "anthropic" key field shows "sk-ant-demo"
