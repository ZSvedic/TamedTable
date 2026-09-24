# MCP Apps with a real GUI that you can try for free

Surveyed 2026-09-23.

I looked at about 75 candidates and 27 of them passed all three checks. They are grouped into 14 rows below. For 26 of the 27 I have protocol proof: the server listed a `ui://` resource with mime type `text/html;profile=mcp-app` when I called it. 11 of those were hosted servers I called live, and 15 were packages I installed and ran, including a local build of Excalidraw. ChessAgine is the exception: CORS blocked the live call, so its proof is source code plus a screenshot of it running in Claude. Every survivor is open source.

The big catch is the client, not the app. A free Claude account can add **one** custom remote connector, and on Claude Desktop it can run any number of local stdio servers. A free ChatGPT account cannot add a custom MCP server at all. OpenAI's help page says developer mode is for Pro (read/fetch only) and Business, Enterprise and Edu. So in practice "free" here means Claude Free, or a free host such as VS Code, Goose, MCPJam Inspector or the ext-apps `basic-host`.

Commercial "interactive connectors" mostly dropped out. Either I could not see their UI myself, or the free plan of the product underneath is too small to use.

About the Excalidraw example in the brief: the open-source Excalidraw MCP app is free and is on the list. The paid one is a different server, **Excalidraw+ MCP**, at `api.excalidraw.com/api/v1/mcp`, which needs an Excalidraw+ API key. That one is in Rejected.

## How I verified

1. **Hosted servers.** I sent `initialize`, `tools/list`, `resources/list` and `resources/read` from a browser page. That only works when the server allows cross-origin requests (CORS).  
   - Where CORS blocked me, I fell back to two weaker checks: an opaque POST (proves the host answers), and a GET that returned 405 (proves an MCP endpoint is there).  
2. **Local servers.** I installed each package from npm or built it from the repo, ran it, and made the same calls over HTTP or stdio.  
3. **Capabilities.** The capability columns come from grepping each app's *own* view source for real calls such as `app.requestDisplayMode(`, `app.openLink(` and `app.downloadFile(`. I did not grep the bundled output, because the SDK bundle contains every method whether the app uses it or not.  
4. **CSP.** The CSP column comes from the `_meta.ui.csp` that `resources/read` returned.

## Summary table

Key to the capability codes:

| Code | Meaning |
| :---- | :---- |
| FS | fullscreen (`requestDisplayMode`) |
| LINK | `openLink` |
| CLIP | clipboard write |
| DL | `downloadFile` / save |
| FILE-IN | file into the iframe (picker, drop or paste) |
| FORM | inputs or dialogs inside the iframe |
| NET | declared `_meta.ui.csp` connect domains, so the iframe fetches from the network |

