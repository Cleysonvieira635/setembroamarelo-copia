import fs from 'node:fs';

const MODULE_URL =
  'file:///C:/Users/cleys/AppData/Local/Temp/actionsprobe/node_modules/@actions/workflow-parser/dist/index.js';
const WORKFLOW_PATH = '.github/workflows/deploy-pages.yml';

const { parseWorkflow, NoOperationTraceWriter } = await import(MODULE_URL);

const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');

function dedentEveryLine(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s+/, ''))
    .join('\n');
}

const variants = [
  ['<empty string>', ''],
  ['newline only', '\n'],
  ['crlf only', '\r\n'],
  ['two newlines', '\n\n'],
  ['full file (control)', source],
  ['full file, lf only', source.replace(/\r\n/g, '\n')],
  ['full file, bom prefix', '\uFEFF' + source],
  ['first 2048 chars', source.slice(0, 2048)],
  ['first 1000 chars', source.slice(0, 1000)],
  ['first line only', source.split(/\r?\n/)[0]],
  ['without first line', source.split(/\r?\n/).slice(1).join('\n')],
  ['all lines de-indented', dedentEveryLine(source)],
  ['leading blank line added', '\n' + source],
];

function describeRange(range) {
  if (!range) return 'no range';
  return `start=${range.start.line}:${range.start.column} end=${range.end.line}:${range.end.column}`;
}

for (const [label, content] of variants) {
  let errors;
  try {
    const result = parseWorkflow({ name: '.github/workflows/deploy-pages.yml', content }, new NoOperationTraceWriter());
    errors = result.context.errors.getErrors();
  } catch (thrown) {
    console.log(`${label}: THREW ${String(thrown).slice(0, 200)}`);
    continue;
  }
  console.log(`${label}: ${errors.length} error(s)`);
  for (const error of errors.slice(0, 3)) {
    console.log(`    ${error.message} | ${describeRange(error.range)}`);
  }
}
