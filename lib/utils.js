/**
 * @param {unknown} value
 * @returns {value is NodeJS.ErrnoException}
 */
export function looksLikeAnErrnoException (value) {
  return value instanceof Error && 'code' in value && 'path' in value;
}