| App | What it does | How to connect | Capabilities exercised | GUI evidence | Free evidence |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Excalidraw** (excalidraw/excalidraw-mcp) | Hand-drawn diagrams that stream in as the model writes them | Hosted: `https://mcp.excalidraw.com/mcp`, or pick "Excalidraw" in Claude's connector directory. Self-host: clone, `npm install && npm run build`, `node dist/index.js` | FS, LINK, FORM (export confirm dialog), NET (`esm.sh`), declares `clipboardWrite` permission | Local build lists `ui://excalidraw/mcp-app.html` as `text/html;profile=mcp-app`. `docs/demo.gif` in repo. Claude directory shows "Interactive", made by Excalidraw. Hosted URL answers (GET gives 405); CORS blocked a live `tools/list` | MIT. README: "No environment variables needed". Only optional env vars are Upstash/KV for checkpoints. Export uploads to the free json.excalidraw.com. Last commit 2026-03-24 |
| **PDF Server** (ext-apps example) | PDF.js viewer with annotation, form filling, stamps, save | `npx -y @modelcontextprotocol/server-pdf --stdio` (v2.0.0, published 2026-09-17) | FS, LINK, CLIP, DL, FILE-IN (drag or paste images), FORM, NET (`unpkg.com`) | Ran it: `display_pdf` → `ui://pdf-viewer/mcp-app.html`, `text/html;profile=mcp-app`, `permissions.clipboardWrite`. `screenshot.png` in repo | Apache 2.0, no keys. Repo last commit 2026-09-09 |
| **Debug Server** (ext-apps example) | Test harness with a button for every SDK call | `npx -y @modelcontextprotocol/server-debug --stdio` | FS, LINK, FORM, sendMessage, updateModelContext, app-only tools | Ran it: `debug-tool` → `ui://debug-tool/mcp-app.html` | Same as above |
| **Map** (ext-apps example) | CesiumJS 3D globe with OpenStreetMap tiles | `npx -y @modelcontextprotocol/server-map --stdio` | FS, NET (`*.openstreetmap.org`, `*.cesium.com`), updateModelContext | Ran it: `show-map` → `ui://cesium-map/mcp-app.html`, csp listed. `grid-cell.png` | No Cesium Ion token needed |
| **Transcript** (ext-apps example) | Live speech-to-text in the iframe | `npx -y @modelcontextprotocol/server-transcript --stdio` | CLIP, microphone (`permissions.microphone`), sendMessage, updateModelContext | Ran it: `ui://transcript/mcp-app.html` with `permissions: {microphone, clipboardWrite}` | Browser speech API, no keys |
| **Other ext-apps examples** (6): Three.js, ShaderToy, Sheet Music, Wiki Explorer, System Monitor, Budget Allocator | 3D scenes, GLSL shaders, ABC notation with playback, Wikipedia link graph, live OS stats, budget sliders | `npx -y @modelcontextprotocol/server-<threejs|shadertoy|sheet-music|wiki-explorer|system-monitor|budget-allocator> --stdio` | Three.js: FS, LINK. ShaderToy: FS. Sheet Music: NET (`paulrosen.github.io`). Wiki: LINK. Budget: FORM. System Monitor: app-only polling tool | Ran all six. Each lists a `ui://…/mcp-app.html` resource. `grid-cell.png` for each | No keys |
| **Skybridge "Everything"** (alpic-ai/skybridge) | Playground tab for every Skybridge hook | Hosted: `https://everything.skybridge.tech/mcp`. Web playground: `https://everything.skybridge.tech/try` | FS, LINK, DL, FORM (modal via `requestModal`, forms), follow-up message, callTool, NET (own domain). FILE-IN works only in ChatGPT | Live `tools/list`: `show-everything` → `ui://views/ext-apps/show-everything.html?v=…`, `resources/read` returns `text/html;profile=mcp-app`. Screenshot in repo README | Public demo, no sign-in. MIT. Repo last commit 2026-09-22 |
| **Other Skybridge demos** (7): Capitals, Flight Booking, Productivity, Time's Up, Investigation Game, Generative UI, Manifest UI | World map, flight carousel, chart dashboard, word game, detective game, shadcn UI from JSON spec, hello-world starter | `https://<capitals|flight-booking|productivity|times-up|investigation-game|generative-ui|manifest-ui>.skybridge.tech/mcp` | Capitals: FS, NET (`*.mapbox.com`). Flight: LINK. Productivity: FS, LINK, FORM (select), follow-up. Time's Up: FS, follow-up. Investigation: FS, LINK, FORM (dialog), follow-up. Manifest UI: LINK | Live `tools/list` and `resources/read` on all seven returned `text/html;profile=mcp-app` | Public demos, no sign-in. The Mapbox key sits on Alpic's server, not yours |
| **mcp-use Chart / Diagram / Maps** (mcp-use/mcp-chart-builder, \-diagram-builder, \-maps-explorer) | ECharts charts, diagrams with an edit tool, Leaflet map with markers | `https://yellow-shadow-21833.run.mcp-use.com/mcp` (chart), `https://lucky-darkness-402ph.run.mcp-use.com/mcp` (diagram), `https://super-night-ttde2.run.mcp-use.com/mcp` (maps) | All three: FS. Maps: LINK, callTool, NET (`tile.openstreetmap.org`) | Live `tools/list` and `resources/read` on all three: `ui://views/*.html`, `text/html;profile=mcp-app`, csp listed. `repo-assets/demo.gif` in each repo | Public demos, no keys in code. Last commits 2026-08-04 |
| **ChessAgine** (jalpp/chessagine-mcp) | Chess board and PGN viewer with Stockfish analysis | Hosted: `https://chessagine-mcp.vercel.app/mcp` | FORM (board option toggles) | Source registers `ui://chessagine/chess-board` and `ui://chessagine/pgn-viewer` as `text/html;profile=mcp-app`. `preview.png` shows it rendering inside Claude. Hosted URL answers (GET gives 405); CORS blocked a live `tools/list` | install.md: "No API key". Optional Lichess or ChessDojo tokens go in request headers, and Lichess tokens are free. Last commit 2026-09-14 |
| **TomTom Maps** (tomtom-international/tomtom-maps-mcp) | Geocoding, POI search, routing, traffic, each with its own map view | `MAPS=tomtom-orbis-maps TOMTOM_API_KEY=… npx -y @tomtom-org/tomtom-mcp`, or hosted `https://mcp.tomtom.com/maps` with your key | NET (`api.tomtom.com`, `unpkg.com`), FORM | Ran it: 15 tools, each with its own `ui://tomtom-*/…/app.html` (`text/html;profile=mcp-app`). Hosted URL answers | Needs a TomTom key. TomTom pricing page: "No credit card required". Free per month: Search 2.5K, Routing 20K, map tiles 200K. v1.6.10, committed 2026-09-23 |
| **Mermaid MCP App** (finfin/mermaid-mcp-app) | Mermaid viewer with pan, zoom and a split source editor | `npx -y mermaid-mcp-app --stdio` (v0.4.4) | CLIP, FORM (editor), sendMessage (sends the edited diagram back to the chat), updateModelContext | Ran it: `ui://mermaid/view.html`, `text/html;profile=mcp-app`. Screenshots in `assets/images/` | AGPL, no keys. Last commit 2026-03-26 |
| **Audio File MCP App** (counterpoint-studio/audio-file-mcp-app) | Plays a local audio file with loudness stats, spectrogram and region looping | `npx -y @counterpoint-studio/audio-file-mcp-app` | File into the iframe (the server streams local file bytes), updateModelContext | Ran it: `display_audio_file` → `ui://ctpt.co/audio-file/mcp-app.html`. `docs/screenshot.png` shows it in Claude Desktop | No keys. v1.1.0, last commit 2026-07-10 |
| **open-mcp-apps** (2nd1st/open-mcp-apps) | The model writes small single-file apps, saves them in SQLite, and reopens them later | `npx -y @2nd1st/open-mcp-apps` (local only, binds 127.0.0.1) | LINK, CLIP, DL, FILE-IN, FORM, sendMessage, file read/write tools. Declares an empty CSP (no network) | Ran it: `open_app` → `ui://open-mcp-apps/app.html`. Screenshots in `.github/screenshots/`, including `host-claude.webp` | Open source, no keys. The hosted openmcp.app version was not checked. Last commit 2026-09-05 |

