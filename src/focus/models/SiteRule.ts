export interface SiteRule {
  id: string;
  domain: string;
  path?: string;
  allowanceMinutes: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Cleanly normalizes a raw URL or domain string.
 * Strips protocol, port, search parameters, hashes, and trailing slashes.
 * Extracts clean domain and optional normalized path.
 */
export function normalizeRuleInput(rawInput: string): { domain: string; path?: string; isValid: boolean } {
  if (!rawInput || typeof rawInput !== 'string') {
    return { domain: '', isValid: false };
  }

  let cleaned = rawInput.trim().toLowerCase();
  // Strip protocol if present
  cleaned = cleaned.replace(/^[a-z]+:\/\//, '');
  // Strip www. prefix for consistent root matching
  cleaned = cleaned.replace(/^www\./, '');
  // Strip port
  cleaned = cleaned.replace(/:[0-9]+/, '');
  // Strip query params and hashes
  cleaned = cleaned.split('?')[0].split('#')[0];
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  if (!cleaned) {
    return { domain: '', isValid: false };
  }

  // Split into domain and path parts
  const slashIndex = cleaned.indexOf('/');
  let domain = slashIndex === -1 ? cleaned : cleaned.substring(0, slashIndex);
  let rulePath = slashIndex === -1 ? undefined : cleaned.substring(slashIndex);

  // Clean path: ensure starts with '/' and remove redundant slashes
  if (rulePath) {
    rulePath = '/' + rulePath.replace(/^\/+/, '').replace(/\/+$/, '');
    if (rulePath === '/') {
      rulePath = undefined;
    }
  }

  // Validate domain format (letters, digits, hyphens, dots; at least one dot or localhost)
  const isValidDomain =
    domain === 'localhost' ||
    (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain) &&
      domain.length <= 253);

  return {
    domain,
    path: rulePath,
    isValid: isValidDomain,
  };
}

/**
 * Creates a valid SiteRule from user input.
 * Throws an Error if the domain is invalid.
 */
export function createSiteRule(
  rawInput: string,
  allowanceMinutes: number,
  options: { id?: string; enabled?: boolean } = {}
): SiteRule {
  const parsed = normalizeRuleInput(rawInput);
  if (!parsed.isValid) {
    throw new Error(`Invalid domain or URL pattern: "${rawInput}"`);
  }

  const now = Date.now();
  return {
    id: options.id || `rule_${now}_${Math.random().toString(36).substring(2, 8)}`,
    domain: parsed.domain,
    path: parsed.path,
    allowanceMinutes: Math.max(0, Math.floor(allowanceMinutes)),
    enabled: options.enabled !== undefined ? options.enabled : true,
    createdAt: now,
    updatedAt: now,
  };
}
