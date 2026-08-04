// #SaveGate — the waiting phase of the Python export, which the @web scenario
// in save-py.feature cannot pin down: there the model answers from the cassette
// before the next step runs. Here the export's model call is held at the
// injected fetch, so the gate can be caught mid-wait — bar animating, "Save
// file…" still disabled and no picker opened — and then released.
//
// #StepDefSurface — everything below drives the public controller surface only
// (construction options, savePython, confirmSaveGate, dismissSaveGate). The
// model call is held at the fetch seam rather than by reaching into the engine,
// which is also the only way a real browser could stall it.
import { describe, it, expect } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createWebController, type FilePort } from '@tamedtable/web';
import { makeBackend, makeFetch, SPEC_TC, tick } from './lazy-harness.util.ts';

/** A controller with a table loaded, its save picker recorded, and its model
 *  calls held open until `release()`. */
async function heldExportApp(script = 'print("hi")\n'): Promise<{
  app: ReturnType<typeof createWebController>;
  saves: string[];
  release: () => void;
  calls: () => number;
}> {
  const saves: string[] = [];
  const filePort = {
    hasFileSystemAccess: true,
    pickOpen: async () => null,
    pickSave: async (name: string) => {
      saves.push(name);
      return { status: 'saved' as const, name };
    },
  };
  const answer = makeFetch(makeBackend(() => script));
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  let calls = 0;
  const app = createWebController({
    file: filePort as unknown as FilePort,
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      calls++;
      await held;
      return answer(input, init);
    },
    env: {},
    config: { geminiKey: 'fake-key' } as never,
  });
  const bytes = new Uint8Array(await readFile(join(SPEC_TC, 'customers-input.csv')));
  await app.loadFromBytes('customers-input.csv', bytes);
  return { app, saves, release, calls: () => calls };
}

describe('#SaveGate — Save recipe as Python', () => {
  it('opens waiting, enables the button when the script lands, then writes', async () => {
    const { app, saves, release } = await heldExportApp();
    const pending = app.savePython();
    await tick();

    // Waiting: the dialog is up and says so, and the picker has not opened —
    // opening it here is the bug from issue #278.
    expect(app.saveGate?.busy).toBe(true);
    expect(app.saveGate?.title).toBe('Writing the Python script');
    expect(saves).toEqual([]);

    release();
    await pending;

    // Ready: same dialog, new wording, button live — still no picker until the
    // user clicks, because that click is the gesture the picker needs.
    expect(app.saveGate?.busy).toBe(false);
    expect(app.saveGate?.title).toBe('Python script ready');
    expect(saves).toEqual([]);

    await app.confirmSaveGate();
    expect(saves).toEqual(['customers-input.py']);
    expect(app.saveGate).toBe(null);
  });

  it('ignores a confirm that arrives while the gate is still waiting', async () => {
    const { app, saves, release } = await heldExportApp();
    const pending = app.savePython();
    await tick();

    await app.confirmSaveGate();
    // The wait survives the stray confirm — it must not cancel the export or
    // reach the picker with nothing written yet.
    expect(app.saveGate?.busy).toBe(true);
    expect(saves).toEqual([]);

    release();
    await pending;
    await app.confirmSaveGate();
    expect(saves).toEqual(['customers-input.py']);
  });

  it('drops the script when the ready gate is cancelled', async () => {
    const { app, saves, release } = await heldExportApp();
    const pending = app.savePython();
    await tick();
    release();
    await pending;

    app.dismissSaveGate();
    expect(app.saveGate).toBe(null);
    // A confirm after the cancel has nothing parked, so nothing is written.
    await app.confirmSaveGate();
    expect(saves).toEqual([]);
  });

  it('cancelling mid-wait keeps the late script off the screen', async () => {
    const { app, saves, release } = await heldExportApp();
    const pending = app.savePython();
    await tick();
    expect(app.saveGate?.busy).toBe(true);

    app.dismissSaveGate();
    expect(app.saveGate).toBe(null);
    // The model call cannot be recalled — it lands after the cancel and must
    // not reopen the gate the user just dismissed.
    release();
    await pending;
    expect(app.saveGate).toBe(null);
    await app.confirmSaveGate();
    expect(saves).toEqual([]);
  });

  it('reports a failed export as an error toast, not a stuck dialog', async () => {
    // An empty script is the failure the export raises by itself.
    const { app, saves, release } = await heldExportApp('');
    const pending = app.savePython();
    await tick();
    release();
    await pending;

    expect(app.saveGate).toBe(null);
    expect(saves).toEqual([]);
    const toast = app.toasts.at(-1);
    expect(toast?.kind).toBe('error');
    expect(toast?.message).toContain('Could not export to Python');
  });
});
