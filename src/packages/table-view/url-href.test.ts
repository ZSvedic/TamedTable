// RED-UI-6 — regression test (red inventory): urlHref rejects valid
// uppercase-scheme URLs. Per RFC 3986 the scheme and host are
// case-insensitive, so `HTTPS://EXAMPLE.ORG/P/1` is a valid http(s) URL —
// `new URL` parses it and normalizes to `https://example.org/P/1`, and the
// function's own protocol check (index.ts:64-65) compares the
// already-lowercased `u.protocol`. The accidental blocker is the pre-filter
// regex `/^https?:\/\/\S+$/` (index.ts:62) missing the `i` flag. Spec: "a
// cell whose entire value is a valid `http(s)://` URL renders as a link" —
// spec/packages/table-view/behavior.md:118 — and linking the uppercase
// spelling of the same URL is not "nothing looser" territory (it is not
// bare-domain guessing).
import { test } from 'bun:test';
import { strict as assert } from 'node:assert';
import { urlHref } from './index.ts';

test('RED-UI-6: urlHref rejects uppercase-scheme URLs that RFC 3986 declares valid', () => {
  // Harness sanity first: the lowercase spelling links. If this throws, the
  // failure is a broken harness, not RED-UI-6.
  if (urlHref('https://example.org/p/1') !== 'https://example.org/p/1') {
    throw new Error('harness broken (not RED-UI-6): lowercase https URL should produce an href');
  }

  assert.equal(
    urlHref('HTTPS://EXAMPLE.ORG/P/1'),
    'https://example.org/P/1',
    "RED-UI-6 (spec/packages/table-view/behavior.md:118): 'HTTPS://EXAMPLE.ORG/P/1' is a valid http(s) URL (RFC 3986 schemes/hosts are case-insensitive; new URL normalizes it to https://example.org/P/1) and must render as a link, but urlHref returns null — the pre-filter regex at table-view/index.ts:62 lacks the /i flag",
  );
  assert.equal(
    urlHref('Https://example.org/p/1'),
    'https://example.org/p/1',
    'RED-UI-6 (spec/packages/table-view/behavior.md:118): a mixed-case scheme is equally valid per RFC 3986 and must link, but urlHref returns null (table-view/index.ts:62 regex is case-sensitive)',
  );
});
