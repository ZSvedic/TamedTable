# #Analyze
# Questions about the data (behavior.md § Questions about the data): a
# question gets an answer computed by SQL over the current rows, and the
# table stays as it is. A request that names a change stays a step. Every
# assertion below is structural or grounded in the fixture (customers-input.csv
# has 3 USA rows, the clear maximum), never a wording golden. Model calls
# replay from cassettes/analyze.json.
Feature: Questions about the data

  Rule: A question gets a computed answer and the table stays as it is

    Background:
      Given load "customers-input.csv"

    @headless @cli @web
    Scenario: Which country has the most customers
      When query "Which country has the most customers?"
      Then the request was answered, not applied
      And no transformation was added
      And the answer mentions "USA"
      And the answer's result table has a "Country" column

    # The boundary: an imperative that names a table shape is a step even
    # though it sounds analytical. The golden lives in aggregate.feature.
    @headless
    Scenario: "Count customers per Country" is still a transformation
      When query "Count customers per Country"
      Then the request was applied, not answered
      And transformation 1 is a "group"

    # The tester's "hello": neither a change nor a question. Before this
    # feature the model was forced to patch and produced a no-op mutate.
    @headless @web
    Scenario: A greeting changes nothing
      When query "hello"
      Then the request was answered, not applied
      And no transformation was added
      And the answer is at most 3 sentences

  Rule: The last answer carries into the next request

    @headless @cli @web
    Scenario: A follow-up step can refer to the answer
      Given load "customers-input.csv"
      When query "Which country has the most customers?"
      And query "Keep only the customers from that country"
      Then the request was applied, not answered
      And the current rows count is 3
      And every remaining row has Country "USA"

  Rule: A change comes back with a one-sentence summary

    @headless @cli @web
    Scenario: The reply explains the step in plain words
      Given load "customers-input.csv"
      When query "Show only customers in the USA"
      Then the request was applied, not answered
      And the reply carries a one-sentence summary

    # A change plus a question in one message: the answer would depend on
    # the changed data, so the change lands and the summary names the
    # question instead of dropping it.
    @headless @cli @web
    Scenario: A mixed message applies the change and names the deferred question
      Given load "customers-input.csv"
      When query "Normalize the Country names. Which country has the most customers?"
      Then the request was applied, not answered
      And transformation 1 is a "mutate"
      And the summary mentions "Which country has the most customers?"

  Rule: The model fixes its own SQL inside the step budget

    # Scripted: the fetch layer answers the model calls locally, so the
    # first query is a guaranteed parse error and the retry a known
    # query. No cassette, no key.
    @headless @scripted-answer
    Scenario: A broken query is retried and the answer still lands
      Given a scripted model that first sends a broken query
      And load "customers-input.csv"
      When query "Which country has the most customers?"
      Then the request was answered, not applied
      And the answer mentions "USA"
      And the model ran 2 queries, the first of which failed

    @headless @scripted-answer
    Scenario: A model that never replies fails cleanly
      Given a scripted model that only ever queries
      And load "customers-input.csv"
      When query "Which country has the most customers?"
      Then the request fails with an error containing "answer budget exhausted"
      And no transformation was added

  Rule: The REPL prints the answer and leaves the journal alone

    @cli
    Scenario: An answered question adds nothing to undo
      When user enters the REPL with "customers-input.csv" and types:
        """
        Which country has the most customers?
        :undo
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "USA"
      And REPL stdout contains "[debug] query:"
      And REPL stdout contains "nothing to undo."

  Rule: The web reply is an answer with a result table and no history entry

    @web
    Scenario: The chat shows the answer and the table it came from
      Given the TamedTable web app
      And the provider "gemini" has API key "AIza-example-key"
      And load "customers-input.csv"
      When user sends the chat message "Which country has the most customers?"
      Then the chat shows an answer mentioning "USA"
      And the answer message shows a result table with the column "Country"
      And the answer message lists its query in the request detail
      And the history timeline shows 0 entries
      And the spec has 0 transformations
      And no toast is shown

    # The chips open the conversation; an answered question opens it too.
    @web
    Scenario: An answered question clears the suggestion chips
      Given the TamedTable web app
      And load suggestions are on
      And the provider "gemini" has API key "AIza-example-key"
      And load "customers-input.csv"
      Then between 2 and 4 suggestion chips are shown
      When user sends the chat message "Which country has the most customers?"
      Then the chat shows an answer mentioning "USA"
      And no suggestion chips are shown

    # The phone has no reply bubble: a change's summary rides the answer
    # strip instead.
    @web
    Scenario: The phone strip carries the summary of a change
      Given the TamedTable web app
      And the provider "gemini" has API key "AIza-example-key"
      And load "customers-input.csv"
      When user sends the chat message "Normalize the Country names. Which country has the most customers?"
      Then the phone strip shows "Which country has the most customers?"

  Rule: An answer never spends AI calls on pending rows

    # paginate-input.csv holds 246 rows; page 1 evaluates 100 of them. The
    # question computes over what is evaluated and asks for nothing more.
    @web
    Scenario: A question over a half-evaluated column runs no cells
      Given the TamedTable web app
      And load "paginate-input.csv"
      And load the file in original order
      When query "add a Segment column: consumer or business"
      Then the evaluated-rows readout shows "100 of 246 rows evaluated"
      When user sends the chat message "How many business customers are there?"
      Then the chat shows an answer
      And the evaluated-rows readout shows "100 of 246 rows evaluated"
      And no estimate dialog is shown
