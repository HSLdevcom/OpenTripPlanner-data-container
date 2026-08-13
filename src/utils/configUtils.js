// This file exists to avoid a circular dependency between config.js and utils/builderUtils.js.

/**
 * Builds a gtfs source entry for a router config's `gtfs` array.
 *
 * @param {string} id - Feed id, used as the OTP feedId and in derived filenames.
 * @param {string} url - Feed download URL.
 * @param {boolean} [fit=false] - Whether to run mapFit (shape snapping) on this feed.
 * @param {string[]} [rules] - OBA Filter rule file paths to apply, in order.
 * @param {Object.<string,string|null>} [replacements] - Map of file to replace -> replacement
 *   file name (or `null` to just remove the file), applied before packaging.
 * @param {Object} [request] - Extra axios request options (e.g. custom headers) for the download.
 */
const mapSrc = (id, url, fit, rules, replacements, request) => ({
  id,
  url,
  fit,
  rules,
  replacements,
  request,
});

/**
 * Applies id -> patch overrides from the EXTRA_SRC env var format to a gtfs
 * array, returning a new array (does not mutate the input). For each id in
 * `extraSrc`:
 * - if a matching entry exists and the patch has `remove: true`, that entry
 *   is dropped;
 * - else if a matching entry exists, the patch is shallow-merged onto it;
 * - else the patch is appended as a brand-new entry (with `id` set).
 *
 * @param {Object[]} gtfsArray - existing gtfs entries (each with an `id`).
 * @param {Object.<string,Object>} extraSrc - id-keyed patch/remove/add instructions.
 * @returns {Object[]} a new gtfs array with overrides applied.
 */
const applyExtraSrc = (gtfsArray, extraSrc) => {
  const overriddenIds = [];
  const result = gtfsArray.reduce((acc, src) => {
    const patch = extraSrc[src.id];
    if (patch) {
      overriddenIds.push(src.id);
      if (patch.remove) {
        return acc;
      }
      acc.push({ ...src, ...patch });
    } else {
      acc.push(src);
    }
    return acc;
  }, []);
  Object.keys(extraSrc).forEach(id => {
    if (!overriddenIds.includes(id)) {
      result.push({ ...extraSrc[id], id });
    }
  });
  return result;
};

/**
 * Builds an id -> entry lookup map from an array of entries that each have
 * an `id` field.
 *
 * @param {Object[]} entries
 * @returns {Object.<string,Object>}
 */
const buildIdMap = entries => {
  const map = {};
  entries.forEach(entry => {
    map[entry.id] = entry;
  });
  return map;
};

module.exports = { mapSrc, applyExtraSrc, buildIdMap };
