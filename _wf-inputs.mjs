import fs from 'node:fs';

const MODULE_URL =
  'file:///C:/Users/cleys/AppData/Local/Temp/actionsprobe/node_modules/@actions/workflow-parser/dist/index.js';
const WORKFLOW_PATH = '.github/workflows/deploy-pages.yml';

const { parseWorkflow, NoOperationTraceWriter } = await import(MODULE_URL);

const text = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const bytes = fs.readFileSync(WORKFLOW_PATH);
const lines = text.split(/\r?\n/);

const variants = [
  ['string utf8', text],
  ['Buffer', bytes],
  ['Uint8Array', new Uint8Array(bytes)],
  ['array of lines', lines],
  ['object {content}', { content: text }],
  ['Buffer.toString utf8', bytes.toString('utf8')],
  ['string with BOM', '\uFEFF' + text],
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
    console.log(`${label}: THREW ${String(thrown).slice(0, 200)}`);
    continue;
  }
  console.log(`${label}: ${errors.length} error(s)`);
  for (const error of errors.slice(0, 3)) {
    console.log(`    "${error.message}" | ${describeRange(error.range)}`);
  }
}
