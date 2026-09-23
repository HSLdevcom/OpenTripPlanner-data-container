// Validates the shape of a router's `configs/<name>/config.js` data source
// definitions. This is deliberately named around "config sources" rather than
// "router config" to avoid confusion with OTP's own `router-config.json`
// and `build-config.json` output files, which are unrelated artifacts
// produced elsewhere in this pipeline (see PrepareRouterData.js).
//
// The JSDoc typedefs below are the single source of truth for which fields
// are supported in a config.js file's `gtfs`/`netex` entries; keep them in
// sync with the validation logic that follows.

/**
 * A single GTFS data source entry in a config.js file's `gtfs` array.
 *
 * @typedef {Object} GtfsSourceConfig
 * @property {string} id - Feed id, used as the OTP feedId and in derived filenames.
 * @property {string} url - Feed download URL.
 * @property {boolean} [fit] - Whether to run mapFit (shape snapping) on this feed.
 * @property {string[]} [rules] - OBA Filter rule file paths to apply, in order.
 * @property {Object.<string,string|null>} [replacements] - Map of file to replace ->
 *   replacement file name (or `null` to just remove the file), applied before packaging.
 * @property {Object} [request] - Extra axios request options (e.g. custom headers) for
 *   the download.
 * @property {boolean} [taxiProvider] - Whether this feed is exclusively a source of taxi
 *   provider data (OTP's `taxiProvider` build-config flag).
 */
const GTFS_ENTRY_FIELDS = {
  id: { required: true, type: 'string' },
  url: { required: true, type: 'string' },
  fit: { required: false, type: 'boolean' },
  rules: { required: false, type: 'string[]' },
  replacements: { required: false, type: 'object' },
  request: { required: false, type: 'object' },
  taxiProvider: { required: false, type: 'boolean' },
};

/**
 * A single NeTEx data source entry in a config.js file's `netex` array.
 *
 * @typedef {Object} NetexSourceConfig
 * @property {string} id - Feed id, used as the OTP feedId and in derived filenames.
 * @property {string} url - Feed download URL.
 * @property {string} [groupFilePattern] - Regex used by OTP to group per-line NeTEx files.
 * @property {string} [sharedFilePattern] - Regex used by OTP to identify shared NeTEx files.
 */
const NETEX_ENTRY_FIELDS = {
  id: { required: true, type: 'string' },
  url: { required: true, type: 'string' },
  groupFilePattern: { required: false, type: 'string' },
  sharedFilePattern: { required: false, type: 'string' },
};

/**
 * Shape of a `configs/<name>/config.js` module's exported object.
 *
 * @typedef {Object} ConfigSources
 * @property {string} id - Must match the containing directory name.
 * @property {GtfsSourceConfig[]} gtfs - GTFS data sources.
 * @property {NetexSourceConfig[]} [netex] - NeTEx data sources.
 * @property {string[]} osm - Non-empty list of OSM source ids (see `src/config.js`).
 * @property {string} [dem] - DEM source id (see `src/config.js`).
 */

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateFieldType(label, field, value, type, errors) {
  if (type === 'string' && typeof value !== 'string') {
    errors.push(`${label}.${field} must be a string`);
  } else if (type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${label}.${field} must be a boolean`);
  } else if (
    type === 'string[]' &&
    (!Array.isArray(value) || value.some(v => typeof v !== 'string'))
  ) {
    errors.push(`${label}.${field} must be an array of strings`);
  } else if (type === 'object' && !isPlainObject(value)) {
    errors.push(`${label}.${field} must be an object`);
  }
}

function validateEntry(label, entry, allowedFields, errors) {
  if (!isPlainObject(entry)) {
    errors.push(`${label} must be an object`);
    return;
  }
  Object.entries(allowedFields).forEach(([field, spec]) => {
    const value = entry[field];
    if (value === undefined) {
      if (spec.required) {
        errors.push(`${label} is missing required field "${field}"`);
      }
      return;
    }
    validateFieldType(label, field, value, spec.type, errors);
  });
  Object.keys(entry).forEach(key => {
    if (!(key in allowedFields)) {
      errors.push(`${label} has unknown field "${key}" (typo?)`);
    }
  });
}

function validateEntryArray(label, entries, allowedFields, errors) {
  if (!Array.isArray(entries)) {
    errors.push(`"${label}" must be an array`);
    return;
  }
  const seenIds = new Set();
  entries.forEach((entry, index) => {
    validateEntry(`${label}[${index}]`, entry, allowedFields, errors);
    if (isPlainObject(entry) && typeof entry.id === 'string') {
      if (seenIds.has(entry.id)) {
        errors.push(`"${label}" has duplicate id "${entry.id}"`);
      }
      seenIds.add(entry.id);
    }
  });
}

/**
 * Validates a `configs/<name>/config.js` module's exported object.
 *
 * @param {string} name - Directory name the config was loaded from, e.g. `finland`.
 * @param {ConfigSources} config - The exported config object to validate.
 * @returns {string[]} A list of human-readable problems found (empty if valid).
 */
function validateConfigSources(name, config) {
  if (!isPlainObject(config)) {
    return [`Config for "${name}" must export an object`];
  }

  const errors = [];

  if (config.id !== name) {
    errors.push(
      `Config "id" ("${config.id}") must match its directory name ("${name}")`,
    );
  }

  validateEntryArray('gtfs', config.gtfs, GTFS_ENTRY_FIELDS, errors);

  if (config.netex !== undefined) {
    validateEntryArray('netex', config.netex, NETEX_ENTRY_FIELDS, errors);
  }

  if (
    !Array.isArray(config.osm) ||
    config.osm.length === 0 ||
    config.osm.some(id => typeof id !== 'string')
  ) {
    errors.push('"osm" must be a non-empty array of strings');
  }

  if (config.dem !== undefined && typeof config.dem !== 'string') {
    errors.push('"dem" must be a string when present');
  }

  return errors;
}

module.exports = { validateConfigSources };
