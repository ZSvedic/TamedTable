# #ReplCmds
Feature: REPL commands

  The commands the REPL handles locally without any LLM round-trip
  (`:` prefix because `/` is intercepted by Claude Code and other CLI agents):
  state/data ops (:undo, :redo, :history, :load, :save, :save-flow),
  view/nav (:show, :find), and inspection/session (:schema, :help, :exit).

  @cli @offline
  Scenario: :help prints the REPL usage screen and omits CLI batch flags
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
    And REPL stdout does not contain "execute"
    And REPL stdout does not contain "--input"
    And REPL stdout does not contain "--output"

  @cli @offline
  Scenario Outline: <cmd> closes the REPL with code 0
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      <cmd>
      """
    Then REPL exit code is 0

    Examples:
      | cmd   |
      | exit  |
      | :exit |

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
    When user enters the REPL with "customers-input.csv" and types:
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
    When user enters the REPL with "customers-input.csv" and types:
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
    When user enters the REPL with "customers-input.csv" and types:
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
    When user enters the REPL with "customers-input.csv" and types:
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
    When user enters the REPL with "customers-input.csv" and types:
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
    When user enters the REPL with "customers-input.csv" and types:
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
    When user enters the REPL with "customers-input.csv" and types:
      """
      :show rows end
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Saudi Arabia"

  @cli @offline
  Scenario: :show rows N snaps to the page containing row N
    When user enters the REPL with "customers-input.csv" and types:
      """
      :show rows 15
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Rossi"
    And the last REPL table reprint contains "...10 more rows."

  @cli @offline
  Scenario: :show rows N clamps when N is out of range
    When user enters the REPL with "customers-input.csv" and types:
      """
      :show rows 9999
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Saudi Arabia"

  @cli @offline
  Scenario: :show cols next advances the column window and shows the left marker
    When user enters the REPL with "customers-input.csv" and types:
      """
      :show cols next
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "Phone"
    And the last REPL table reprint contains "...5 more cols."
    And the last REPL table reprint does not contain "FirstName"

  @cli @offline
  Scenario: :find matches by substring and regex, and reports misses and missing args
    When user enters the REPL with "customers-input.csv" and types:
      """
      :find canada
      :find /\+44/
      :find xyzzy-no-such-thing
      :find
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "*Canada*"
    And REPL stdout contains "*+44*"
    And REPL stdout contains "no match"
    And REPL stdout contains ":find: missing pattern"

  @cli
  Scenario: viewport resets to (0,0) after a committed NL request
    When user enters the REPL with "customers-input.csv" and types:
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
    When user enters the REPL with "customers-input.csv" and types:
      """
      :show rows end
      :load customers-input.csv
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "D. Doe"
    And the last REPL table reprint does not contain "Saudi Arabia"

  @cli @offline
  Scenario: :load reports a missing path, an unknown extension, and a successful load
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :load
      :load notes.txt
      :load customers-input.csv
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":load: missing path"
    And REPL stdout contains ":load: unknown file type"
    And REPL stdout contains "Loaded customers-input.csv (20 rows, 6 cols)"

  @cli @offline
  Scenario: :show and :find do not enter the patch journal
    When user enters the REPL with "customers-input.csv" and types:
      """
      :show rows next
      :find canada
      :history
      exit
      """
    Then REPL exit code is 0
    And the :history output lists no turns

  @cli @offline
  Scenario: :save and :save-flow report missing paths and write their files
    When user enters the REPL with "dedupe-input.csv" and types:
      """
      :save
      :save ../temp/repl-save-output.jsonl
      :save-flow
      :save-flow ../temp/repl-save-flow-output.flow
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":save: missing path"
    And REPL stdout contains "saved"
    And "../temp/repl-save-output.jsonl" exists
    And REPL stdout contains ":save-flow: missing path"
    And REPL stdout contains "saved flow"
    And "../temp/repl-save-flow-output.flow" exists

  @cli @offline
  Scenario: bare :viewport prints current page size and source
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "viewport:"
    And REPL stdout contains "rows (auto)"
    And REPL stdout contains "cols (auto)"

  @cli @offline
  Scenario: :viewport with explicit rows and cols shrinks the page
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport 5 3
      exit
      """
    Then REPL exit code is 0
    And the last REPL table reprint contains "...15 more rows."
    And the last REPL table reprint contains "...3 more cols."

  @cli @offline
  Scenario: :viewport pins only rows when cols is auto
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport 5 auto
      :viewport
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "5 rows (manual)"
    And REPL stdout contains "cols (auto)"

  @cli @offline
  Scenario: :viewport pins only cols when rows is auto
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport auto 3
      :viewport
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "rows (auto)"
    And REPL stdout contains "3 cols (manual)"

  @cli @offline
  Scenario: :viewport auto clears prior pins on both axes
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport 5 3
      :viewport auto
      :viewport
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "rows (auto)"
    And REPL stdout contains "cols (auto)"

  @cli @offline
  Scenario: :viewport pins survive :load and viewport-cursor resets
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport 5 3
      :load customers-input.csv
      :viewport
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains "5 rows (manual)"
    And REPL stdout contains "3 cols (manual)"

  @cli @offline
  Scenario: :viewport with a non-positive integer prints invalid size
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport 0 3
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":viewport: invalid size"

  @cli @offline
  Scenario: :viewport with malformed args prints usage
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport foo
      exit
      """
    Then REPL exit code is 0
    And REPL stdout contains ":viewport: usage:"

  @cli @offline
  Scenario: :viewport does not enter the patch journal
    When user enters the REPL with "customers-input.csv" and types:
      """
      :viewport 5 3
      :viewport auto
      :history
      exit
      """
    Then REPL exit code is 0
    And the :history output lists no turns
