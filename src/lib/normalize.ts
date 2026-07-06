/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalizes string by converting to lowercase, removing accents and special symbols
 * to allow accurate fuzzy matching.
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics accents
    .replace(/[^a-z0-9\s]/g, '') // Keep alphanumeric and spaces only
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();
}
