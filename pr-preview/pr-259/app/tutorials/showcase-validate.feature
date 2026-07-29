# #TutorialMode
# The "Validate" showcase tour — one order sheet runs four semantic checks in a
# row: fake emails, impossible birth dates, city/country mismatches, and
# implausible prices. Each validate replaces the previous _valid/_validation
# flags (see validate.feature), so the story reads as four independent audits
# of the same sheet. Key-free @tour deep-linked from the homepage; replays from
# showcase-validate.json. Atomic scenarios stay in validate.feature.
Feature: Validate showcase tour

  Rule: One order sheet survives four audits

    @web @tour @cat-validate
    Scenario: Audit an order sheet
      Given the TamedTable web app
      And load "showcase-validate-input.csv"
      When query "flag emails that look fake"
      Then no toast is shown
      And rows where "Email" is "bill.gates@microsoft.com" have _valid equal to false
      And rows where "Email" is "asdf@asdf.com" have _valid equal to false
      And rows where "Email" is "ana@acme.io" have _valid equal to true
      When query "flag any impossible birth date, like Feb 30th or year 1873"
      Then no toast is shown
      And rows where "DOB" is "1873-01-01" have _valid equal to false
      And rows where "DOB" is "2024-02-30" have _valid equal to false
      And rows where "DOB" is "1990-05-12" have _valid equal to true
      When query "check the city matches the country"
      Then no toast is shown
      And rows where "City" is "Paris" have _valid equal to false
      And rows where "City" is "Kyoto" have _valid equal to true
      When query "flag prices that seem wrong"
      Then no toast is shown
      And rows where "Item" is "Desk lamp" have _valid equal to false
      And rows where "Item" is "Standing desk" have _valid equal to true
