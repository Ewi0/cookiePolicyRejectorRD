// Runs extension content scripts in a bare V8 context (no DOM) and returns their CPR namespace.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function loadContent(...files) {
  const sandbox = {};
  for (const f of files) {
    vm.runInNewContext(readFileSync(new URL(`../../extension/content/${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
  }
  return sandbox.CPR;
}