## The surviving apps

### Excalidraw

**Steal:** export is a small, clean pattern:

1. The iframe shows its own confirmation dialog.  
2. It calls an app-only server tool (`export_to_excalidraw`) to upload the scene. That sidesteps CORS on json.excalidraw.com.  
3. It calls `openLink` on the returned URL.

It also saves and restores checkpoints through app-only tools, so the model never sees them.

**Surprising:** the view loads the Excalidraw library from `esm.sh` at runtime, declared in `_meta.ui.csp`, instead of bundling it. It also streams the drawing in while the tool input is still arriving.

It is the only survivor in Claude's official connector directory. That may matter on Claude Free: a directory connector probably does not use up your one custom-connector slot, though I found no page that says so.

### PDF Server

This is the one to study if you care about the hard parts. It covers fullscreen, `openLink`, clipboard, `downloadFile`, images dropped or pasted into the iframe, and PDF form filling. It also writes back to disk through an app-only `save_pdf` tool that checks file mtime so it does not clobber outside edits.

**Steal:**

- **Download fallback.** It checks `app.getHostCapabilities()?.downloadFile` first. If the host lacks it, it falls back to a blob URL and an `<a download>` click.  
- **Clipboard permission.** Copying needs `permissions.clipboardWrite` declared on the resource's `_meta.ui`. It is not automatic.  
- **Chunked loading.** Large PDFs arrive in chunks through the app-only `read_pdf_bytes` tool, because some hosts cap tool result size.

