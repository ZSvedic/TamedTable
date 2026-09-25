# C8. Big file (T8)

A fresh all-text workbook of `showcase-lazy-input.csv` (25,000 products) and a fresh chat per host. Prompt: "Add a Category column: kitchen, electronics, clothing, sports, or other. Give me the full result as a CSV file." There is no labelled answer key for this file, so the two exports are compared with each other and spot-checked.

## Excel + ChatGPT (GPT-5.6 Terra)

- **About 1.5 minutes, all 25,000 rows.** "I found a 25,000-row product list. Next I'm mapping product names to the five requested categories". It hit "Excel's per-write limit" and wrote in three chunks, then "spot-checking the start, middle, and end". Fixed values, not formulas. [Answer](chatgpt-answer.png).
- **Counts:** kitchen 6,878, electronics 6,271, sports 5,616, clothing 4,376, other 1,859. 25,000 rows, no blanks, no duplicate ids. [CSV](chatgpt-category.csv).
- **CSV:** "I can't attach a downloadable CSV file in this session".

## Excel + Claude (Opus 5.5)

- **About 2 minutes including the permission prompt, all 25,000 rows.** "There are only 40 product types, with words like 'Slim' or 'XL' added to their names. I listed each type and its category on a new Category Map tab. Column F finds the type in each product name and pulls in the category." It asked for edit permission (Allow once). [Answer, top](claude-answer-top.png), [answer, end](claude-answer.png), [permission](claude-permission.png).
- **Counts:** kitchen 6,878, clothing 6,245, electronics 4,400, sports 3,747, other 3,730. 25,000 rows, no blanks, no duplicate ids. It named its borderline calls: "I put footwear under clothing, not sports ... Desk lamp and monitor stand went to other." [CSV](claude-category.csv).
- **CSV:** "I couldn't make the CSV file itself ... CSV saves only the active sheet, so the lookup tab won't be included."

## Comparison

- The two hosts agree on 21,260 of 25,000 rows (85%). Every disagreement is a whole product type: laptop sleeves, monitor stands and desk lamps (ChatGPT electronics, Claude other), and running shoes, hiking boots and trail-running socks (ChatGPT sports, Claude clothing). Both are defensible.
- Each host gave every variant of the same product type the same category, so both worked per type, not per row. On this file that is correct, because the 25,000 names are built from a few dozen product types.
- 10 random rows (Python `random.seed(10)`): P18724 Smart Resistance Bands 2.0 sports/sports, P01068 Pro Resistance Bands 2.0 sports/sports, P14054 Wireless Fleece Hoodie clothing/clothing, P15813 Slim Chef Knife kitchen/kitchen, P18943 Smart Webcam Lite electronics/electronics, P00487 Compact Puffer Vest Lite clothing/clothing, P06754 Ultra Espresso Machine Set of 2 kitchen/kitchen, P15158 Vintage Linen Shirt Max clothing/clothing, P16099 Travel Toaster Oven Max kitchen/kitchen, P09094 Mini Cast-Iron Skillet 2.0 kitchen/kitchen. All ten plausible in both.

## Result

Both hosts finished 25,000 rows in under two minutes, kept every row and gave a category to each. Neither could hand over a CSV file; the user saves it from Excel.
