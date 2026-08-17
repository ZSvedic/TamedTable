#!/usr/bin/env bun
// #Analytics / legal — render a Markdown doc into an HTML page body and inject
// it into a template at its `<!--CONTENT-->` marker. Single-sourcing: the
// privacy policy lives once as spec/legal/privacy.md (readable in the repo and
// by CLI users); build-site.sh renders it into the marketing page from here.
//
// KISS, zero-dependency: this handles only the Markdown subset spec/legal/*.md
// uses — `#`/`##` headings, blank-line-separated paragraphs, `-` bullet lists,
// and inline `[text](url)` links. It is NOT a general Markdown engine; keep the
// source within this subset (a `## ` heading opens a <section> that runs to the
// next `## ` or end, matching the page's CSS).
//
// Usage: bun .github/scripts/render-md.ts <in.md> <template.html> <out.html>
import { readFileSync, writeFileSync } from 'node:fs';

const [mdPath, tmplPath, outPath] = process.argv.slice(2);
if (!mdPath || !tmplPath || !outPath) {
  console.error('usage: render-md.ts <in.md> <template.html> <out.html>');
  process.exit(1);
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Escape first, then turn [text](url) into anchors. External (http/https) links
// open in a new tab; relative links (e.g. /FAQ#busl) stay in-page.
const inline = (s: string): string =>
  escapeHtml(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const attrs = /^https?:\/\//.test(url) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${url}"${attrs}>${text}</a>`;
  });

const md = readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n').trim();
const out: string[] = [];
let inSection = false;
const closeSection = (): void => {
  if (inSection) out.push('</section>');
  inSection = false;
};

for (const block of md.split(/\n{2,}/)) {
  const lines = block.split('\n');
  if (block.startsWith('# ')) {
    out.push(`<h1>${inline(block.slice(2).trim())}</h1>`);
  } else if (block.startsWith('## ')) {
    closeSection();
    out.push('<section>', `<h2>${inline(block.slice(3).trim())}</h2>`);
    inSection = true;
  } else if (lines.every((l) => l.startsWith('- '))) {
    out.push('<ul>', ...lines.map((l) => `<li>${inline(l.slice(2).trim())}</li>`), '</ul>');
  } else {
    out.push(`<p>${inline(lines.join(' '))}</p>`);
  }
}
closeSection();

const template = readFileSync(tmplPath, 'utf8');
const marker = '<!--CONTENT-->';
if (!template.includes(marker)) {
  console.error(`template ${tmplPath} has no ${marker} marker`);
  process.exit(1);
}
writeFileSync(outPath, template.replace(marker, out.join('\n      ')));