### Debug Server

It does nothing useful by itself, which is the point. It puts every SDK call behind a button and logs every host event. Connect it before you build anything, to see which capabilities a given host actually grants.

### Map and Transcript

**Map** shows how to declare CSP for third-party tiles, and how to persist camera position in `localStorage` keyed by a server-provided id. The Patterns page cites it for that.

**Transcript** is the only survivor that requests `permissions.microphone`. It shows how a host-granted permission is declared per resource.

### The other six ext-apps examples

They are smaller and each shows one idea:

- **Three.js** and **ShaderToy** pause rendering with `IntersectionObserver` when scrolled off screen.  
- **System Monitor** polls through an app-only tool.  
- **Sheet Music** fetches its sound font from a declared connect domain.  
- **Budget Allocator** is plain form input.

**Surprising:** Claude's own "Get started with MCP Apps" page gives npx commands that do not exist on npm. It lists `@modelcontextprotocol/map-server`, `qr-server`, `shadertoy-server`, `sheet-music-server` and `customer-segmentation-server`, and all five return 404 on npm. The real names are `@modelcontextprotocol/server-map` and so on.

The Patterns page is also behind: it is labeled v1.1.2, while the npm packages are 2.0.0.

### Skybridge "Everything" and the other Skybridge demos

**Steal:** one codebase serves both protocols. Every resource carries `_meta.ui` for MCP Apps and `openai/widgetCSP` for the Apps SDK. The "Everything" demo also has a tab per hook: modal, display mode, open external, download, files, follow-up message, view state.

**Surprising:**

- The file upload hook (`useFiles`) is Apps-SDK-only. Its source says calling it from MCP Apps throws. So file upload *into* an MCP App is still a ChatGPT-only trick.  
- Download goes through `ui/download-file` and fails cleanly when the host does not offer it.  
- Resource URIs carry a content hash (`?v=6aa19e92`) for cache busting.  
- `resources/list` returns no mimeType. Only `resources/read` returns it.

Two demo URLs in the repo's READMEs do not resolve: `mcpcn.skybridge.tech` and `murder-in-the-valley.skybridge.tech`. `investigation-game.skybridge.tech` works.

### mcp-use Chart, Diagram and Maps

**Steal:** the `ui://` resource is only about 1.3 KB. It is a shell that loads its JS and CSS from the server's own domain. The framework fills in `connectDomains`, `resourceDomains`, `frameDomains` and `baseUriDomains` with that domain automatically. Maps adds OpenStreetMap tiles, plus a `redirectDomains` entry that is not in the MCP Apps spec.

**Watch out:** the hostnames are auto-generated (`yellow-shadow-21833`), so treat them as demos that may move.

### ChessAgine

**Steal:** it shows how to run one shared, hosted server with no secrets of its own. Each caller sends their own optional tokens as request headers (`X-Lichess-Token` and so on). The core Stockfish and ChessDB tools need no key at all.

### TomTom Maps

It has 15 tools, and each has its own view. That makes it the largest survivor.

