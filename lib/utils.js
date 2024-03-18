import path from 'node:path';

const PLATFORM_INDEPENDENT_SEPARATOR = '/';

/**
 * @param {string} moduleName
 * @returns {string}
 */
export function platformIndependentPath (moduleName) {
  return moduleName.replaceAll(path.sep, PLATFORM_INDEPENDENT_SEPARATOR);
}

/**
 * @param {string} moduleName
 * @returns {string}
 */
export function platformSpecificPath (moduleName) {
  return moduleName.replaceAll(PLATFORM_INDEPENDENT_SEPARATOR, path.sep);
}

/**
 * @param {unknown} value
 * @returns {value is NodeJS.ErrnoException}
 */
export function looksLikeAnErrnoException (value) {
  return value instanceof Error && 'code' in value && 'path' in value;
}

/**
 * @param {string[]} filter
 * @param {string} name
 * @param {string} cwd
 * @param {string} baseCwd
 * @returns {false|string}
 */
export function includeWorkspace (filter, name, cwd, baseCwd) {
  const referenceCwd = path.resolve(process.cwd(), baseCwd);

  for (const item of filter) {
    if (item === name) {
      return item;
    }

    if (cwd.startsWith(path.resolve(referenceCwd, item))) {
      return item;
    }
  }

  return false;
}
