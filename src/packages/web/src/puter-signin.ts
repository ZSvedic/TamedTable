// #PuterGateway
// Puter's credential is a session token, and the only way to mint one is its
// sign-in popup — there is no device-code or headless login endpoint. This port
// loads Puter's SDK, opens that popup, and hands back the token.
//
// The SDK is fetched **on click, never on page load**. TamedTable's pages pull
// in no third-party scripts at all, and a user who never touches Puter should
// keep it that way (see the FAQ's key-safety answer), so the <script> tag is
// added the first time this runs and not before.

const SDK_URL = 'https://js.puter.com/v2/';
/** Where a signed-in Puter SDK keeps the token. `.v2` is current; the bare key
 *  is the legacy one the SDK still falls back to. */
const TOKEN_KEYS = ['puter.auth.token.v2', 'puter.auth.token'];

interface PuterGlobal {
  auth?: { signIn?: () => Promise<unknown> };
}

function puter(): PuterGlobal | undefined {
  return (globalThis as { puter?: PuterGlobal }).puter;
}

let loading: Promise<void> | undefined;

function loadSdk(): Promise<void> {
  if (puter()) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;         // Let a later click try again.
      reject(new Error('Could not load Puter.js.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

function storedToken(): string | null {
  for (const key of TOKEN_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value) return value;
    } catch {
      // Storage may be blocked; the next key (or null) still answers.
    }
  }
  return null;
}

/** Open Puter's sign-in and resolve the token, or null when the user closed it
 *  without signing in. */
export async function browserPuterSignIn(): Promise<string | null> {
  await loadSdk();
  const signIn = puter()?.auth?.signIn;
  if (!signIn) throw new Error('Could not load Puter.js.');
  try {
    await signIn();
  } catch {
    // Puter rejects when the popup is dismissed — not an error worth a banner.
    return null;
  }
  return storedToken();
}