**Surprising:** an app-only tool, `tomtom-get-api-key`, hands your API key to the iframe. The iframe then calls `api.tomtom.com` directly, which is allowed through its declared CSP. That makes the in-iframe network fetches simple, but the key is visible to anything that runs in the view. Decide whether you want that before copying it.

### Mermaid MCP App

**Steal:** the round trip. You edit the diagram source in the split editor inside the iframe, and `sendMessage` posts the new source back into the conversation so the model continues from your version.

**Surprising:** the whole view is inlined into one 3 MB HTML resource.

### Audio File MCP App

The best example of moving a file from disk into the iframe without a file picker. The server exposes a resource template, `audiofile-range://{path}/{start}/{length}`, and the view pulls byte ranges through it.

**Surprising:** it returns base64 in `text` rather than `blob`, and a code comment says that works around a Goose bug.

### open-mcp-apps

The model writes a single-file HTML app against a small `window.oma` API. The engine saves it in SQLite with versioned data and wraps it with the MCP Apps bridge and host theming.

**Steal:** the idea that the view is disposable and the data store is the product.

**Limit:** it binds to 127.0.0.1, so it works in Claude Desktop, Claude Code and Codex, but not in claude.ai web or ChatGPT web.

## Rejected

**Widely recommended, but you pay somewhere:**

- **Excalidraw+ MCP** (`https://api.excalidraw.com/api/v1/mcp`): needs an Excalidraw+ API key. Plus costs $6/user/month billed yearly. It is also a public beta. This is not the free Excalidraw app above.  
- **Hex**: Hex's docs say MCP is "Available on the Team and Enterprise plans".  
- **Clay**: you get 500 credits when you first connect, then usage draws on a paid Clay plan.  
- **Figma / FigJam**: the free Starter seat gets "Up to 20/month" tool calls, and only clients in Figma's catalog can connect. Its Claude connector page also no longer shows the Interactive badge.  
- **Spotify**: the personalized playlists need Premium. Free users only get existing playlists.  
- **All ChatGPT directory apps from a free ChatGPT account** (Zillow, Booking.com, Expedia, Coursera and others): you can *use* these on ChatGPT Free, but none has a public MCP URL I could call, and I saw no UI myself. Custom servers, including everything in the table above, cannot be added on ChatGPT Free at all.

**Could not verify a GUI:**

- **Mermaid Chart (official)**: `https://mcp.mermaid.ai/mcp` answered with 25 tools and no `ui://` resource. The `/anthropic/mcp` endpoint answered but blocked my probe with CORS.  
- **Amplitude**: free on the Starter plan, but neither of Amplitude's MCP pages shows or describes a UI inside the chat. Claude's directory badge is the only evidence.  
- **Asana, Box, Canva, monday.com, Slack, Lucid, Miro**: I could not call them without OAuth, and I saw no screenshot or video of their UI myself. Asana's docs also name no plan. Miro and Slack have no Interactive badge today. Lucid's own docs say the diagrams it makes are static.  
- **MCP-UI demo server** (`https://remote-mcp-server-authless.idosalomon.workers.dev/mcp`): it answered, but no tool carries `_meta.ui.resourceUri`. It uses the older mcp-ui embedded-resource style, which Claude does not render as an MCP App.  
- **yctimlin/mcp\_excalidraw** (the `excalidraw-mcp` package on npm), **hustcc/mcp-mermaid**, **bassimeledath/tldraw-render-mcp**, **marc-shade/world-intel-mcp**: no `ui://` resource in the code. mcpapp-store.com labels two of these "Supports UI" anyway.

**Not reachable or not runnable as documented:**

- **mcpcn.skybridge.tech** and **murder-in-the-valley.skybridge.tech**: the hosts do not resolve.  
- **infographic-mcp-app** (VancySavoki): the npm package that directories list does not exist.  
- **The npx commands on Claude's getting-started page**: they return 404 on npm (see above). The apps themselves are fine under their real names.  
- **Salesforce**: still in pilot or "open beta expected September 2026".

