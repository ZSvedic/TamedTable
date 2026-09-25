# How well do chat hosts work with tables on their own?

Zel tested T1 and T2 (first part). See the screenshots in [this dir](.).

## What Zel tested

**T1. See and edit.** Attach `customers-input.csv`. Say “Show me this table.” Then “Sort the table by country.” Then “Rename the Phone column to Phone number.” If possible, click to change one cell. Otherwise say “Set the country of customer I003 to United Kingdom.” Ask “What is the country of customer I003?” Note whether the table is live, whether you can inspect every row and whether edits persist.

**T2. Clean.** In a new chat with `customers-input.csv`, say these one at a time: “normalize the phone numbers”; “make the country names consistent”; “fix the capitalization of names”; “clean up the birth dates”. Export the final CSV and compare it with `cleanup-expected.csv`; count mismatched cells and note any reasonable alternative formats. 

## Report back

Table format from the original testing plan is too limiting, Zel replaced it with bulleted lists below, together with screenshots in this dir.

### T1. See and edit. 
- "Show me this table.”: Both ChatGPT and Claude are able to show CSV from URL (https://raw.githubusercontent.com/ZSvedic/TamedTable/refs/heads/main/spec/test-cases/customers-input.csv) as rendered MD table.
- “Sort the table by country.”: Both sorted the table.
- “Rename the Phone column to Phone number.”: Both renamed.
- Cell editing: not possible, table is read-only. Claude offered to create an editable HTML table as artefact, but the table is not synced with main chat once the artefact is closed. Saying “Set the country of customer I003 to United Kingdom.” worked for both, but ChatGPT didn't show the updated table, just replied "Updated I003: Country = United Kingdom."
- “What is the country of customer I003?”: Both answered correctly.

### T2. Clean. 
- “normalize the phone numbers”: worked in both ChatGPT and Claude. Claude offered to install Claude for Excel, where “normalize the phone numbers” produced a [new column Phone (E.164)](excel-claude-after-normalize-phones.png). Then I noticed that OpenAI also has an Excel plugin. That one is a mixed bag. It [offers auto-suggestions](excel-chatgpt-ai-cleanup-suggestions.png) like "Standardize FirstName and LastName capitalization and convert the varied DOB formats in the @customers-input copy sheet into a consistent date format while preserving unparseable values for review.", which is great. But when it starts working, it takes longer than Claude, 30-70sec, and is quite verbose. 
- "make the country names consistent": works in all 4: ChatGPT web / Claude web / Excel Claude / Excel ChatGPT. Additionally, Excel Claude offered to [save my process via "/skillify" command](excel-claude-skillify-questions.png). That produced skill. I also asked to [generate python code for it](excel-claude-normalize.py).
- "fix the capitalization of names": works in all 4, but different. ChatGPT chat produced incorrect ["Mcdonald" and "O'neil"](chatgpt-chat-customers-cleaned.csv), Claude Work [did OK](claude-work-customers-input.csv) but kept displaying the old unmodified table, Excel ChatGPT produced ["Mcdonald" and "O'Neil"](excel-chatgpt-customers-input.csv) (50% correct?), while Excel Claude [did it perfectly](excel-claude-customers-input.csv).

That is all from Zel's manual testing, it is time-consuming to check in all 4, write markdown, and create screenshots. The rest of the "manual" experiments should be done by handing testing to desktop ChatGPT or Claude app with full screen control. Zel suggests this to be template for the rest of T experiments, each experiment in its own dir with screenshots, files, and md linking to relevant files.