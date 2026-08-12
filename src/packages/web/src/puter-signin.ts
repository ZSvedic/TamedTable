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
 *  is the legacy one the SDK still falls back to. The origin entry rides along
 *  with `.v2` and is cleared with it. */
const TOKEN_KEYS = ['puter.auth.token.v2', 'puter.auth.token'];
const ORIGIN_KEY = 'puter.auth.token.origin.v2';

/** What `puter.auth.signIn()` resolves with on success. The token is right
 *  there in the answer, so it is read from the answer — the SDK also writes it
 *  to localStorage, but that is a side effect to fall back on, not the
 *  channel. */
interface SignInResult {
  token?: string;
}

/** Why `puter.auth.signIn()` rejected. `auth_window_closed` is the user
 *  changing their mind; everything else is a failure they need told about. */
interface SignInError {
  error?: string;
  msg?: string;
}

interface PuterGlobal {
  auth?: { signIn?: () => Promise<SignInResult>; signOut?: () => void };
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

/**
 * Open Puter's sign-in and resolve the token, or null when the user closed the
 * window without signing in.
 *
 * Everything that is *not* the user changing their mind throws, because the
 * alternative is what this used to do: return null for every failure, which the
 * caller reads as "dismissed" and answers by doing nothing at all. A blocked
 * popup then looked exactly like a click that never registered.
 */
export async function browserPuterSignIn(): Promise<string | null> {
  await loadSdk();
  const signIn = puter()?.auth?.signIn;
  if (!signIn) throw new Error('Could not load Puter.js.');

  let result: SignInResult;
  try {
    result = await signIn();
  } catch (e) {
    const { error, msg } = (e ?? {}) as SignInError;
    if (error === 'auth_window_closed') return null;   // Changed their mind.
    if (error === 'popup_blocked') {
      throw new Error(
        'Your browser blocked the Puter.js sign-in window. Allow pop-ups for this site and try again.',
      );
    }
    throw new Error(msg ?? 'Could not sign in to Puter.js.');
  }

  // The answer carries the token; localStorage is the SDK's own copy of it and
  // only a fallback. Reading storage alone meant a successful sign-in whose
  // write was blocked (private mode, partitioned storage) came back as null —
  // indistinguishable from a dismissal.
  const token = result?.token ?? storedToken();
  if (!token) throw new Error('Puter.js signed in but returned no token.');
  return token;
}

/**
 * Forget the Puter session — what deleting the Puter card means.
 *
 * Dropping our own stored token is not enough: the SDK keeps its own copy in
 * localStorage and reads it back on the next load, so a user who deleted the
 * card and clicked Sign in again would be silently signed in as the same
 * account, with no way to switch. This clears the SDK's copy too.
 *
 * Deliberately local — no SDK load, no network call. Deleting a card must work
 * on a page that never loaded Puter.js, and a session token is forgotten by
 * throwing it away.
 */
export function browserPuterSignOut(): void {
  puter()?.auth?.signOut?.();
  for (const key of [...TOKEN_KEYS, ORIGIN_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be blocked; there is then nothing stored to forget.
    }
  }
}
