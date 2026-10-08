'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_PATH = '.github/workflows/deploy-pages.yml';
const V2_DIR = 'C:/Users/cleys/AppData/Local/Temp/yamlcheck';
const V1_DIR = 'C:/Users/cleys/AppData/Local/Temp/yamlcheck1';

const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');

function loadModule(dir, name) {
  return require(path.join(dir, 'node_modules', name));
}

function run(label, fn) {
  try {
    const result = fn();
    console.log(`${label}: OK`);
    if (result !== undefined) {
      console.log('    value:', JSON.stringify(result).slice(0, 200));
    }
  } catch (error) {
    console.log(`${label}: FAIL -> ${String(error).slice(0, 600)}`);
  }
}

function checkYamlV2() {
  const yaml = loadModule(V2_DIR, 'yaml');
  run('yaml@2 parseDocument({strict})', () => {
    const doc = yaml.parseDocument(source, { strict: true });
    if (doc.errors.length > 0) {
      throw new Error(doc.errors.map((e) => `${e.code} @ ${JSON.stringify(e.linePos)} :: ${e.message}`).join(' ;; '));
    }
    return doc.toJS();
  });
  run('yaml@2 parse()', () => yaml.parse(source));
}

function checkYamlV1() {
  const YAML = loadModule(V1_DIR, 'yaml');
  run('yaml@1 parseAllDocuments', () => {
    const docs = YAML.parseAllDocuments(source);
    const problems = [];
    for (const doc of docs) {
      for (const err of doc.errors) problems.push(`ERROR ${String(err)}`);
      for (const warn of doc.warnings) problems.push(`WARN ${String(warn)}`);
    }
    if (problems.length > 0) throw new Error(problems.join(' ;; '));
    return docs.map((doc) => doc.toJSON());
  });
  run('yaml@1 parse()', () => YAML.parse(source));
}

function checkJsYaml() {
  const jsYaml = loadModule(V2_DIR, 'js-yaml');
  run('js-yaml load()', () => jsYaml.load(source));
}

const checks = {
  v2: checkYamlV2,
  v1: checkYamlV1,
  jsyaml: checkJsYaml,
};

const requested = process.argv[2];
if (requested && checks[requested]) {
  checks[requested]();
} else {
  Object.values(checks).forEach((check) => check());
}
