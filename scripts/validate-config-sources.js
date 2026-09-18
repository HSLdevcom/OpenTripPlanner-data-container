#!/usr/bin/env node
// CI-friendly validation of every configs/<name>/config.js data source
// definition file. Unlike loading via src/config.js, this does not require
// ROUTER_NAME or any other runtime/Docker environment variables, so it can
// run as a plain lint-style check (see the `validate-configs` npm script).

const fs = require('fs');
const path = require('path');
const {
  validateConfigSources,
} = require('../src/utils/validateConfigSources.js');

const configsDir = path.resolve(__dirname, '../configs');

const routerNames = fs
  .readdirSync(configsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(name => fs.existsSync(path.join(configsDir, name, 'config.js')));

let hasErrors = false;

routerNames.forEach(name => {
  const config = require(path.join(configsDir, name, 'config.js'));
  const errors = validateConfigSources(name, config);
  if (errors.length > 0) {
    hasErrors = true;
    console.error(`configs/${name}/config.js is invalid:`);
    errors.forEach(error => console.error(`  - ${error}`));
  }
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log(`All ${routerNames.length} router config(s) passed validation.`);
}
