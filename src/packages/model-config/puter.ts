// #ModelConfig — load Puter's optional SDK only after the user chooses it.
interface PuterSdk { auth: { signIn(): Promise<unknown> }; ai: { chat(prompt: string, options: Record<string, unknown>): Promise<unknown> } }
export async function loadPuterSdk(): Promise<PuterSdk> {
  const root = globalThis as { puter?: PuterSdk; document?: Document };
  if (root.puter) return root.puter;
  if (!root.document) throw new Error('Puter.js is available only in the web app.');
  await new Promise<void>((resolve, reject) => {
    const prior = root.document!.querySelector<HTMLScriptElement>('script[data-puter-sdk]');
    if (prior) { prior.addEventListener('load', () => resolve(), { once:true }); prior.addEventListener('error', () => reject(new Error('Puter.js did not load.')), { once:true }); return; }
    const script=root.document!.createElement('script'); script.src='https://js.puter.com/v2/'; script.dataset.puterSdk=''; script.onload=()=>resolve(); script.onerror=()=>reject(new Error('Puter.js did not load. Check your connection and try again.')); root.document!.head.append(script);
  });
  if (!root.puter) throw new Error('Puter.js loaded without an SDK.');
  return root.puter;
}
