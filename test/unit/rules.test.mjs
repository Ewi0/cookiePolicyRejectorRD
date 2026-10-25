// Shape of every rule in rules.js, and the generated prehide.css that depends on it.
// Whether each selector parses is checked in real browsers by e2e.mjs and firefox-e2e.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PREHIDE, prehideCss } from '../../scripts/gen-prehide.mjs';
import { loadContent } from './load.mjs';

const RULES = loadContent('rules.js').rules;
const KINDS = ['reject', 'accept', 'save', 'settings'];
const isSelector = (s) => typeof s === 'string' && s.trim().length > 0;

function checkPlan(where, plan) {
  if (typeof plan === 'string') return assert.ok(isSelector(plan), where);
  assert.ok(Array.isArray(plan) && plan.length, `${where}: a plan is a selector or a list of steps`);
  for (const step of plan) {
    const actions = ['click', 'text', 'uncheck'].filter((k) => k in step);
    assert.equal(actions.length, 1, `${where}: each step does exactly one thing`);
    if (step.click) assert.ok(isSelector(step.click), `${where}: click`);
    if (step.uncheck) assert.ok(isSelector(step.uncheck), `${where}: uncheck`);
    if (step.text) {
      assert.ok(KINDS.includes(step.text), `${where}: text must be one of ${KINDS}`);
      assert.ok(isSelector(step.in), `${where}: text steps need an "in" selector`);
    }
  }
}

test('rules.js has rules', () => {
  assert.ok(RULES.length >= 40, `only ${RULES.length} rules`);
});

test('every rule is well formed', () => {
  for (const [i, r] of RULES.entries()) {
    const where = `rule ${i} (${r.name})`;
    assert.ok(typeof r.name === 'string' && r.name.length > 0 && r.name.length <= 24, `${where}: name fits the popup`);
    assert.ok(isSelector(r.detect), `${where}: detect`);
    if (r.root !== undefined) assert.ok(isSelector(r.root), `${where}: root`);
    for (const key of ['hide', 'unlock']) {
      if (r[key] !== undefined) assert.ok(Array.isArray(r[key]) && r[key].every(isSelector), `${where}: ${key}`);
    }
    assert.ok([undefined, true, 'any'].includes(r.frame), `${where}: frame`);
    if (r.url !== undefined) assert.equal(typeof r.url.test, 'function', `${where}: url is a RegExp`);
    if (r.delegate !== undefined) {
      assert.ok(Number.isFinite(r.delegate) && r.delegate > 0, `${where}: delegate is a wait in ms`);
      continue;
    }
    for (const mode of ['reject', 'accept']) {
      assert.ok(Array.isArray(r[mode]) && r[mode].length, `${where}: needs ${mode} plans`);
      r[mode].forEach((plan, p) => checkPlan(`${where} ${mode}[${p}]`, plan));
    }
  }
});

test('prehide.css is generated from the current rules', () => {
  assert.equal(readFileSync(PREHIDE, 'utf8'), prehideCss().css, 'run npm run prehide');
});