**Not tested, so left out:**

- **ext-apps qr-server, say-server, customer-segmentation, cohort-heatmap, scenario-modeler, video-resource**: they probably work like their siblings, but I did not run them. `qr` and `say` are Python run from the repo with `uv`, and are not on PyPI.  
- **Lumo tutor, Skybridge ecommerce, gaosen1/mermaid-mcp-app, OSS-GR graph viz, digitarald playground, openai-apps-sdk-examples**: I did not run or probe them.  
- **TomTom, ChatGPT side**: works, but only for paid ChatGPT plans, like every custom server.

## Where to look next

The ext-apps README "Supported clients" badges and its `examples/` directory gave the best starting points. Directory UI filters mostly don't exist or can't be trusted.

- **modelcontextprotocol/ext-apps**: the `examples/` directory (about 20 servers) and the client badges. For testing, use the Debug Server and `examples/basic-host`.  
- **Claude connector directory** (claude.com/connectors): has an "Interactive" type filter, the only first-party UI filter I found. The badges are vendor claims, and some launch partners have lost theirs.  
- **Official MCP registry** (`registry.modelcontextprotocol.io/v0/servers?search=`): name search only, and the schema has no UI field. Searching "mcp-app" still turns up real ones.  
- **Smithery, Glama, mcp.so**: no UI filter. Glama filters only by remote/local and tools/resources/prompts.  
- **PulseMCP**: its robots.txt blocked fetching, so not checked.  
- **mcpapp-store.com**: has a "Supports UI" label, but it was wrong for 2 of the 4 entries I checked. mcpapp.net has labels and no filter.  
- **Alpic / Skybridge**: the table in the `alpic-ai/skybridge` README links about ten public `*.skybridge.tech` demos with `/try` playgrounds.  
- **mcp-use / Manufact**: three public demos on `run.mcp-use.com`.  
- **MCPJam**: has a hosted shared Excalidraw session and a free inspector (`npx @mcpjam/inspector@latest`) that renders MCP Apps.  
- **ChatGPT app directory**: no filter I could reach. The GitHub list `rdmgator12/awesome-chatgpt-apps` (updated 2026-07) is the practical index.  
- **SohniSwatantra/awesome-mcp-apps**: nearly empty, last updated 2025-11.  
- **GitHub code search** for `profile=mcp-app` or `registerAppResource`: likely the best untapped source. I could not run it from this sandbox.

## Sources

- MCP Apps: [modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps), [Patterns](https://apps.extensions.modelcontextprotocol.io/api/documents/Patterns.html), [Claude: Get started with MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started)  
- Plans: [Claude custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), [Claude interactive tools (plans)](https://claude.com/blog/interactive-tools-in-claude), [ChatGPT developer mode and MCP apps](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt)  
- Excalidraw: [excalidraw/excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp), [Excalidraw in Claude directory](https://claude.com/connectors/excalidraw-app-demo), [Excalidraw+ MCP docs](https://plus.excalidraw.com/docs/mcp)  
- Hosted demo repos: [alpic-ai/skybridge](https://github.com/alpic-ai/skybridge), [jalpp/chessagine-mcp](https://github.com/jalpp/chessagine-mcp)  
- Local app repos: [tomtom-international/tomtom-maps-mcp](https://github.com/tomtom-international/tomtom-maps-mcp), [TomTom pricing](https://docs.tomtom.com/pricing), [finfin/mermaid-mcp-app](https://github.com/finfin/mermaid-mcp-app), [counterpoint-studio/audio-file-mcp-app](https://github.com/counterpoint-studio/audio-file-mcp-app), [2nd1st/open-mcp-apps](https://github.com/2nd1st/open-mcp-apps)  
- Rejected products: [Asana MCP docs](https://developers.asana.com/docs/using-asanas-mcp-server), [Amplitude MCP](https://amplitude.com/mcp-server)