# #FileIO
# Browser-safe file input/output: the FilePort dialog interface, format
# detection, codec edge cases, table fetching over HTTP, and .flow
# serialization. "\n" in quoted step arguments means a newline.
Feature: File IO package

  Rule: Format detection, the extension wins, Content-Type breaks ties

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
      When detectFormat is called with path "/download" and content type "application/octet-stream"
      Then no format is detected

    @headless
    Scenario: A .xlsx path is detected as xlsx
      When detectFormat is called with path "/q1/report.xlsx" and no content type
      Then the detected format is "xlsx"

    @headless
    Scenario: A page address with no extension served as text/html is html
      When detectFormat is called with path "/wiki/List_of_countries" and content type "text/html; charset=utf-8"
      Then the detected format is "html"

    @headless
    Scenario: A pick fragment does not hide the extension
      When detectFormat is called with path "report.xlsx#Orders" and no content type
      Then the detected format is "xlsx"

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
      Then fetchTable fails mentioning "the site blocked this browser (CORS)"
      And fetchTable fails mentioning "Save the page and open the file instead."

    @headless
    Scenario: An HTTP error reports the status
      Given a stub fetch serving "https://x.test/people.csv" with status 404 "Not Found"
      When fetchTable is called with "https://x.test/people.csv"
      Then fetchTable fails with "Fetch failed: HTTP 404 Not Found"

    @headless
    Scenario: An undetectable format is refused
      Given a stub fetch serving "https://x.test/blob" with body "xyz" and content type "application/octet-stream"
      When fetchTable is called with "https://x.test/blob"
      Then fetchTable fails with "Could not detect format. URL must end in .csv, .jsonl, .parquet, .arrow, .xlsx, or .html."

    @headless
    Scenario: A URL fragment is returned as the table pick, never sent
      Given a stub fetch serving "https://x.test/prices" with body "<table><tr><th>a</th></tr></table>" and content type "text/html"
      When fetchTable is called with "https://x.test/prices#2"
      Then the picked file is named "prices"
      And the fetched table pick is "2"

  Rule: A pick settles which of several tables loads

    # #TablePick: the one chooser every surface goes through. Candidates are
    # "Customers, Orders, Notes"; the outcome is the picked name or an error.
    @headless
    Scenario Outline: <case>
      Given a source "report.xlsx" listing the tables "<tables>"
      When chooseTable runs with the pick "<pick>"
      Then the choice is <outcome>

      Examples:
        | case                                | tables                   | pick     | outcome                                                                  |
        | One table needs no pick             | Orders                   |          | "Orders"                                                                 |
        | One table ignores a matching pick   | Orders                   | 1        | "Orders"                                                                 |
        | Several tables without a pick fail  | Customers, Orders, Notes |          | an error "report.xlsx holds 3 tables; add #<n> or #<name> to pick one:" |
        | A number picks by position          | Customers, Orders, Notes | 3        | "Notes"                                                                  |
        | A name picks case-insensitively     | Customers, Orders, Notes | orders   | "Orders"                                                                 |
        | A number out of range fails         | Customers, Orders, Notes | 4        | an error "report.xlsx: no table \"4\""                                   |
        | An unknown name fails               | Customers, Orders, Notes | Invoices | an error "report.xlsx: no table \"Invoices\""                            |
        | No table at all fails               |                          |          | an error "report.xlsx: no table found"                                   |

    @headless
    Scenario Outline: splitTableSelector takes the fragment only off a multi-table path
      When splitTableSelector is called with "<path>"
      Then the split source is "<source>" and the pick is "<pick>"

      Examples:
        | path                    | source              | pick   |
        | data/report.xlsx#Orders | data/report.xlsx    | Orders |
        | page.htm#2              | page.htm            | 2      |
        | report.xlsx             | report.xlsx         |        |
        | notes#1.csv             | notes#1.csv         |        |

  Rule: Text codecs survive messy input and say what broke

    @headless
    Scenario: A UTF-8 BOM never reaches the first column name
      When a file "people.csv" with a UTF-8 BOM and body "name,age\nAda,36" is parsed
      Then the parsed columns are "name, age"

    @headless
    Scenario: A CSV row with the wrong column count rejects the whole file
      When a file "people.csv" with body "name,age\nAda" is parsed
      Then parsing fails mentioning "Invalid Record Length"

    @headless
    Scenario: A malformed JSONL line names the file and line
      When a file "dump.jsonl" with body "{}\nnot json" is parsed
      Then parsing fails mentioning "dump.jsonl:2 malformed JSON"

  Rule: Binary codecs keep 64-bit whole numbers exact

    @headless
    Scenario: An int64 too big for a JS number survives as a string
      Given an Arrow file "big.arrow" with int64 column "id" holding "9007199254740993" and "42"
      When the Arrow file is parsed
      Then row 1 cell "id" is the string "9007199254740993"
      And row 2 cell "id" is the number 42

  Rule: Very large files warn instead of failing silently

    @headless
    Scenario: A file over 2 GB logs a size warning
      When the size guard checks a 3 GB file named "big.parquet"
      Then a console warning mentions "big.parquet is 3.0 GB"

  Rule: Only a real cancel counts as cancelled, other picker errors surface

    @headless
    Scenario: Dismissing the open dialog resolves to no file
      Given a browser open dialog that throws "AbortError"
      When pickOpen runs against that browser
      Then pickOpen resolves with no file

    @headless
    Scenario: A failing open dialog rethrows its error
      Given a browser open dialog that throws "NotAllowedError"
      When pickOpen runs against that browser
      Then pickOpen rethrows an error named "NotAllowedError"

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
