/// <reference lib="dom" />
// #FileIO
// Browser implementation of FilePort. Uses the File System Access API where
// the browser supports it, and falls back to a hidden <input type=file> for
// Open and a download anchor for Save where it does not.

import type { FilePort, PickedFile, SaveOutcome } from './index.ts';

interface FsAccessWindow {
  showOpenFilePicker?: (opts: unknown) => Promise<Array<{ getFile(): Promise<File> }>>;
  showSaveFilePicker?: (opts: unknown) => Promise<{
    name: string;
    createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  }>;
}

const fsWindow = (): FsAccessWindow => window as unknown as FsAccessWindow;

export class BrowserFilePort implements FilePort {
  readonly hasFileSystemAccess: boolean =
    typeof window !== 'undefined' && typeof fsWindow().showOpenFilePicker === 'function';

  async pickOpen(accept: string[]): Promise<PickedFile | null> {
    if (this.hasFileSystemAccess) {
      try {
        const [handle] = await fsWindow().showOpenFilePicker!({
          multiple: false,
          types: [{ description: 'Tables', accept: { 'text/*': accept } }],
        });
        if (!handle) return null;
        const file = await handle.getFile();
        return { name: file.name, text: await file.text() };
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return null;
        throw e;
      }
    }
    return this.pickOpenFallback(accept);
  }

  private pickOpenFallback(accept: string[]): Promise<PickedFile | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept.join(',');
      input.style.display = 'none';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) {
          resolve(null);
          return;
        }
        file.text().then((text) => resolve({ name: file.name, text }), reject);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  async pickSave(suggestedName: string, accept: string[], content: string): Promise<SaveOutcome> {
    if (this.hasFileSystemAccess) {
      try {
        const handle = await fsWindow().showSaveFilePicker!({
          suggestedName,
          types: [{ description: 'Tables', accept: { 'text/*': accept } }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return { status: 'saved', name: handle.name };
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return { status: 'cancelled' };
        throw e;
      }
    }
    // Download fallback for browsers without the File System Access API.
    const url = URL.createObjectURL(new Blob([content], { type: 'application/octet-stream' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suggestedName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { status: 'downloaded', name: suggestedName };
  }
}
