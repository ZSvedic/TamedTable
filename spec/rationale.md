# TamedTable app

## Problem
ETL ([Extract-Transform-Load](https://en.wikipedia.org/wiki/Extract,_transform,_load)) software is commonly used in enterprises and sciences to process large datasets. 
Such software is often complex but inadequate, as specific tasks often require programming. 
That is a problem because enterprise and academic users are not professional programmers.
For that reason, many data-processing DSLs ([Domain-specific languages](https://en.wikipedia.org/wiki/Domain-specific_language)) were developed: 
- 1950s: [regex](https://en.wikipedia.org/wiki/Regular_expression)
- 1973: [SQL](https://en.wikipedia.org/wiki/SQL)
- 1974: [SED](https://en.wikipedia.org/wiki/Sed)
- 1977: [AWK](https://en.wikipedia.org/wiki/AWK)
- 1987: [Perl](https://en.wikipedia.org/wiki/Perl)
- 2012: [jq](https://en.wikipedia.org/wiki/Jq_(programming_language))
Each of the above languages:
- Has limitations, meaning users need to know multiple languages.
- Is difficult to learn. 
  Even SQL, intended for use by managers, is mostly used by programmers.
As a result, enterprise and academic users embraced a few simple, general-purpose, high-level languages.
Python and R rose in popularity as Swiss Army knives that you learn once and can throw at any data-related task.
But they still require knowledge of:
- Programming languages (e.g. Python 3, SQL, regex).
- Libraries (e.g. Pandas, PyArrow, Matplotlib).
- Tooling (e.g. pip, venv, uv, mypy, VSCode).
As a result, enterprise and academic users use Excel for ETL tasks, which is easy to learn but inadequate and proprietary.

## AI development
The release of ChatGPT in 2022 finally made ETL approachable to a wide user base. 
AI chatbots know all the above-mentioned languages, frameworks, and tools (unless they are recent like [uv](https://github.com/astral-sh/uv)). 
Furthermore, AI chatbots can get a natural language description of a problem and recommend the most appropriate tool for the task. 
Users either copy/paste code or use CLI coding agents (e.g. Claude Code) to develop custom ETL solutions.
The problem is that, since users are not programmers, it is difficult for them to:
- Spot bugs or architectural errors in AI code.
- Maintain generated AI code.
- Use AI development practices such as SDD/TDD/BDD (Spec/Test/Behavior-Driven Development).
- Manage dependencies and security.

## Proposed solution
A source-available (BUSL) TamedTable web app that combines elements of:
- Google Sheets: tabular editor. 
- Claude Code: sidebar chat that calls tools.
- Claude Design: user comments on the table are resolved in the background, and the code is hidden.
More specifically, TamedTable is a web agent [harness](https://martinfowler.com/articles/harness-engineering.html) for data ETL use cases. 
No programming knowledge is needed, as data is displayed on screen and transformations are specified in natural language (either by typing or by voice).
In the background, TamedTable handles technical tasks like:
- Keeping a history of all transformations.
- Undo/redo.
- Version control.
- Calling data transformation subagents.
- Writing and deploying code for specific workflows.
Web UX is there for the development process; actual data is managed by a headless API. 
That allows any flow to run without the web app.

## Example use cases
Use cases in the [Gherkin language](https://cucumber.io/docs/gherkin/reference) are in the [test-cases/](test-cases/) dir.
