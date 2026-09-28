/**
 * URL normalization utility for FocusDog browser extension.
 * Normalizes active tab URLs to clean domains and paths while filtering out
 * internal/untracked browser pages.
 */

export interface NormalizedUrlResult {
  rawUrl: string;
  normalizedUrl: string | null;
  domain: string | null;
  path?: string;
  isTrackable: boolean;
  reason?: string;
}

export function normalizeBrowserUrl(rawUrl: string | undefined | null): NormalizedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      rawUrl: '',
      normalizedUrl: null,
      domain: null,
      isTrackable: false,
      reason: 'empty_url',
    };
  }

  const trimmed = rawUrl.trim();

  // Internal and special browser schemes (untracked)
  const untrackedPrefixes = [
    'chrome://',
    'edge://',
    'about:',
    'chrome-extension://',
    'extension://',
    'view-source:',
    'devtools://',
    'file://',
    'data:',
    'javascript:',
  ];

  for (const prefix of untrackedPrefixes) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      return {
        rawUrl: trimmed,
        normalizedUrl: null,
        domain: null,
        isTrackable: false,
        reason: 'internal_browser_page',
      };
    }
  }

  try {
    const parsed = new URL(trimmed);

    // Only HTTP and HTTPS are trackable web destinations
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        rawUrl: trimmed,
        normalizedUrl: null,
        domain: null,
        isTrackable: false,
        reason: 'unsupported_protocol',
      };
    }

    // Strip www. prefix for consistent root matching
    let domain = parsed.hostname.toLowerCase();
    domain = domain.replace(/^www\./, '');

    // Normalize path: ignore root slash only, preserve specific subpaths
    let path: string | undefined = parsed.pathname;
    if (path === '/' || !path) {
      path = undefined;
    } else {
      // Remove trailing slash for consistency
      path = path.replace(/\/+$/, '');
    }

    const normalizedUrl = path ? `${domain}${path}` : domain;

    return {
      rawUrl: trimmed,
      normalizedUrl,
      domain,
      path,
      isTrackable: true,
    };
  } catch {
    return {
      rawUrl: trimmed,
      normalizedUrl: null,
      domain: null,
      isTrackable: false,
      reason: 'malformed_url',
    };
  }
}
