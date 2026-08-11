@model-config
Feature: Model configuration

  Rule: Config resolves six providers

    @headless
    Scenario: Empty config keeps the cassette-safe Google default
      When resolveConfig is called with empty env and empty stored
      Then the resolved provider is "gemini"
      And the resolved model is "gemini-3.6-flash"

    @headless
    Scenario Outline: A key prefix chooses only its validator
      When provider detection examines "<key>"
      Then the detected provider is "<provider>"

      Examples:
        | key          | provider   |
        | AIza-demo    | gemini     |
        | sk-proj-demo | openai     |
        | sk-ant-demo  | anthropic  |
        | sk-or-demo   | openrouter |
        | gsk_demo     | groq       |

    @headless
    Scenario Outline: Defaults name both roles
      Then DEFAULTS names the <provider> primary "<primary>" and secondary "<secondary>"

      Examples:
        | provider | primary                    | secondary                    |
        | gemini   | gemini-3.6-flash           | gemini-3.1-flash-lite        |
        | groq     | groq/openai/gpt-oss-120b   | groq/llama-3.1-8b-instant    |
        | puter    | puter/gemini-2.5-flash     | puter/gemini-2.5-flash-lite  |

  Rule: Storage stays local

    @headless
    Scenario: writeStoredConfig round-trips through readStoredConfig
      Given a fake localStorage
      When writeStoredConfig is called with provider "anthropic" and anthropicKey "sk-ant-1"
      Then readStoredConfig returns provider "anthropic" and anthropicKey "sk-ant-1"
      And the fake localStorage holds a "tamedtable.config" blob

  Rule: The chooser starts paste-first

    @web
    Scenario: No connection shows the empty state and both ways to connect
      Given the model-config demo page
      Then the chooser says "No provider or model added."
      And the chooser offers one API key field
      And the chooser offers Puter.js sign in
