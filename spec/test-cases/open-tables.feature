# #TablePick
# Opening a workbook (.xlsx) or a web page (.html) through the same dispatch
# as CSV: one table loads at once, several ask for a pick (`#<n>` / `#<name>`
# on the path, the table picker in the web app), none fails. All offline.
# Fixtures: open-tables-input.xlsx holds Customers (a plain block), Orders (an
# Excel table object under a title row), Notes (a one-column block), and an
# empty sheet that lists nothing; open-tables-input.html holds a captioned
# table, an id-only table, and a bare one.
Feature: Open a workbook or a web page

  Rule: One table loads without asking

    @headless @cli @web
    Scenario: A one-sheet workbook loads like a CSV
      Given load "customers-input.xlsx"
      Then the table has 20 data rows
      And columns exist in the spec: "ID", "Country", "Phone"

    @web
    Scenario: A one-sheet workbook never raises the table picker
      Given the TamedTable web app
      And load "customers-input.xlsx"
      Then no table picker is shown
      And the table has 20 rows

  Rule: A fragment on the path picks one of several tables

    @headless @cli @web
    Scenario: Picking a sheet by name loads that sheet's table
      Given load "open-tables-input.xlsx#Orders"
      Then the table has 5 data rows
      And columns exist in the spec: "OrderID", "Customer", "Amount", "Date"
      And cell "Amount" of row 1 is the number 120.5
      And cell "Date" of row 1 is "2026-01-15"
      And cell "Date" of row 3 is "2026-02-02T09:30:00"

    @headless @cli
    Scenario: Picking a table by number is the same pick
      Given load "open-tables-input.xlsx#2"
      Then the table has 5 data rows
      And cell "Customer" of row 2 is "Jane Smith"

    @headless @cli @web
    Scenario: A page table picked by number loads with its header row
      Given load "open-tables-input.html#2"
      Then the table has 4 data rows
      And columns exist in the spec: "Item", "Price"
      And cell "Item" of row 1 is "Bread & butter"
      And cell "Item" of row 3 is "Eggs (dozen)"
      And cell "Item" of row 4 is "Total"

    @headless @cli
    Scenario: A page table picked by its caption loads the captioned table
      Given load "open-tables-input.html#countries"
      Then the table has 4 data rows
      And cell "Capital" of row 3 is "Brasília"

  Rule: A title above the table is not the header

    # A sheet that opens with a title line ("Q1 Sales Report" in A1, then a
    # blank row) still loads the header under it, not the title and a row of
    # ghost column2, column3 … names (behavior.md § Opening a workbook or a
    # web page). Sheet "Summary" merges its title across the whole table.
    @headless @cli @web
    Scenario: A sheet with a title row loads the real header
      Given load "sales-title-row.xlsx#Sales"
      Then the table has 2 data rows
      And columns exist in the spec: "Region", "Rep", "Units", "Price", "Total"
      And cell "Rep" of row 1 is "Ada"
      And columns are absent from the current rows: "column2", "column3"

    @headless @cli
    Scenario: A title merged across the table is skipped too
      Given load "sales-title-row.xlsx#Summary"
      Then the table has 2 data rows
      And columns exist in the spec: "Region", "Total"

    @headless @cli
    Scenario: The listed range starts at the header, not the title
      When loading "sales-title-row.xlsx" is attempted
      Then the load fails mentioning "1. Sales (Sales!A3:E5): 2 rows: Region, Rep, Units, Price, Total"
      And the load fails mentioning "2. Summary (Summary!A2:B4): 2 rows: Region, Total"

  Rule: Without a pick, several tables fail with the list; none fails plainly

    @headless @cli
    Scenario: A workbook with several tables lists them and asks for a pick
      When loading "open-tables-input.xlsx" is attempted
      Then the load fails mentioning "open-tables-input.xlsx holds 3 tables; add #<n> or #<name> to pick one:"
      And the load fails mentioning "1. Customers (Customers!A1:F21): 20 rows: ID, FirstName, LastName, DOB, Country, Phone"
      And the load fails mentioning "2. Orders (Orders!B3:E8): 5 rows: OrderID, Customer, Amount, Date"
      And the load fails mentioning "3. Notes (Notes!A1:A3): 2 rows: Quarterly report"

    @headless @cli
    Scenario: A pick that names no table fails with the same list
      When loading "open-tables-input.xlsx#Invoices" is attempted
      Then the load fails mentioning "open-tables-input.xlsx: no table \"Invoices\""
      And the load fails mentioning "2. Orders (Orders!B3:E8)"

    @headless @cli
    Scenario: A page lists its tables by caption, id, and number
      When loading "open-tables-input.html" is attempted
      Then the load fails mentioning "open-tables-input.html holds 3 tables"
      And the load fails mentioning "1. Countries (table 1 of 3): 4 rows: Country, Capital, Population"
      And the load fails mentioning "2. prices (table 2 of 3): 4 rows: Item, Price"
      And the load fails mentioning "3. Table 3 (table 3 of 3): 2 rows: Name, Role"

    @headless @cli
    Scenario: A page without a table fails plainly
      When loading "open-tables-none.html" is attempted
      Then the load fails mentioning "open-tables-none.html: no table found"

  Rule: The REPL's :load and :save follow the same rules

    @cli @offline
    Scenario: :load lists the tables, then loads the picked one
      When user enters the REPL with "customers-input.csv" and types:
        """
        :load open-tables-input.xlsx
        :load open-tables-input.xlsx#Orders
        :save ../temp/orders.html
        :save ../temp/orders.xlsx
        exit
        """
      Then REPL exit code is 0
      And REPL stdout contains "open-tables-input.xlsx holds 3 tables; add #<n> or #<name> to pick one:"
      And REPL stdout contains "Loaded open-tables-input.xlsx#Orders (5 rows, 4 cols)"
      And REPL stdout contains ":save: cannot save as HTML: load-only format"
      And REPL stdout contains "saved 5 rows to ../temp/orders.xlsx"
      And "../temp/orders.xlsx" exists

  Rule: The web app asks with the table picker

    @web
    Scenario: Opening a multi-table workbook raises the picker, and a pick loads that table
      Given the TamedTable web app
      When user says "Load CSV file"
      And user selects "open-tables-input.xlsx"
      Then the table picker lists "Customers, Orders, Notes"
      And the table picker is for "open-tables-input.xlsx"
      When user picks the table "Orders"
      Then no table picker is shown
      And the table has 5 rows
      And the table columns are "OrderID,Customer,Amount,Date"
      And the chat shows an assistant message "Loaded open-tables-input.xlsx: 5 rows, 4 columns."

    @web
    Scenario: Cancelling the picker keeps the current table
      Given the TamedTable web app
      And load "filter-input.csv"
      When user drops the file "open-tables-input.xlsx" onto the table
      And user confirms replacing the table
      Then the table picker lists "Customers, Orders, Notes"
      When user cancels the table picker
      Then no table picker is shown
      And the table has 10 rows
      And no toast is shown

    @web
    Scenario: A page URL served as text/html raises the picker
      Given the TamedTable web app
      And the URL "https://example.com/report" serves "open-tables-input.html"
      When user loads from URL "https://example.com/report"
      Then the table picker lists "Countries, prices, Table 3"
      When user picks the table "Countries"
      Then the table has 4 rows
      And the table columns are "Country,Capital,Population"

    @web
    Scenario: A URL fragment picks the table and skips the picker
      Given the TamedTable web app
      And the URL "https://example.com/report" serves "open-tables-input.html"
      When user loads from URL "https://example.com/report#prices"
      Then no table picker is shown
      And the table columns are "Item,Price"
      And the table has 4 rows

    @web
    Scenario: A page without a table fails inside the URL dialog
      Given the TamedTable web app
      And the URL "https://example.com/about" serves "open-tables-none.html"
      When user tries to load URL "https://example.com/about"
      Then loading fails with "about: no table found"

    @web
    Scenario: Save XLSX writes a one-sheet workbook the app reloads without a pick
      Given the TamedTable web app
      And load "customers-input.csv"
      When user says "Save as XLSX"
      Then display Save File dialog
      And the suggested save name ends with ".xlsx"
      When user saves as "customers.xlsx"
      Then a toast shows "Saved customers.xlsx"
      And the saved "customers.xlsx" reloads as one table with 20 rows
