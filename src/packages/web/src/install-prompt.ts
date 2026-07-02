// #MobileShell — "Add to home screen". Chrome on Android announces its
// install prompt with a one-shot beforeinstallprompt event that fires early,
// long before the Settings panel opens — so main.tsx captures it here at
// startup and the panel asks for it later. Safari/iOS never fires it; the
// panel shows the share-menu instruction instead.
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

let deferred: BeforeInstallPromptEvent | null = null;

export function captureInstallPrompt(win: Window = window): void {
  win.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for the Settings button instead of the mini-bar
    deferred = e as BeforeInstallPromptEvent;
  });
}

/** The captured prompt, or null where the browser offers none. */
export function installPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}
