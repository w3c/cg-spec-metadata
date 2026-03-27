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

// This function takes the collected results and applies the override data to produce the final data structure
const mergeResultsWithOverride = (results, override) => {
  return results.map(spec => {
    // Find the matching override by 'shortname'
    const patch = override.find(o => o.shortname === spec.shortname);
    
    if (patch) {
      return deepMerge(spec, patch);
    }
    
    return spec;
  });
}

export { mergeResultsWithOverride };