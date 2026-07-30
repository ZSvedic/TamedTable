Feature: Red bug inventory — CLI / REPL (RED-CLI)

  Each scenario documents one confirmed open defect in the CLI REPL and fails
  by design. The assertion message leads with the RED-CLI id and the spec line
  the behavior violates. Step definitions live in src/tests/red/red-cli.steps.ts
  and are self-contained (own runCli invocation, injected fetch, no surface
  hooks). RED-CLI-1, RED-CLI-7, and RED-CLI-8 are unit red tests under
  src/tests/red/*.red.test.ts (run via `bun run test:red:unit`).

  @red @cli
  Scenario: RED-CLI-3: a mistyped colon command is forwarded to the model instead of failing locally
    When the red CLI REPL runs "customers-input.csv" offline with commands:
      """
      :frobnicate
      :exit
      """
    Then RED-CLI-3: no model call was attempted for the unknown colon command

  @red @cli
  Scenario: RED-CLI-4: :undo of the last NL turn silently reverts a later :reorder
    When the red CLI REPL replays cassette "repl-commands" over "customers-input.csv" with commands:
      """
      Normalize country names
      :reorder Phone
      :undo
      :schema
      exit
      """
    Then RED-CLI-4: the column order set by :reorder survives :undo of the earlier NL turn

  @red @cli
  Scenario: RED-CLI-5: :reorder resets the viewport cursor though it is not a reset event
    When the red CLI REPL runs "customers-input.csv" offline with commands:
      """
      :show rows next
      :reorder Country
      :exit
      """
    Then RED-CLI-5: the reprint after :reorder still shows the second row page

  @red @cli
  Scenario: RED-CLI-6: the :find highlight is cleared by a bare :show reprint
    When the red CLI REPL runs "customers-input.csv" offline with commands:
      """
      :find USA
      :show
      :exit
      """
    Then RED-CLI-6: the reprint after bare :show still wraps the match in asterisks
