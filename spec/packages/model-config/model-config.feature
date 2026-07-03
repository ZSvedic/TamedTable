# #ModelConfig
# Zero-dependency module: resolves provider/key/model from env + stored values.
Feature: Model config

  Rule: resolveConfig defaults

    @headless
    Scenario: Empty env and empty stored yields gemini defaults
      When resolveConfig is called with empty env and empty stored
      Then the resolved provider is "gemini"
      And the resolved model is "gemini-3.5-flash"
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

    # Precedence: when several provider keys are present, Gemini beats OpenAI
    # beats Anthropic. Anthropic is present (and loses) in every row, so its key
    # is nulled each time. Single-key resolution is covered by the scenarios above.
    @headless
    Scenario Outline: <present> in env — <winner> wins over Anthropic
      When resolveConfig is called with env keys "<keys>"
      Then the resolved provider is "<winner>"
      And the resolved <winnerKey> is set
      And the resolved anthropicKey is null

      Examples:
        | present            | keys                                              | winner | winnerKey |
        | Anthropic + Gemini | ANTHROPIC_API_KEY, GEMINI_API_KEY                 | gemini | geminiKey |
        | All three          | ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY | gemini | geminiKey |
        | Anthropic + OpenAI | ANTHROPIC_API_KEY, OPENAI_API_KEY                 | openai | openaiKey |

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
      When resolveConfig is called with env TAMEDTABLE_MODEL="gemini-3.1-flash-lite" and stored model "gemini-3.5-flash"
      Then the resolved model is "gemini-3.1-flash-lite"

  Rule: resolveConfig resolves the secondary (cell) model

    @headless
    Scenario: Empty config yields the provider's cell default
      When resolveConfig is called with empty env and empty stored
      Then the resolved cellModel is "gemini-3.1-flash-lite"

    @headless
    Scenario: TAMEDTABLE_CELL_MODEL in env overrides stored cellModel
      When resolveConfig is called with env TAMEDTABLE_CELL_MODEL="gemini-3.5-flash" and stored cellModel "gemini-3.1-flash-lite"
      Then the resolved cellModel is "gemini-3.5-flash"

    @headless
    Scenario: A cross-provider stored cellModel is coerced to the provider cell default
      When resolveConfig is called with stored provider "openai" and cellModel "claude-haiku-4-5"
      Then the resolved cellModel is "gpt-5.4-mini"

  Rule: providerFor

    @headless
    Scenario: providerFor returns anthropic for a claude-* id
      When providerFor is called with "claude-sonnet-4-6"
      Then the result is "anthropic"

    @headless
    Scenario: providerFor returns gemini for a gemini-* id
      When providerFor is called with "gemini-3.5-flash"
      Then the result is "gemini"

    @headless
    Scenario: providerFor returns openai for a gpt-* id
      When providerFor is called with "gpt-5.4-mini"
      Then the result is "openai"

  Rule: acceptsTemperature

    @headless
    Scenario: An older Sonnet still accepts temperature
      When acceptsTemperature is called with "claude-sonnet-4-6"
      Then the boolean result is true

    @headless
    Scenario: Gemini models accept temperature
      When acceptsTemperature is called with "gemini-3.5-flash"
      Then the boolean result is true

    @headless
    Scenario: Opus 4.8 rejects temperature
      When acceptsTemperature is called with "claude-opus-4-8"
      Then the boolean result is false

    @headless
    Scenario: GPT-5.5 rejects temperature
      When acceptsTemperature is called with "gpt-5.5"
      Then the boolean result is false

    @headless
    Scenario: An unknown future model defaults to no temperature
      When acceptsTemperature is called with "claude-sonnet-5"
      Then the boolean result is false

  Rule: keyFor returns the active provider's key

    @headless
    Scenario: keyFor returns the anthropic key when provider is anthropic
      Given a resolved config for provider "anthropic" with keys anthropic "sk-ant-x", gemini "AIza-y", openai "sk-openai-z"
      When keyFor is called
      Then the key result is "sk-ant-x"

    @headless
    Scenario: keyFor returns the gemini key when provider is gemini
      Given a resolved config for provider "gemini" with keys anthropic "sk-ant-x", gemini "AIza-y", openai "sk-openai-z"
      When keyFor is called
      Then the key result is "AIza-y"

    @headless
    Scenario: keyFor returns the openai key when provider is openai
      Given a resolved config for provider "openai" with keys anthropic "sk-ant-x", gemini "AIza-y", openai "sk-openai-z"
      When keyFor is called
      Then the key result is "sk-openai-z"

    @headless
    Scenario: keyFor returns null when the active provider's key is unset
      Given a resolved config for provider "openai" with keys anthropic "sk-ant-x", gemini "", openai ""
      When keyFor is called
      Then the key result is null

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
    Scenario: defaultModel for openai returns gpt-5.5
      When defaultModel is called with "openai"
      Then the result is "gpt-5.5"

  Rule: defaultCellModel

    @headless
    Scenario: defaultCellModel for anthropic returns claude-haiku-4-5
      When defaultCellModel is called with "anthropic"
      Then the result is "claude-haiku-4-5"

    @headless
    Scenario: defaultCellModel for openai returns gpt-5.4-mini
      When defaultCellModel is called with "openai"
      Then the result is "gpt-5.4-mini"

    @headless
    Scenario: defaultCellModel for gemini returns gemini-3.1-flash-lite
      When defaultCellModel is called with "gemini"
      Then the result is "gemini-3.1-flash-lite"

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
    Scenario: gpt-5.5 has voiceInput false
      Then the model "gpt-5.5" has voiceInput false

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
    Scenario: Selecting a provider pins its default primary and secondary models
      Given the model-config demo page
      When the user clicks the "Google" provider card
      Then the demo shows resolved model "gemini-3.5-flash"
      And the demo shows resolved cellModel "gemini-3.1-flash-lite"

    @web
    Scenario: The expanded card shows its two default models read-only
      Given the model-config demo page
      When the user clicks the "OpenAI" provider card
      Then the "openai" card's primary default is "gpt-5.5"
      And the "openai" card's secondary default is "gpt-5.4-mini"

    @web
    Scenario: Each expanded card deep-links to that provider's key page
      Given the model-config demo page
      When the user clicks the "Google" provider card
      Then the "gemini" card's Get-API-key link opens "https://aistudio.google.com/apikey" in a new tab
      When the user clicks the "OpenAI" provider card
      Then the "openai" card's Get-API-key link opens "https://platform.openai.com/api-keys" in a new tab
      When the user clicks the "Anthropic" provider card
      Then the "anthropic" card's Get-API-key link opens "https://console.anthropic.com/settings/keys" in a new tab

    @web
    Scenario: The chooser shows a general how-to-get-a-key help link
      Given the model-config demo page
      Then the chooser shows a BYOK help link to "BYOK-setup.html" in a new tab

    @web
    Scenario: The chooser links to the FAQ on changing the default models
      Given the model-config demo page
      Then the chooser shows a change-models help link to "FAQ.html#change-models" in a new tab

    @web
    Scenario: A typed API key stays masked until the eye toggle reveals it
      Given the model-config demo page
      When the user clicks the "Anthropic" provider card
      And the user types "sk-ant-demo" into the "anthropic" key field
      Then the "anthropic" key field hides its value
      And the demo shows resolved anthropicKey "sk-ant-demo"
      When the user clicks the "anthropic" key reveal toggle
      Then the "anthropic" key field shows "sk-ant-demo"
