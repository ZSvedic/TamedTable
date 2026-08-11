# #ModelConfig
# Zero-dependency module: resolves provider/key/model from env + stored values,
# detects a provider from a pasted key, and probes it for tier, cost and speed.
Feature: Model config

  Rule: detectProvider names the provider from the key's prefix

    The user never picks a provider from a list — the key they paste names it.

    @headless
    Scenario Outline: <prefix> is a <provider> key
      When detectProvider is called with "<key>"
      Then the detected provider is "<provider>"

      Examples:
        | prefix    | key                  | provider   |
        | AIza      | AIzaSyExample        | gemini     |
        | sk-proj-  | sk-proj-example      | openai     |
        | sk-ant-   | sk-ant-example       | anthropic  |
        | sk-or-    | sk-or-v1-example     | openrouter |
        | gsk_      | gsk_example          | groq       |

    @headless
    # sk-proj-, sk-ant- and sk-or- all start with sk-, so the generic OpenAI
    # rule has to be tested last or it would swallow all three.
    Scenario: A bare sk- key is OpenAI, tested after the longer prefixes
      When detectProvider is called with "sk-legacy-openai"
      Then the detected provider is "openai"

    @headless
    Scenario: Surrounding whitespace is trimmed before matching
      When detectProvider is called with "  AIzaSyExample  "
      Then the detected provider is "gemini"

    @headless
    Scenario: An unrecognised key detects no provider
      When detectProvider is called with "hello-there"
      Then no provider is detected

    @headless
    Scenario: An empty key detects no provider
      When detectProvider is called with ""
      Then no provider is detected

    @headless
    Scenario: SUPPORTED_PREFIXES lists every prefix the error message names
      Then SUPPORTED_PREFIXES is "AIza…, sk-proj-…, sk-ant-…, sk-or-…, gsk_…"

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

    @headless
    Scenario: OPENROUTER_API_KEY in env sets provider and key
      When resolveConfig is called with env OPENROUTER_API_KEY="sk-or-test"
      Then the resolved provider is "openrouter"
      And the resolved openrouterKey is "sk-or-test"
      And the resolved anthropicKey is null

    @headless
    Scenario: GROQ_API_KEY in env sets provider and key
      When resolveConfig is called with env GROQ_API_KEY="gsk_test"
      Then the resolved provider is "groq"
      And the resolved groqKey is "gsk_test"
      And the resolved model is "openai/gpt-oss-120b"
      And the resolved cellModel is "openai/gpt-oss-20b"

    # Precedence: when several provider keys are present, Gemini beats OpenAI
    # beats Anthropic beats Groq beats OpenRouter — a paid key always outranks
    # the free tier. Anthropic is present (and loses) in the first rows, so its
    # key is nulled each time. Single-key resolution is covered above.
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
        | Anthropic + Groq      | ANTHROPIC_API_KEY, GROQ_API_KEY                   | anthropic | anthropicKey |
        | Groq + OpenRouter     | GROQ_API_KEY, OPENROUTER_API_KEY                  | groq      | groqKey      |

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
    # Rule 9: the final primary model must belong to the resolved provider.
    Scenario: A cross-provider stored model is coerced to the provider default
      When resolveConfig is called with stored provider "openai" and model "claude-sonnet-4-6"
      Then the resolved model is "gpt-5.5"
      And the resolved cellModel is "gpt-5.4-mini"

    @headless
    # Rules 7 + 9: the TAMEDTABLE_MODEL env override obeys the same guard.
    Scenario: A cross-provider TAMEDTABLE_MODEL is coerced to the provider default
      When resolveConfig is called with env GEMINI_API_KEY="AIza-x" and TAMEDTABLE_MODEL="gpt-5.5"
      Then the resolved provider is "gemini"
      And the resolved model is "gemini-3.6-flash"

    @headless
    # Groq's ids carry a vendor prefix, so this guard leans on the catalogue
    # lookup rather than on a slash rule that would say "openrouter".
    Scenario: A Groq model is kept when the provider is groq
      When resolveConfig is called with stored provider "groq" and model "openai/gpt-oss-120b"
      Then the resolved model is "openai/gpt-oss-120b"

    @headless
    Scenario: A Groq model stored under openrouter is coerced to the openrouter default
      When resolveConfig is called with stored provider "openrouter" and model "openai/gpt-oss-120b"
      Then the resolved model is "cohere/north-mini-code:free"

  Rule: providerFor reads the catalogue before it reads prefixes

    @headless
    Scenario Outline: providerFor returns <provider> for "<id>"
      When providerFor is called with "<id>"
      Then the result is "<provider>"

      Examples:
        | id                                    | provider   |
        | claude-sonnet-4-6                     | anthropic  |
        | gemini-3.5-flash                      | gemini     |
        | gpt-5.4-mini                          | openai     |
        | zai-glm-4.7                           | cerebras   |
        | gpt-oss-120b                          | cerebras   |
        | qwen/qwen3-coder:free                 | openrouter |
        | meta-llama/llama-3.3-70b-instruct:free| openrouter |

    @headless
    # The catalogue-first rule: Groq's vendor-prefixed ids would otherwise land
    # on OpenRouter, and Cerebras's bare gpt-oss-120b must stay on Cerebras.
    Scenario: providerFor returns groq for a catalogued Groq id with a slash
      When providerFor is called with "openai/gpt-oss-120b"
      Then the result is "groq"

    @headless
    Scenario: providerFor returns groq for the Groq secondary default
      When providerFor is called with "openai/gpt-oss-20b"
      Then the result is "groq"

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

    @headless
    # Verified live against api.groq.com — the open-weight models still sample.
    Scenario: Groq's gpt-oss models accept temperature
      When acceptsTemperature is called with "openai/gpt-oss-120b"
      Then the boolean result is true

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

    @headless
    Scenario: keyFor returns the groq key when provider is groq
      Given a resolved config for provider "groq" with groqKey "gsk_w"
      When keyFor is called
      Then the key result is "gsk_w"

  Rule: connectedProviders lists the providers that have a key

    A connected provider is a provider with a key — connecting stores nothing
    of its own, so the card list is derived from the config.

    @headless
    Scenario: A config with no keys has no connected providers
      When resolveConfig is called with empty env and empty stored
      Then connectedProviders returns ""

    @headless
    Scenario: Two stored keys make two connected providers, in catalogue order
      Given a stored config with geminiKey "AIza-x" and groqKey "gsk_y"
      Then connectedProviders returns "gemini, groq"

    @headless
    Scenario: An empty-string key does not count as connected
      Given a stored config with geminiKey "AIza-x" and openaiKey ""
      Then connectedProviders returns "gemini"

  Rule: defaultModel

    @headless
    Scenario Outline: defaultModel for <provider>
      When defaultModel is called with "<provider>"
      Then the result is "<primary>"

      Examples:
        | provider   | primary                     |
        | anthropic  | claude-sonnet-4-6           |
        | gemini     | gemini-3.6-flash            |
        | openai     | gpt-5.5                     |
        | groq       | openai/gpt-oss-120b         |
        | openrouter | cohere/north-mini-code:free |

  Rule: defaultCellModel

    @headless
    Scenario Outline: defaultCellModel for <provider>
      When defaultCellModel is called with "<provider>"
      Then the result is "<secondary>"

      Examples:
        | provider   | secondary                   |
        | anthropic  | claude-haiku-4-5            |
        | openai     | gpt-5.4-mini                |
        | gemini     | gemini-3.1-flash-lite       |
        | groq       | openai/gpt-oss-20b          |
        | openrouter | cohere/north-mini-code:free |

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

    @headless
    Scenario: ALL_MODELS has at least one OpenAI entry
      Then ALL_MODELS contains at least one model with provider "openai"

    @headless
    Scenario: ALL_MODELS has at least one Groq entry
      Then ALL_MODELS contains at least one model with provider "groq"

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
    # Groq's chat models take text only; audio needs its Whisper endpoints.
    Scenario: openai/gpt-oss-120b has voiceInput false
      Then the model "openai/gpt-oss-120b" has voiceInput false

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
    Scenario: The Groq defaults carry their published prices
      Then the model "openai/gpt-oss-120b" costs 0.15 in and 0.6 out per Mtok
      And the model "openai/gpt-oss-20b" costs 0.075 in and 0.3 out per Mtok

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
        | gemini     | gemini-3.6-flash            | gemini-3.1-flash-lite       |
        | openai     | gpt-5.5                     | gpt-5.4-mini                |
        | anthropic  | claude-sonnet-4-6           | claude-haiku-4-5            |
        | groq       | openai/gpt-oss-120b         | openai/gpt-oss-20b          |
        | openrouter | cohere/north-mini-code:free | cohere/north-mini-code:free |

  Rule: verifyKey checks a key against the provider and reports its tier

    The gate before anything is stored. One cheap call, no retries, and a tier
    only when the provider actually reports one.

    @headless
    Scenario: A working Gemini key reports the paid tier from the response header
      Given a stub provider API that accepts the key and returns service tier "standard"
      When verifyKey is called for provider "gemini" with key "AIza-good"
      Then the verified tier is "paid"

    @headless
    Scenario: A Gemini key on the free tier reports it
      Given a stub provider API that accepts the key and returns service tier "free"
      When verifyKey is called for provider "gemini" with key "AIza-good"
      Then the verified tier is "free"

    @headless
    Scenario: OpenRouter reads its tier from the key endpoint
      Given a stub provider API that accepts the key and reports is_free_tier true
      When verifyKey is called for provider "openrouter" with key "sk-or-good"
      Then the verified tier is "free"

    @headless
    Scenario: OpenAI is always paid — it has no free tier
      Given a stub provider API that accepts the key
      When verifyKey is called for provider "openai" with key "sk-proj-good"
      Then the verified tier is "paid"

    @headless
    Scenario: Anthropic is always paid — it has no free tier
      Given a stub provider API that accepts the key
      When verifyKey is called for provider "anthropic" with key "sk-ant-good"
      Then the verified tier is "paid"

    @headless
    # Groq publishes no tier signal, so the card shows no tag rather than a guess.
    Scenario: Groq reports no tier
      Given a stub provider API that accepts the key
      When verifyKey is called for provider "groq" with key "gsk_good"
      Then the verified tier is unknown

    @headless
    Scenario: A rejected key fails with a sentence naming the provider
      Given a stub provider API that rejects the key with HTTP 401
      When verifyKey is called for provider "gemini" with key "AIza-bad"
      Then verifyKey fails with "Key rejected by Google. Check the key and try again."

    @headless
    Scenario: A rate-limited check says to wait, not to re-enter the key
      Given a stub provider API that rejects the key with HTTP 429
      When verifyKey is called for provider "openai" with key "sk-proj-x"
      Then verifyKey fails with "OpenAI rate-limited the check. Wait a minute and try again."

    @headless
    # An empty balance arrives as a 429 too, so the quota case is checked first
    # — "wait a minute" would send that user into a wait that never ends.
    Scenario: An account with no credit says so, not "wait a minute"
      Given a stub provider API that rejects the key with HTTP 429 and code "insufficient_quota"
      When verifyKey is called for provider "openai" with key "sk-proj-broke"
      Then verifyKey fails with "Your OpenAI account has no credit left. Add credit (or a billing method) and try again."

    @headless
    Scenario: An unreachable provider says so
      Given a stub provider API that cannot be reached
      When verifyKey is called for provider "groq" with key "gsk_x"
      Then verifyKey fails with "Could not reach Groq."

    @headless
    # Retries are off: a user with an empty account should not watch a spinner
    # for a minute to learn what the first response already said.
    Scenario: A failing check makes exactly one call
      Given a stub provider API that rejects the key with HTTP 401
      When verifyKey is called for provider "openai" with key "sk-proj-x"
      Then the stub provider API received 1 call

  Rule: measureModel measures speed, never price

    Price comes from the catalogue; only the seconds are measured. Timing splits
    into getting the model going and generating once started, so a small sample
    extrapolates honestly.

    @headless
    Scenario: A streaming answer splits into first-token time and a token rate
      Given a stub provider API that streams 300 output tokens, first chunk at 0.4s, last at 1.0s
      When measureModel is called for provider "groq" with model "openai/gpt-oss-120b"
      Then the measured first-token time is 0.4 seconds
      And the measured rate is 500.0 tokens per second
      And the estimated seconds for 1000 tokens is 2.4

    @headless
    # 300 tokens, all arriving at 2.8s in one frame: there is no separable
    # first-token time, so the whole call counts as generation.
    Scenario: A buffered answer falls back to a plain average
      Given a stub provider API that buffers 300 output tokens into one chunk at 2.8s
      When measureModel is called for provider "gemini" with model "gemini-3.6-flash"
      Then the measured first-token time is 0.0 seconds
      And the estimated seconds for 1000 tokens is 9.3

    @headless
    # Under a fifth of the call spent streaming is buffering by another name —
    # gemini-3.6-flash streams its thinking silently, then flushes.
    Scenario: A last-moment flush counts as buffered, not as a fast rate
      Given a stub provider API that streams 300 output tokens, first chunk at 2.77s, last at 2.79s
      When measureModel is called for provider "gemini" with model "gemini-3.6-flash"
      Then the measured first-token time is 0.0 seconds
      And the estimated seconds for 1000 tokens is 9.3

    @headless
    Scenario: A refused measurement reports the provider's message
      Given a stub provider API that rejects the key with HTTP 401
      When measureModel is called for provider "gemini" with model "gemini-3.6-flash"
      Then measureModel fails with "Key rejected by Google. Check the key and try again."

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

  Rule: storage.ts keeps measurements in their own blob

    Measurements are a display cache, not config — the engine never reads them,
    so they stay out of the blob the engine's input is built from.

    @headless
    Scenario: Probes round-trip under their own key
      Given a fake localStorage
      When writeStoredProbes is called for provider "gemini"
      Then readStoredProbes returns a measurement for "gemini"
      And the fake localStorage holds a "tamedtable.probes" blob
      And the fake localStorage has no "tamedtable.config" blob

    @headless
    Scenario: Clearing probes leaves the config blob alone
      Given a fake localStorage
      When writeStoredConfig is called with provider "gemini" and geminiKey "AIza-1"
      And writeStoredProbes is called for provider "gemini"
      And clearStoredProbes is called
      Then readStoredProbes returns nothing
      And readStoredConfig returns provider "gemini" and geminiKey "AIza-1"

  Rule: ModelChooser component

    The chooser is a pure React component, mounted on the package demo page over
    local state; these scenarios drive that page in a browser. The demo's stub
    provider accepts any key whose prefix is recognised, so no scenario here
    reaches a real API.

    @web
    Scenario: With nothing connected the chooser shows the empty row
      Given the model-config demo page
      Then the chooser shows the empty row "No provider or model added."
      And no provider card is shown

    @web
    Scenario: The Add button is disabled until a key is typed
      Given the model-config demo page
      Then the chooser's Add button is disabled
      When the user types "AIza-demo" into the key input
      Then the chooser's Add button is enabled

    @web
    Scenario: Adding a Google key connects it and makes it the default
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      Then the chooser shows a card for "gemini" named "Google API"
      And the "gemini" card is selected
      And the demo shows resolved provider "gemini"
      And the demo shows resolved geminiKey "AIza-demo"
      And the key input is empty

    @web
    Scenario: Pressing Enter in the key input adds the key
      Given the model-config demo page
      When the user types "gsk_demo" into the key input
      And the user presses Enter in the key input
      Then the chooser shows a card for "groq" named "Groq API"

    @web
    Scenario: The selected card shows its two models with measured cost and speed
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      Then the "gemini" card's primary model is "gemini-3.6-flash"
      And the "gemini" card's secondary model is "gemini-3.1-flash-lite"
      And the "gemini" card's "primary" cost line matches "$0.0015 in / $0.0075 out per 1000 tokens"
      And the "gemini" card's "primary" cost line matches "· ~"

    @web
    Scenario: An unselected card shows no model rows
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user adds the key "sk-proj-demo"
      Then the "openai" card is selected
      And the "gemini" card shows no model rows

    @web
    Scenario: Clicking a card header makes it the default
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user adds the key "sk-proj-demo"
      And the user clicks the "gemini" card
      Then the "gemini" card is selected
      And the demo shows resolved provider "gemini"
      And the demo shows resolved model "gemini-3.6-flash"
      And the demo shows resolved cellModel "gemini-3.1-flash-lite"

    @web
    Scenario: The tier tag shows only where the provider reports one
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user adds the key "gsk_demo"
      Then the "gemini" card shows the tag "PAID"
      And the "groq" card shows no tier tag

    @web
    # Driven by the catalogue's voiceInput flag, not hardcoded per provider.
    Scenario: The VOICE tag follows the primary model's audio support
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user adds the key "sk-proj-demo"
      Then the "gemini" card shows the tag "VOICE"
      And the "openai" card shows no VOICE tag

    @web
    Scenario: An unrecognised key is refused with the supported prefixes
      Given the model-config demo page
      When the user adds the key "hello-there"
      Then the chooser shows the error "Key not recognised. Supported prefixes: AIza…, sk-proj-…, sk-ant-…, sk-or-…, gsk_…."
      And no provider card is shown

    @web
    Scenario: Typing clears the error
      Given the model-config demo page
      When the user adds the key "hello-there"
      And the user types "A" into the key input
      Then the chooser shows no error

    @web
    # The card has no key field, so a user whose key expired would otherwise
    # have to delete the card to fix it.
    Scenario: Re-adding a connected provider's key replaces it in place
      Given the model-config demo page
      When the user adds the key "AIza-first"
      And the user adds the key "AIza-second"
      Then the chooser shows 1 provider card
      And the demo shows resolved geminiKey "AIza-second"
      And the chooser shows no error

    @web
    Scenario: Deleting a card removes the provider and its key
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user deletes the "gemini" card
      Then the chooser shows the empty row "No provider or model added."
      And the demo shows resolved geminiKey null

    @web
    Scenario: Deleting the default falls back to the remaining card
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user adds the key "sk-proj-demo"
      And the user deletes the "openai" card
      Then the "gemini" card is selected
      And the demo shows resolved provider "gemini"

    @web
    Scenario: Deleting a card does not also select it
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user adds the key "sk-proj-demo"
      And the user deletes the "gemini" card
      Then the "openai" card is selected

    @web
    Scenario: The refresh button re-runs that provider's measurements
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user refreshes the "gemini" card
      Then the "gemini" card's "primary" cost line matches "· ~"

    @web
    Scenario: Every card carries its own refresh and delete buttons
      Given the model-config demo page
      When the user adds the key "AIza-demo"
      And the user adds the key "gsk_demo"
      Then the "gemini" card has a refresh button
      And the "groq" card has a refresh button

    @web
    Scenario: Connected providers persist across a demo page reload
      Given the model-config demo page
      When the user adds the key "sk-ant-persist"
      And the demo page reloads
      Then the chooser shows a card for "anthropic" named "Anthropic API"
      And the demo shows resolved provider "anthropic"
      And the demo shows resolved anthropicKey "sk-ant-persist"

    @web
    Scenario: The chooser lists the providers it supports
      Given the model-config demo page
      Then the chooser's footer reads "Google / OpenAI / Anthropic / OpenRouter / Groq"

    @web
    Scenario: The chooser shows a how-to-get-a-key help link
      Given the model-config demo page
      Then the chooser shows a BYOK help link to "FAQ.html#byok" in a new tab
