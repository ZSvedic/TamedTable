// #BenchSweep
// @tamedtable/bench: the model & batch-size benchmark. A dev/research tool
// (not a shipped library): it drives the headless engine over the committed
// fixture across a grid of (model, batch size) configs and scores each on
// speed, cost, and accuracy against ground-truth labels.
//
// Code lives here (under src/, so it can import the engine); data and outputs
// live at the repo root under benchmarks/ (pricing table, ground truth, sweep
// results, generated charts, methodology). See benchmarks/README.md.
export * from './pricing.ts';
export * from './usage.ts';
export * from './score.ts';
export * from './sweep.ts';
export * from './charts.ts';
