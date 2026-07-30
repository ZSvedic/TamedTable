# #TutorialMode
# The "Validate" showcase tour — one order sheet runs four semantic checks in a
# row: fake emails, impossible birth dates, city/country mismatches, and
# implausible prices. Each validate names its own flag pair (Email_ok,
# DOB_ok, …), so the four audits stack — by the end the sheet carries all four
# verdicts side by side (see validate.feature). Key-free @tour deep-linked from
# the homepage; replays from showcase-validate.json. Atomic scenarios stay in
# validate.feature.
Feature: Validate showcase tour

  Rule: One order sheet stacks four audits

    @web @tour @cat-validate
    Scenario: Audit an order sheet
      Given the TamedTable web app
      And load "showcase-validate-input.csv"
      When query "flag emails that look fake"
      Then no toast is shown
      And column "Email_ok" is immediately right of "Email" in the spec
      And rows where "Email" is "bill.gates@microsoft.com" have "Email_ok" equal to false
      And rows where "Email" is "asdf@asdf.com" have "Email_ok" equal to false
      And rows where "Email" is "ana@acme.io" have "Email_ok" equal to true
      When query "flag any impossible birth date, like Feb 30th or year 1873"
      Then no toast is shown
      And rows where "DOB" is "1873-01-01" have "DOB_ok" equal to false
      And rows where "DOB" is "2024-02-30" have "DOB_ok" equal to false
      And rows where "DOB" is "1990-05-12" have "DOB_ok" equal to true
      When query "check the city matches the country"
      Then no toast is shown
      And rows where "City" is "Paris" have "City_Country_ok" equal to false
      And rows where "City" is "Kyoto" have "City_Country_ok" equal to true
      When query "flag prices that seem wrong"
      Then no toast is shown
      And rows where "Item" is "Desk lamp" have "Price_ok" equal to false
      And rows where "Item" is "Standing desk" have "Price_ok" equal to true
      And columns exist in the spec: "Email_ok", "DOB_ok", "City_Country_ok", "Price_ok"
      And rows where "Email" is "bill.gates@microsoft.com" have "Email_ok" equal to false
