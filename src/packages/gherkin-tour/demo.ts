// #GherkinTour demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on ./index.ts).
import { parseTours } from './index.ts';

const sample = `Feature: Demo

  Background:
    Given load "people.csv"

  @tutorial
  Scenario: Filter adults
    When query "keep rows where age >= 18"
    Then the expected output is "adults.csv"
    And compare with the expected output
`;

const src = document.getElementById('src') as HTMLTextAreaElement;
const out = document.getElementById('out')!;
src.value = sample;

function render() {
  try {
    out.textContent = JSON.stringify(parseTours(src.value), null, 2);
  } catch (e) {
    out.textContent = String(e);
  }
}
src.addEventListener('input', render);
render();
