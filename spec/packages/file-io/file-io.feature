# #FileIO
# Browser-safe file input/output: the FilePort dialog interface, format
# detection, table fetching over HTTP, and .flow serialization. "\n" in
# quoted step arguments means a newline.
Feature: File IO package

  Rule: Format detection — the extension wins, Content-Type breaks ties

    @headless
    Scenario: A .csv path is detected as csv even against a contradicting header
      When detectFormat is called with path "/data/people.csv" and content type "application/json"
      Then the detected format is "csv"

    @headless
    Scenario: A .ndjson path is detected as jsonl
      When detectFormat is called with path "/dump.ndjson" and no content type
      Then the detected format is "jsonl"

    @headless
    Scenario: Content-Type decides when the path has no table extension
      When detectFormat is called with path "/download" and content type "text/csv; charset=utf-8"
      Then the detected format is "csv"

    @headless
    Scenario: No extension and no useful Content-Type means no format
      When detectFormat is called with path "/download" and content type "text/html"
      Then no format is detected

  Rule: File names derive from the URL's last path segment

    @headless
    Scenario: The last path segment becomes the name
      When sampleNameFromUrl is called with "https://x.test/data/people.csv" and format "csv"
      Then the derived name is "people.csv"

    @headless
    Scenario: A URL without a path segment falls back to download.<format>
      When sampleNameFromUrl is called with "https://x.test/" and format "jsonl"
      Then the derived name is "download.jsonl"

  Rule: fetchTable validates before it fetches and explains every failure

    @headless
    Scenario: A fetched CSV comes back as a named picked file
      Given a stub fetch serving "https://x.test/people.csv" with body "name\nAda" and content type "text/csv"
      When fetchTable is called with "https://x.test/people.csv"
      Then the picked file is named "people.csv"
      And the picked file text is "name\nAda"

    @headless
    Scenario: Blank input asks for a URL
      When fetchTable is called with "   "
      Then fetchTable fails with "Enter a URL."

    @headless
    Scenario: Garbage input is rejected as not a URL
      When fetchTable is called with "not a url"
      Then fetchTable fails with "That doesn’t look like a valid URL."

    @headless
    Scenario: Non-http protocols are rejected
      When fetchTable is called with "ftp://x.test/data.csv"
      Then fetchTable fails with "Only http:// and https:// URLs are supported."

    @headless
    Scenario: A network failure is rewritten to an actionable message
      Given a stub fetch that fails with "Failed to fetch"
      When fetchTable is called with "https://x.test/people.csv"
      Then fetchTable fails mentioning "network error or CORS blocked"

    @headless
    Scenario: An HTTP error reports the status
      Given a stub fetch serving "https://x.test/people.csv" with status 404 "Not Found"
      When fetchTable is called with "https://x.test/people.csv"
      Then fetchTable fails with "Fetch failed: HTTP 404 Not Found"

    @headless
    Scenario: An undetectable format is refused
      Given a stub fetch serving "https://x.test/page" with body "<html>" and content type "text/html"
      When fetchTable is called with "https://x.test/page"
      Then fetchTable fails with "Could not detect format. URL must end in .csv, .jsonl, .parquet, or .arrow."

  Rule: A .flow file is the replayable spec plus its source name

    @headless
    Scenario: serializeFlow wraps the spec with version and source
      Given a spec for table "data/people.csv" with columns "name, age"
      When serializeFlow is called
      Then the flow JSON has version 2
      And the flow JSON has source "people.csv"
      And the flow JSON spec has columns "name, age"

    @headless
    Scenario: A spec with no table falls back to input.csv
      Given a spec with no table and columns "name"
      When serializeFlow is called
      Then the flow JSON has source "input.csv"

  Rule: The demo page exercises the API in a real browser

    @web
    Scenario: Fetching a CSV URL fills the preview
      Given the file-io demo page
      And the demo network serves "https://demo.test/people.csv" with body "name,age\nAda,36" and content type "text/csv"
      When the user fetches "https://demo.test/people.csv" in the demo
      Then the demo shows file name "people.csv"
      And the demo shows format "csv"
      And the demo preview contains "Ada"

    @web
    Scenario: Content-Type rescues an extension-less URL
      Given the file-io demo page
      And the demo network serves "https://demo.test/export" with body "name\nAda" and content type "text/csv"
      When the user fetches "https://demo.test/export" in the demo
      Then the demo shows file name "export"
      And the demo shows format "csv"

    @web
    Scenario: A failed fetch shows the error inline
      Given the file-io demo page
      And the demo network serves "https://demo.test/missing.csv" with status 404
      When the user fetches "https://demo.test/missing.csv" in the demo
      Then the demo shows an error mentioning "HTTP 404"

    @web
    Scenario: The demo reports the browser's file dialog capability
      Given the file-io demo page
      Then the demo capability line reports the File System Access API
