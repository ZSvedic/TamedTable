# C5. Find problems and answer questions without changing the table (T6)

Two fresh workbooks and chats per host. First `showcase-validate-input.csv` with "What is wrong with this dataset?", then `customers-input.csv` with "How many customers are in each country?". Both fixtures loaded as all-text sheets, so both hosts also reported "everything is stored as text"; that finding comes from the loading method, not the data.

The six planted anomalies: bill.gates@microsoft.com, asdf@asdf.com, 1873-01-01, 2024-02-30, Paris in Japan, a desk lamp at 3.99.

## Excel + ChatGPT (GPT-5.6 Terra)

- **Anomalies: 5 of 6.** Found 2024-02-30 ("does not exist in the calendar"), 1873-01-01 ("about 153 years old"), Paris in Japan, asdf@asdf.com ("looks like a placeholder/test email") and the $3.99 desk lamp ("far below every other listed product price"). Missed bill.gates@microsoft.com. It warned and changed nothing. [Answer](chatgpt-1-anomalies-answer.png), [sheet](chatgpt-1-anomalies-sheet.png).
- **Country counts:** correct (United States 3, United Kingdom 3, five countries with 2, four with 1, total 20; it merged UK/England, USA, Deutschland and The Bahamas). **The sheet changed:** it wrote a "Country Summary" table into H1:I14 of the data sheet without being asked. [Answer](chatgpt-2-country-count-answer.png), [sheet](chatgpt-2-country-count-sheet.png).

## Excel + Claude (Opus 5.5)

- **Anomalies: 6 of 6.** Found both dates, Paris in Japan, asdf@asdf.com ("keyboard-mash junk"), bill.gates@microsoft.com ("almost certainly a made-up celebrity entry") and the 3.99 desk lamp ("could be a typo, maybe for 39.99"). It also flagged eve@example.org as a reserved example domain. "I only read the data and didn't change anything." [Answer, top](claude-1-anomalies-answer-top.png), [answer, end](claude-1-anomalies-answer.png), [sheet](claude-1-anomalies-sheet.png).
- **Country counts:** the same correct counts, as a table in the chat. "I counted England as part of the United Kingdom. I didn't change anything in the sheet." It offered a formula table or the `normalize-contacts` skill instead. [Answer](claude-2-country-count-answer.png), [sheet](claude-2-country-count-sheet.png).

## Result

Both answer questions over the whole table correctly. Claude found all six anomalies and kept both answers read-only. ChatGPT missed the celebrity email and wrote an unrequested summary table into the data sheet when asked a question.
