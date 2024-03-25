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
