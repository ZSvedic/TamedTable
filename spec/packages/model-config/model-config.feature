# #ModelConfig
# Zero-dependency module: resolves provider/key/model from env + stored values.
Feature: Model config

  Rule: resolveConfig defaults

    @headless
    Scenario: Empty env and empty stored yields gemini defaults
      When resolveConfig is called with empty env and empty stored
      Then the resolved provider is "gemini"
      And the resolved model is "gemini-3.6-flash"
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

    Scenario: OPENROUTER_API_KEY in env sets provider and key
      When resolveConfig is called with env OPENROUTER_API_KEY="sk-or-test"
      Then the resolved provider is "openrouter"
      And the resolved openrouterKey is "sk-or-test"
      And the resolved anthropicKey is null

    # Precedence: when several provider keys are present, Gemini beats OpenAI
    # beats Anthropic beats OpenRouter — a paid key always outranks the free
    # tier. Anthropic is present (and loses) in the first rows, so its key
    # is nulled each time. Single-key resolution is covered by the scenarios above.
    @headless
    Scenario Outline: <present> in env — <winner> wins
      When resolveConfig is called with env keys "<keys>"
      Then the resolved provider is "<winner>"
      And the resolved <winnerKey> is set

      Examples:
        | present               | keys                                              | winner    | winnerKey    |
        | Anthropic + Gemini    | ANTHROPIC_API_KEY, GEMINI_API_KEY                 | gemini    | geminiKey    |
        | All three paid        | ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY | gemini    | geminiKey    |
        | Anthropic + OpenAI    | ANTHROPIC_API_KEY, OPENAI_API_KEY                 | openai    | openaiKey    |
        | Anthropic + OpenRouter| ANTHROPIC_API_KEY, OPENROUTER_API_KEY             | anthropic | anthropicKey |
        | OpenAI + OpenRouter   | OPENAI_API_KEY, OPENROUTER_API_KEY                | openai    | openaiKey    |

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

    @headless
    # Rule 7: the final primary model must belong to the resolved provider.
    Scenario: A cross-provider stored model is coerced to the provider default
      When resolveConfig is called with stored provider "openai" and model "claude-sonnet-4-6"
      Then the resolved model is "gpt-5.5"
      And the resolved cellModel is "gpt-5.4-mini"

    @headless
    # Rules 5 + 7: the TAMEDTABLE_MODEL env override obeys the same provider guard.
    Scenario: A cross-provider TAMEDTABLE_MODEL is coerced to the provider default
      When resolveConfig is called with env GEMINI_API_KEY="AIza-x" and TAMEDTABLE_MODEL="gpt-5.5"
      Then the resolved provider is "gemini"
      And the resolved model is "gemini-3.6-flash"

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

    @headless
    Scenario: providerFor returns cerebras for a zai-* id
      When providerFor is called with "zai-glm-4.7"
      Then the result is "cerebras"

    @headless
    # gpt-oss- must be checked before gpt-, else these ids would land on openai.
    Scenario: providerFor returns cerebras for a gpt-oss-* id
      When providerFor is called with "gpt-oss-120b"
      Then the result is "cerebras"

    @headless
    # Every OpenRouter id is vendor-prefixed with a slash; no other provider's ids contain one.
    Scenario: providerFor returns openrouter for a vendor/model id
      When providerFor is called with "qwen/qwen3-coder:free"
      Then the result is "openrouter"

    @headless
    Scenario: providerFor returns openrouter even when the vendor segment looks like another provider
      When providerFor is called with "meta-llama/llama-3.3-70b-instruct:free"
      Then the result is "openrouter"

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

    @headless
    Scenario: keyFor returns the openrouter key when provider is openrouter
      Given a resolved config for provider "openrouter" with openrouterKey "sk-or-w"
      When keyFor is called
      Then the key result is "sk-or-w"

  Rule: defaultModel

    @headless
    Scenario: defaultModel for anthropic returns claude-sonnet-4-6
      When defaultModel is called with "anthropic"
      Then the result is "claude-sonnet-4-6"

    @headless
    Scenario: defaultModel for puter returns gemini-3.6-flash
      When defaultModel is called with "puter"
      Then the result is "gemini-3.6-flash"

    Scenario: defaultModel for gemini returns gemini-3.6-flash
      When defaultModel is called with "gemini"
      Then the result is "gemini-3.6-flash"

    @headless
    Scenario: defaultModel for openai returns gpt-5.5
      When defaultModel is called with "openai"
      Then the result is "gpt-5.5"

    @headless
    # The free tier: one model fills both roles, so primary = the north-mini pick.
    Scenario: defaultModel for openrouter returns the free north-mini pick
      When defaultModel is called with "openrouter"
      Then the result is "cohere/north-mini-code:free"

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
    Scenario: defaultCellModel for puter returns gemini-3.1-flash-lite
      When defaultCellModel is called with "puter"
      Then the result is "gemini-3.1-flash-lite"

    Scenario: defaultCellModel for gemini returns gemini-3.1-flash-lite
      When defaultCellModel is called with "gemini"
      Then the result is "gemini-3.1-flash-lite"

    @headless
    Scenario: defaultCellModel for openrouter returns the same free north-mini pick
      When defaultCellModel is called with "openrouter"
      Then the result is "cohere/north-mini-code:free"

  Rule: defaultBatchSize pins the benchmarked cell batch

    The 2026-07-17 free-model benchmark measured north-mini at 96% accuracy at
    batch 5 and sharply worse at 40+; openrouter is the only provider with a pin.

    @headless
    Scenario: defaultBatchSize for openrouter returns 5
      When defaultBatchSize is called with "openrouter"
      Then the numeric result is 5

    @headless
    Scenario: defaultBatchSize for gemini is undefined
      When defaultBatchSize is called with "gemini"
      Then the numeric result is undefined

  Rule: ALL_MODELS catalogue

    @headless
    Scenario: ALL_MODELS has at least one Anthropic and one Gemini entry
      Then ALL_MODELS contains at least one model with provider "anthropic"
      And ALL_MODELS contains at least one model with provider "gemini"
      And ALL_MODELS contains at least one model with provider "puter"

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
    Scenario: gemini-3.6-flash has voiceInput true
      Then the model "gemini-3.6-flash" has voiceInput true

    @headless
    Scenario: gemini-3.5-flash has voiceInput true
      Then the model "gemini-3.5-flash" has voiceInput true

    @headless
    # voiceInput mirrors benchmarks/models.jsonl audioInput: flash-lite has none.
    Scenario: gemini-3.1-flash-lite has voiceInput false
      Then the model "gemini-3.1-flash-lite" has voiceInput false

    @headless
    # Membership rule: the catalogue equals models.jsonl minus runnable:false.
    Scenario: The catalogue carries every runnable benchmark model
      Then ALL_MODELS contains the model "gemini-2.5-flash"
      And ALL_MODELS contains the model "claude-fable-5"
      And ALL_MODELS does not contain the model "gpt-5.5-pro"

    @headless
    Scenario: Every catalogue entry carries per-Mtok prices
      Then every ALL_MODELS entry has inUsdPerMtok and outUsdPerMtok prices

    @headless
    Scenario: gemini-3.6-flash is priced 1.5 in and 7.5 out
      Then the model "gemini-3.6-flash" costs 1.5 in and 7.5 out per Mtok

    @headless
    Scenario: gemini-3.5-flash is priced 1.5 in and 9 out
      Then the model "gemini-3.5-flash" costs 1.5 in and 9 out per Mtok

    @headless
    # The free tier's single catalogue entry: $0 both ways, no voice.
    Scenario: The openrouter catalogue entry is the free north-mini pick
      Then ALL_MODELS contains the model "cohere/north-mini-code:free"
      And the model "cohere/north-mini-code:free" has voiceInput false
      And the model "cohere/north-mini-code:free" costs 0 in and 0 out per Mtok

  Rule: DEFAULTS names each provider's two roles

    @headless
    Scenario Outline: DEFAULTS for <provider>
      Then DEFAULTS names the <provider> primary "<primary>" and secondary "<secondary>"

      Examples:
        | provider   | primary                     | secondary                   |
        | puter      | gemini-3.6-flash            | gemini-3.1-flash-lite       |
        | gemini     | gemini-3.6-flash            | gemini-3.1-flash-lite       |
        | openai     | gpt-5.5                     | gpt-5.4-mini                |
        | anthropic  | claude-sonnet-4-6           | claude-haiku-4-5            |
        | openrouter | cohere/north-mini-code:free | cohere/north-mini-code:free |

  Rule: storage.ts persists config in localStorage

    The storage entry point implements StoragePort over localStorage under the
    single key "tamedtable.config"; helpers are safe no-ops without localStorage.

    @headless
    Scenario: writeStoredConfig round-trips through readStoredConfig
      Given a fake localStorage
      When writeStoredConfig is called with provider "anthropic" and anthropicKey "sk-ant-1"
      Then readStoredConfig returns provider "anthropic" and anthropicKey "sk-ant-1"
      And the fake localStorage holds a "tamedtable.config" blob

    @headless
    Scenario: clearStoredConfig removes the blob
      Given a fake localStorage
      When writeStoredConfig is called with provider "anthropic" and anthropicKey "sk-ant-1"
      And clearStoredConfig is called
      Then readStoredConfig returns an empty config
      And the fake localStorage has no "tamedtable.config" blob

    @headless
    Scenario: A legacy tamedtable.apiKey value migrates to anthropicKey on first read
      Given a fake localStorage where "tamedtable.apiKey" is "sk-legacy"
      When readStoredConfig is called
      Then readStoredConfig returns anthropicKey "sk-legacy"
      And the fake localStorage has no "tamedtable.apiKey" entry

    @headless
    Scenario: Without localStorage the helpers are safe no-ops
      Given no localStorage is available
      Then readStoredConfig returns an empty config
      And writeStoredConfig and clearStoredConfig do not throw

  Rule: ModelChooser component

    The provider accordion is a pure React component, mounted on the package
    demo page over local state; these scenarios drive that page in a browser.

    @web
    Scenario: The demo defaults to Google
      Given the model-config demo page
      Then the demo shows resolved provider "gemini"

    @web
    Scenario: Clicking a provider card expands it and selects the provider
      Given the model-config demo page
      When the user clicks the "Puter.js" provider card
      Then the "puter" card shows a "☁ Sign in / Register" button
      And the demo shows resolved provider "puter"

    @web
    Scenario: Puter appears before Google in the chooser
      Given the model-config demo page
      Then the "Puter.js" provider card appears before the "Google" provider card

    @web
    Scenario: Clicking Google selects the Google provider
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
      When the user clicks the "Puter.js" provider card
      Then the demo shows resolved model "gemini-3.6-flash"
      And the demo shows resolved cellModel "gemini-3.1-flash-lite"

    @web
    Scenario: The expanded card shows its two default models read-only
      Given the model-config demo page
      When the user clicks the "OpenAI" provider card
      Then the "openai" card's primary default is "gpt-5.5"
      And the "openai" card's secondary default is "gpt-5.4-mini"

    @web
    Scenario: Each default row shows its per-Mtok price
      Given the model-config demo page
      When the user clicks the "Puter.js" provider card
      Then the "primary" default row shows the price "$1.5 in / $7.5 out"
      And the "secondary" default row shows the price "$0.25 in / $1.5 out"

    @web
    Scenario: Puter signs in instead of asking for an API key
      Given the model-config demo page
      When the user clicks the "Puter.js" provider card
      Then the "puter" card shows a "☁ Sign in / Register" button
      And the "puter" card shows a Test button
      And the "puter" card does not show an API-key field

    @web
    Scenario: Google still asks for an API key
      Given the model-config demo page
      When the user clicks the "Google" provider card
      Then the "gemini" card shows the env hint "or set GEMINI_API_KEY in .env"

    @web
    Scenario: Each expanded card deep-links to that provider's key page
      Given the model-config demo page
      When the user clicks the "Puter.js" provider card
      Then the "puter" card's Get-API-key link opens "https://developer.puter.com/ai/google/" in a new tab
      When the user clicks the "Google" provider card
      Then the "gemini" card's Get-API-key link opens "https://aistudio.google.com/apikey" in a new tab
      When the user clicks the "OpenAI" provider card
      Then the "openai" card's Get-API-key link opens "https://platform.openai.com/api-keys" in a new tab
      When the user clicks the "Anthropic" provider card
      Then the "anthropic" card's Get-API-key link opens "https://console.anthropic.com/settings/keys" in a new tab
      When the user clicks the "OpenRouter" provider card
      Then the "openrouter" card's Get-API-key link opens "https://openrouter.ai/settings/keys" in a new tab

    @web
    # The free tier: one $0 model fills both roles.
    Scenario: Selecting OpenRouter pins the free model in both roles
      Given the model-config demo page
      When the user clicks the "OpenRouter" provider card
      Then the demo shows resolved provider "openrouter"
      And the demo shows resolved model "cohere/north-mini-code:free"
      And the demo shows resolved cellModel "cohere/north-mini-code:free"
      And the "primary" default row shows the price "$0 in / $0 out"

    @web
    Scenario: The OpenRouter card shows its env-var hint
      Given the model-config demo page
      When the user clicks the "OpenRouter" provider card
      Then the "openrouter" card shows the env hint "or set OPENROUTER_API_KEY in .env"

    @web
    Scenario: The chooser shows a general how-to-get-a-key help link
      Given the model-config demo page
      Then the chooser shows a BYOK help link to "BYOK-setup.html" in a new tab

    @web
    Scenario: The chooser links to the FAQ on changing the default models
      Given the model-config demo page
      Then the chooser shows a change-models help link to "FAQ.html#change-models" in a new tab

    @web
    Scenario: A typed key persists across a demo page reload
      Given the model-config demo page
      When the user clicks the "Anthropic" provider card
      And the user types "sk-ant-persist" into the "anthropic" key field
      And the demo page reloads
      Then the demo shows resolved provider "anthropic"
      And the demo shows resolved anthropicKey "sk-ant-persist"

    @web
    Scenario: A typed API key stays masked until the eye toggle reveals it
      Given the model-config demo page
      When the user clicks the "Anthropic" provider card
      And the user types "sk-ant-demo" into the "anthropic" key field
      Then the "anthropic" key field hides its value
      And the demo shows resolved anthropicKey "sk-ant-demo"
      When the user clicks the "anthropic" key reveal toggle
      Then the "anthropic" key field shows "sk-ant-demo"
