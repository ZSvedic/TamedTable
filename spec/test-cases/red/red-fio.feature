Feature: File-io red findings (bug inventory — every scenario fails by design)

  Each scenario documents one confirmed open defect on a file-io load/save
  path, named by its RED-FIO id. Codec-level file-io defects that no surface
  step can reach live in src/packages/file-io/red-findings.red.test.ts
  (run via `bun run test:red:unit`).

  @red @web
  Scenario: RED-FIO-1: extension-less URL with a valid Content-Type cannot load
    Given a red web session whose fetch serves CSV as "text/csv" at "https://api.example.com/export"
    When the user loads that extension-less URL into the web app
    Then the Content-Type fallback loads the table with columns "a,b"

  @red @headless
  Scenario: RED-FIO-7: CSV export header ignores the column label
    Given a red headless session whose first column carries the label "Full name"
    When the session exports the table to a temporary CSV file
    Then the exported CSV header row is "Full name,age"
