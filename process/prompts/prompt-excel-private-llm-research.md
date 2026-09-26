# Research: an agentic Excel add-in on private or EU-hosted models

You are researching, not building. Write one markdown file and change nothing else. No code, no sign-ups, no purchases, no trials that ask for a card.

## The question

Is there room for an Excel add-in where an AI agent works on the workbook (edits cells, writes formulas, Office Scripts, VBA or Python in Excel) while the model runs somewhere the customer controls: a self-hosted LLM server, or a private instance of ChatGPT or Claude hosted in the EU?

Context: TamedTable dropped its MCP app because the ChatGPT and Claude add-ins for Excel already cover its use cases ([decision](../journal/2026-09-26-drop-mcp-app.md), [E0 test](../journal/2026-09-25-e0-excel/README.md)). Those add-ins send data to the vendor's cloud. This research checks whether EU companies that cannot do that have a good option today.

## What to find

For each existing solution, answer the same questions. Leave a cell "unknown" rather than guess.

- **Agent or chat?** Does it change the workbook itself, or only answer in a side panel?
- **Which models can it use?** Vendor cloud only, a customer's Azure OpenAI, AWS Bedrock or Google Vertex deployment, any OpenAI-compatible URL, or a self-hosted server (vLLM, Ollama, LM Studio and similar)?
- **Where does the data go?** Region options, EU data residency, the Microsoft EU Data Boundary, whether prompts and workbook content leave the customer's tenant, retention and training terms.
- **How is it deployed?** AppSource, central deployment by an M365 admin, sideloading; Windows, Mac, web.
- **Status and price:** GA, preview or announced, with the date; price and licence.

Cover four groups:

1. **OpenAI:** ChatGPT for Excel, ChatGPT Enterprise and its EU data residency, Azure OpenAI in EU regions.
2. **Anthropic:** Claude for Excel, Claude Enterprise, Claude through AWS Bedrock or Google Vertex in EU regions, any EU data residency offer.
3. **Microsoft:** Copilot in Excel and its agent mode, Copilot Studio, Azure AI Foundry, Python in Excel, and whether any of them can use a customer's own model or endpoint.
4. **Third parties:** Excel add-ins and tools that accept a custom model endpoint or run on a local model, open source or commercial. Search AppSource, GitHub and vendor sites with terms such as "Excel add-in OpenAI-compatible endpoint", "Excel add-in Azure OpenAI", "Excel Ollama", "Excel local LLM", "Excel AI GDPR". Include EU vendors that sell private LLM hosting and mention Excel.

## How to check

- Every claim needs a source link and the date you read it. Mark vendor marketing as "vendor claim" when no documentation backs it.
- Prefer official docs, admin guides, trust or privacy pages and pricing pages over blog posts and news.
- A product counts as available only if public docs or a public listing show it today. Announcements go in their own column.

## Opportunities

After the survey, answer these, each with the evidence behind it:

- Which combination is missing or hard today: agent on the workbook, plus customer-controlled or EU-hosted model, plus admin-friendly deployment?
- Who would buy it first (banks, insurers, public sector, healthcare, law firms, others), and what signal shows they want it?
- How fast could OpenAI, Anthropic or Microsoft close the gap, based on what they have already announced?
- What TamedTable already has that fits (engine, `.flow` recipes that replay in Web and CLI, model benchmarks), and what would be new work.
- Your recommendation, with a confidence level: worth pursuing, worth watching, or not worth it.

## Output

Write `process/journal/<today>-excel-private-llm.md`:

- An opening paragraph with the answer in plain words.
- One table: a row per solution, columns for the questions above.
- The opportunities section.
- **Rejected:** what you looked at and left out, with one reason each.
- **Sources:** every link with the date read.

Write it the way [spec/writing-style.md](../../spec/writing-style.md) asks: plain words, active voice, no em dashes, no inflated vocabulary. The file is docs-only, so commit it straight to `main` as [AGENTS.md](../../AGENTS.md) allows. Report the boring answer if it is the true one.
