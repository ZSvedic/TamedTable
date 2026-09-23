# Survey: MCP Apps with a real GUI that I can try for free

You are researching, not building. Produce one markdown file and nothing else.

## What I want

A list of **MCP servers that ship an interactive UI** (the MCP Apps extension, SEP-1865, or OpenAI's Apps SDK) that I can connect to **Claude or ChatGPT and use today without paying anybody**.

I care most about apps that exercise the parts of the extension that are hard or blocked:

- handling files, in either direction (open, save, download, upload)
- entering fullscreen (`requestDisplayMode`)
- copying to the clipboard
- opening external links (`openLink`)
- showing dialogs, forms, or anything that takes input inside the iframe
- anything that fetches from the network inside the iframe (a declared `_meta.ui.csp`)

## The bar for putting something on the list

Do not list an app unless you have **verified** it. Verification means all three:

1. **It really has a GUI.** An article that calls something "an MCP app" and shows no screenshot, no video and no UI source file is not evidence. Acceptable evidence: a screenshot or video of the UI; a repository containing an HTML/JS/React view registered as a `ui://` resource; a tool registration carrying `_meta.ui.resourceUri`. Say which of these you found.
2. **It is actually reachable.** For a hosted server, fetch the URL and confirm it answers. For a self-hosted one, confirm the repository still exists, has a build that runs, and note when it was last committed to. An app whose server 404s is not something I can try.
3. **It is free.** Free to connect *and* free to use for its main purpose. This is the one most lists get wrong: Excalidraw's MCP is widely recommended but needs a paid Excalidraw plan, so it fails this bar. Watch for: a paid plan on the underlying product, an API key that costs money, a free tier so small the app is useless, a waitlist, and "free during beta" with a date attached. Say explicitly what you checked and where the limit sits.

If you cannot verify one of the three, leave the app out. A short verified list beats a long plausible one. It is a fine outcome to report that only four or five qualify.

## Output

Write `process/journal/<today>-mcp-app-survey.md` with:

- One paragraph on how many candidates you looked at and how many survived the bar.
- A table: app, what it does, how to connect it (URL or install command), which of the capabilities above it exercises, evidence that it has a GUI, evidence it is free.
- A section per surviving app: a couple of sentences on what is worth stealing from it, and anything surprising about how it is built.
- A section, **Rejected**, listing what failed and the one reason each failed. Especially anything widely recommended that turned out to need paying. This section is as useful as the list itself.
- A section, **Where to look next**, naming the registries and directories you searched, so the next person starts where you stopped.

## Where to start

The MCP Apps extension repository (`modelcontextprotocol/ext-apps`) has an `examples/` directory of working servers, and its README links the clients that support the extension. Registries worth searching: the official MCP registry, Smithery, Glama, PulseMCP, mcp.so, and the ChatGPT app directory. Follow the "supported clients" links in the ext-apps README outwards.

Where a public URL exists, connect to it and call `tools/list` and `resources/list` yourself. A server that lists a `ui://` resource with mime type `text/html;profile=mcp-app` is proof; a blog post is not.

## Tone

Write it the way `spec/writing-style.md` asks: plain words, active voice, no em dashes, no inflated vocabulary, lead each section with the sentence that makes the rest make sense. Report what you found, including the boring answer if that is the true one.
