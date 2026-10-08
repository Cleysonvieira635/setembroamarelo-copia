import fs from 'node:fs';

const DEFAULT_MODULE_URL =
  'file:///C:/Users/cleys/AppData/Local/Temp/actionsprobe/node_modules/@actions/workflow-parser/dist/index.js';
const DEFAULT_PATH = '.github/workflows/deploy-pages.yml';

const moduleUrl = process.argv[2] ?? DEFAULT_MODULE_URL;
const targetPath = process.argv[3] ?? DEFAULT_PATH;

const { parseWorkflow, NoOperationTraceWriter } = await import(moduleUrl);
const content = fs.readFileSync(targetPath, 'utf8');

function describeRange(range) {
  if (!range) return 'NO RANGE';
  return `${range.start.line}:${range.start.column}-${range.end.line}:${range.end.column}`;
}

console.log('module:', moduleUrl.replace(/^.*\/Temp\//, '%TEMP%/'));
console.log('file:', targetPath);

let result;
try {
  result = parseWorkflow({ name: targetPath, content }, new NoOperationTraceWriter());
} catch (thrown) {
  console.log('THREW:', String(thrown).slice(0, 300));
  process.exit(1);
}

const errors = result.context.errors.getErrors();
console.log('error count:', errors.length);
for (const error of errors.slice(0, 10)) {
  console.log(`  "${error.message}" | ${describeRange(error.range)}`);
}
