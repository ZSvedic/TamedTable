// #BenchE1
// E1's fetch wrapper. It sits where the cassette recorder sits, between the
// headless runner and the model API, and hands every "change the table" turn
// to the stand-in chat model instead of the recorded planner. Everything else
// (questions, cell calls, suggestions) replays from the cassette, or goes live
// when a changed plan asks for a cell prompt the cassette never recorded. The
// scenario's own Then steps then grade the result.

import { requestBody, type FetchLike } from '@tamedtable/cassette';
import { applyAndValidate } from '@tamedtable/headless';
import type { TablePlan } from '@tamedtable/table-plan';
import type { CandidateStep } from './candidate.ts';
import { decodeRecordedOps, parsePlannerRequest, patchAnswer, recordedCall, replyAnswer } from './wire.ts';

/** The chat half of the stand-in: CandidateChat, or a fake in unit tests. */
export interface Chat {
  readonly system: string;
  readonly toolsChars: number;
  newTurn(spec: TablePlan, request: string, prior?: string): void;
  rejected(error: string): void;
  step(spec: TablePlan): Promise<CandidateStep>;
}

export interface Attempt {
  /** Who refused the previous attempt, or 'first' for the opening one. */
  after: 'first' | 'schema' | 'engine';
  ops?: unknown[];
  summary?: string;
  text?: string;
  /** Why the plan was refused; unset when it went through. */
  error?: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

export interface TurnLog {
  request: string;
  /** The recorded planner's ops for the same request and table, when the
   *  cassette holds them: the scenario diverged from the tape otherwise. */
  reference?: unknown[];
  attempts: Attempt[];
  /** committed: a plan reached the engine and nothing sent it back.
   *  no-plan: the model answered in words. gave-up: every attempt refused. */
  outcome: 'committed' | 'no-plan' | 'gave-up';
}

export interface E1Session {
  turns: TurnLog[];
  /** Calls the cassette could not serve and that went to the live API. */
  liveCalls: number;
  /** Questions answered by the recorded planner, not the stand-in. */
  questions: number;
  promptChars: number;
  errors: string[];
  /** The text of the step that failed the scenario, if one did. */
  failedStep?: string;
}

export interface E1FetchOptions {
  chat: Chat;
  /** Replays the scenario's cassette; throws on a miss. */
  replay: FetchLike;
  /** The live API, for calls the cassette cannot serve. */
  live: FetchLike;
  /** Attempts per turn, schema and engine refusals together. */
  maxAttempts?: number;
}

export function newSession(chat: Chat): E1Session {
  return { turns: [], liveCalls: 0, questions: 0, promptChars: chat.system.length + chat.toolsChars, errors: [] };
}

export function e1Fetch(opts: E1FetchOptions, session: E1Session): FetchLike {
  const { chat, replay, live } = opts;
  const maxAttempts = opts.maxAttempts ?? 4;

  const replayOrLive: FetchLike = async (input, init) => {
    try {
      return await replay(input, init);
    } catch {
      session.liveCalls++;
      return live(input, init);
    }
  };

  /** Ask the model until a plan passes the schema or the attempts run out. */
  const attempt = async (turn: TurnLog, spec: TablePlan, after: Attempt['after']): Promise<Response> => {
    let why = after;
    while (turn.attempts.length < maxAttempts) {
      const s = await chat.step(spec);
      const a: Attempt = { after: why, text: s.text || undefined, inputTokens: s.inputTokens, outputTokens: s.outputTokens, ms: s.ms };
      turn.attempts.push(a);
      if (!s.plan) {
        turn.outcome = 'no-plan';
        return replyAnswer(s.text);
      }
      a.ops = s.plan.ops;
      a.summary = s.plan.summary;
      // The MCP server validates the recipe before it runs anything: the same
      // check headless applies to its own planner's patches.
      const tried = applyAndValidate(spec, s.plan.ops);
      if (tried.kind === 'ok') {
        turn.outcome = 'committed';
        return patchAnswer(s.plan.ops, s.plan.summary);
      }
      a.error = tried.message;
      chat.rejected(tried.message);
      why = 'schema';
    }
    turn.outcome = 'gave-up';
    return replyAnswer('I could not write a valid change for that.');
  };

  return async (input, init) => {
    const turn = parsePlannerRequest(requestBody(init));
    if (!turn) return replayOrLive(input, init);
    try {
      if (turn.kind === 'followup') return await replayOrLive(input, init);

      if (turn.kind === 'recovery') {
        // The runner ran the committed plan and the engine refused it.
        const last = session.turns.at(-1);
        if (!last || last.outcome !== 'committed') throw new Error('E1: recovery turn with no committed plan before it');
        last.attempts.at(-1)!.error = turn.error;
        chat.rejected(turn.error);
        return await attempt(last, turn.spec, 'engine');
      }

      // A fresh request. The cassette says whether the recorded planner
      // changed the table here; a question stays the planner's to answer.
      let reference: unknown[] | undefined;
      try {
        const hit = await replay(input, init);
        const call = recordedCall(await hit.clone().text());
        if (call && call.name !== 'apply_spec_patch') {
          session.questions++;
          return hit;
        }
        if (call) reference = decodeRecordedOps(call);
      } catch { /* the scenario left the tape: the stand-in decides */ }

      const log: TurnLog = { request: turn.request, reference, attempts: [], outcome: 'gave-up' };
      session.turns.push(log);
      chat.newTurn(turn.spec, turn.request, turn.prior);
      const res = await attempt(log, turn.spec, 'first');
      if (log.outcome === 'no-plan' && !reference) {
        // Off the tape and the model chose to answer in words: likely a
        // question, which E1 does not grade. Let the real planner take it.
        session.turns.pop();
        session.questions++;
        return replayOrLive(input, init);
      }
      return res;
    } catch (e) {
      session.errors.push((e as Error).message);
      throw e;
    }
  };
}
