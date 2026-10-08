import fs from 'node:fs';

const MODULE_URL =
  'file:///C:/Users/cleys/AppData/Local/Temp/actionsprobe/node_modules/@actions/workflow-parser/dist/index.js';
const WORKFLOW_PATH = '.github/workflows/deploy-pages.yml';

const { parseWorkflow, NoOperationTraceWriter } = await import(MODULE_URL);

const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const scriptOnly = source
  .split(/\r?\n/)
  .slice(26, 46)
  .map((line) => line.replace(/^\s+/, ''))
  .join('\n');

const variants = [
  ['empty string', ''],
  ['comment only', '# .github/workflows/deploy-pages.yml\n'],
  ['separator only', '---\n'],
  ['document end only', '...\n'],
  ['path string (backslash)', '.github\\workflows\\deploy-pages.yml'],
  ['path string (slash)', '.github/workflows/deploy-pages.yml'],
  ['utf16le decode of file', fs.readFileSync(WORKFLOW_PATH, 'utf16le')],
  ['latin1 decode of file', fs.readFileSync(WORKFLOW_PATH, 'latin1')],
  ['script-only text', scriptOnly],
  ['four nul bytes', '\u0000\u0000\u0000\u0000'],
  ['nul + name line', '\u0000name: x\n'],
  ['js code only', "const fs = require('node:fs');\n"],
  ['full file (control)', source],
];

function describeRange(range) {
  if (!range) return 'NO RANGE';
  return `${range.start.line}:${range.start.column}-${range.end.line}:${range.end.column}`;
}

for (const [label, content] of variants) {
  let errors;
  try {
    const result = parseWorkflow({ name: '.github/workflows/deploy-pages.yml', content }, new NoOperationTraceWriter());
    errors = result.context.errors.getErrors();
  } catch (thrown) {
    console.log(`${label}: THREW ${String(thrown).slice(0, 140)}`);
    continue;
  }
  console.log(`${label}: ${errors.length} error(s)`);
  for (const error of errors.slice(0, 2)) {
    console.log(`    "${error.message}" | ${describeRange(error.range)}`);
  }
}
