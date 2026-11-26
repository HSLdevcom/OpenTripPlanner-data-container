// This file exists to avoid a circular dependency between config.js and utils/builderUtils.js.

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

/**
 * Splits EXTRA_SRC instructions between gtfs and netex entries. Ids matching an
 * existing netex entry go to netex, as do brand-new ids whose patch has
 * `"type": "netex"` (the `type` key is stripped); everything else goes to gtfs.
 *
 * @param {Object.<string,Object>} extraSrc
 * @param {Object[]} [netexArray] - existing netex entries (each with an `id`).
 * @returns {{gtfs: Object.<string,Object>, netex: Object.<string,Object>}}
 */
const splitExtraSrc = (extraSrc, netexArray = []) => {
  const netexIds = netexArray.map(src => src.id);
  const gtfs = {};
  const netex = {};
  Object.keys(extraSrc).forEach(id => {
    const { type, ...patch } = extraSrc[id];
    if (netexIds.includes(id) || type === 'netex') {
      netex[id] = patch;
    } else {
      gtfs[id] = extraSrc[id];
    }
  });
  return { gtfs, netex };
};

module.exports = { applyExtraSrc, buildIdMap, splitExtraSrc };
