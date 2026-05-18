Feature: REPL commands

  The commands the REPL handles locally without any LLM round-trip
  (`:` prefix because `/` is intercepted by Claude Code and other CLI agents):
  state/data ops (:undo, :redo, :history, :load, :save, :save-flow),
  view/nav (:show, :find), and inspection/session (:schema, :help, :exit).

  @cli @offline
  Scenario: :help echoes the pinned usage screen in-session
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :help
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "TamedTable"
    And REPL stdout contains ":undo"
    And REPL stdout contains ":redo"
    And REPL stdout contains ":show"
    And REPL stdout contains ":find"
    And REPL stdout contains ":schema"
    And REPL stdout contains "ANTHROPIC_API_KEY"

  @cli @offline
  Scenario: exit closes the REPL with code 0
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      exit
      """
    Then REPL exit code is 0

  @cli @offline
  Scenario: :exit closes the REPL with code 0
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :exit
      """
    Then REPL exit code is 0

  @cli @offline
  Scenario: :undo on a freshly loaded CSV says nothing to undo
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :undo
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "nothing to undo."

  @cli @offline
  Scenario: :redo on an empty redo stack says nothing to redo
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :redo
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "nothing to redo."

  @cli
  Scenario: :undo then :redo restores the committed state
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      Normalize country names
      :undo
      :redo
      exit
      """
    Then REPL exit code is 0
    And column "Country" was normalized in the final state

  @cli
  Scenario: a new NL request clears the redo stack
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      Normalize country names
      :undo
      Normalize phone numbers
      :redo
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "nothing to redo."

  @cli
  Scenario: :history lists turns with their commit status
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      Normalize country names
      :undo
      :history
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "1. Normalize country names"
    And REPL stdout contains "[undone]"

  @cli @offline
  Scenario: :schema prints one line per column
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :schema
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "ID"
    And REPL stdout contains "FirstName"
    And REPL stdout contains "LastName"
    And REPL stdout contains "DOB"
    And REPL stdout contains "Country"
    And REPL stdout contains "Phone"

  @cli @offline
  Scenario: bare :show reprints the current viewport
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "D. Doe"
    And the last REPL table reprint contains "Taylor"
    And the last REPL table reprint does not contain "Anderson"

  @cli @offline
  Scenario: :show rows next advances by one page and shows the top marker
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show rows next
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Anderson"
    And the last REPL table reprint contains "Saudi Arabia"
    And the last REPL table reprint contains "...10 more rows."
    And the last REPL table reprint does not contain "D. Doe"

  @cli @offline
  Scenario: :show rows end jumps to the last page
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show rows end
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Saudi Arabia"

  @cli @offline
  Scenario: :show rows N snaps to the page containing row N
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show rows 15
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Rossi"
    And the last REPL table reprint contains "...10 more rows."

  @cli @offline
  Scenario: :show rows N clamps when N is out of range
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show rows 9999
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Saudi Arabia"

  @cli @offline
  Scenario: :show cols next advances the column window and shows the left marker
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show cols next
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Phone"
    And the last REPL table reprint contains "...5 more cols."
    And the last REPL table reprint does not contain "FirstName"

  @cli @offline
  Scenario: :find substring matches case-insensitively and wraps the match
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :find canada
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "*Canada*"

  @cli @offline
  Scenario: :find /regex/ matches by pattern
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :find /\+44/
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "*+44*"

  @cli @offline
  Scenario: :find with no match prints no match and does not reprint
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :find xyzzy-no-such-thing
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "no match"

  @cli @offline
  Scenario: :find with no argument prints usage
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :find
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":find: missing pattern"

  @cli
  Scenario: viewport resets to (0,0) after a committed NL request
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show rows end
      Normalize country names
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "D. Doe"
    And the last REPL table reprint does not contain "Saudi Arabia"

  @cli @offline
  Scenario: viewport resets to (0,0) after :load
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show rows end
      :load datanorm-input.csv
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "D. Doe"
    And the last REPL table reprint does not contain "Saudi Arabia"

  @cli @offline
  Scenario: :load without a path prints usage
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :load
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":load: missing path"

  @cli @offline
  Scenario: :load with an unknown extension prints unknown file type
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :load notes.txt
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":load: unknown file type"

  @cli @offline
  Scenario: :load success prints row/col counts
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :load datanorm-input.csv
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "Loaded datanorm-input.csv (20 rows, 6 cols)"

  @cli @offline
  Scenario: :show and :find do not enter the patch journal
    When user enters the REPL with "datanorm-input.csv" and types:
      """
      :show rows next
      :find canada
      :history
      exit
      """
    Then REPL exit code is 0
    And the :history output lists no turns

  @cli @offline
  Scenario: :save without a path prints usage
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :save
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":save: missing path"

  @cli @offline
  Scenario: :save writes current rows to a JSONL file
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :save ../temp/repl-save-output.jsonl
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "saved"
    And "../temp/repl-save-output.jsonl" exists

  @cli @offline
  Scenario: :save-flow without a path prints usage
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :save-flow
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":save-flow: missing path"

  @cli @offline
  Scenario: :save-flow writes a replayable flow file
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :save-flow ../temp/repl-save-flow-output.flow
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "saved flow"
    And "../temp/repl-save-flow-output.flow" exists
