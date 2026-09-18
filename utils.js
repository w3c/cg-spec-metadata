import { readdir, readFile } from 'node:fs/promises';
import { logger } from './logger.js';

const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

const deepMerge = (target, source) => {
  let output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
};

// Reads overrides/<shortname>.json. A spec with no file has no overrides, and
// an empty object is the same as no file.
const loadOverrides = async (dir = './overrides') => {
  const overrides = new Map();

  let entries;
  try {
    entries = await readdir(dir);
  } catch (err) {
    if (err.code !== 'ENOENT') logger.error(`Could not read ${dir}`, err.message);
    return overrides;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;

    const shortname = entry.slice(0, -'.json'.length);
    try {
      const contents = await readFile(`${dir}/${entry}`, 'utf8');
      const patch = JSON.parse(contents);
      if (!isObject(patch)) {
        logger.error(`${dir}/${entry} is not an object; ignoring it`);
        continue;
      }
      if (Object.keys(patch).length) overrides.set(shortname, patch);
    } catch (err) {
      logger.error(`Could not read ${dir}/${entry}; ignoring it`, err.message);
    }
  }

  return overrides;
};

// Applies the overrides, keyed by shortname, to the collected results.
const mergeResultsWithOverride = (results, overrides) => {
  const applied = new Set();

  const merged = results.map(spec => {
    const patch = overrides.get(spec.shortname);
    if (!patch) return spec;

    applied.add(spec.shortname);
    logger.info(`Applying overrides for ${spec.shortname}: ${Object.keys(patch).join(', ')}`);
    return deepMerge(spec, patch);
  });

  for (const shortname of overrides.keys()) {
    if (!applied.has(shortname)) {
      logger.warn(`overrides/${shortname}.json does not match any spec in specs.json`);
    }
  }

  return merged;
}

export { loadOverrides, mergeResultsWithOverride };