// This file exists to avoid a circular dependency between config.js and utils/builderUtils.js.

/*
 * id = feedid (String)
 * url = feed url (String)
 * fit = mapfit shapes (true/falsy)
 * rules = OBA Filter rules to apply (array of strings or undefined)
 * replacements = replace or remove file from gtfs package (format: {'file_to_replace': 'file_to_replace_with' or null})
 * request options = optional special options for request
 */
const mapSrc = (id, url, fit, rules, replacements, request) => ({
  id,
  url,
  fit,
  rules,
  replacements,
  request,
});

module.exports = mapSrc;
