// Ports the WebController depends on. Keeping these as plain interfaces lets
// the controller stay framework- and DOM-free: the browser supplies a File
// System Access API implementation, the Cucumber suite supplies an in-memory
// stub, and the controller itself never imports either.

/** A file the user picked from an Open dialog. */
export interface PickedFile {
  /** The file's display name, e.g. "customers.csv". */
  name: string;
  /** The full text content of the file. */
  text: string;
}

/** The result of a Save dialog handshake. */
export type SaveOutcome =
  | { status: 'saved'; name: string }
  | { status: 'downloaded'; name: string }
  | { status: 'cancelled' };

/**
 * File input/output for the web shell. The browser implementation uses the
 * File System Access API where available and falls back to a download/upload
 * for browsers that lack it; `hasFileSystemAccess` reports which path is live.
 */
export interface FilePort {
  /** True when the File System Access API is available in this browser. */
  readonly hasFileSystemAccess: boolean;
  /** Show an Open dialog. Resolves with the picked file, or null if cancelled. */
  pickOpen(accept: string[]): Promise<PickedFile | null>;
  /** Show a Save dialog and write `content` to the chosen destination. */
  pickSave(suggestedName: string, accept: string[], content: string): Promise<SaveOutcome>;
}

/** The plain `fetch` call signature a wrapper actually implements. */
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
