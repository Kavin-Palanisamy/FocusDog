import { SiteRule, normalizeRuleInput } from '../models/SiteRule';

export interface MatchResult {
  rule: SiteRule;
  matchedUrl: string;
  matchedDomain: string;
  matchedPath?: string;
  isPathSpecific: boolean;
}

export class SiteRuleMatcher {
  /**
   * Evaluates candidate URL against an array of SiteRules.
   * Returns the best matching rule according to specificity precedence, or null.
   *
   * Precedence rules:
   * 1. Only enabled rules are matched.
   * 2. Path-specific rules take precedence over domain-only rules.
   * 3. Among path-specific rules, the longest path wins.
   * 4. Ties are broken deterministically by rule creation time or original index.
   */
  public static match(candidateUrl: string, rules: SiteRule[]): MatchResult | null {
    if (!candidateUrl || !rules || rules.length === 0) {
      return null;
    }

    const parsed = normalizeRuleInput(candidateUrl);
    if (!parsed.isValid) {
      return null;
    }

    const candidateDomain = parsed.domain;
    const candidatePath = parsed.path || '/';

    // Filter candidate matches
    const matches: Array<{
      rule: SiteRule;
      pathLength: number;
      isPathMatch: boolean;
    }> = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      // 1. Domain match check
      // Rule domain matches candidate if exact match or candidate is a subdomain of rule domain
      const isDomainMatch =
        candidateDomain === rule.domain || candidateDomain.endsWith('.' + rule.domain);

      if (!isDomainMatch) continue;

      // 2. Path match check
      if (rule.path) {
        // Path rule: candidate path must start with rule path
        // Ensure path boundary: "/shorts" matches "/shorts" and "/shorts/123", but not "/shortsville"
        const normalizedRulePath = rule.path.toLowerCase();
        const candidatePathLower = candidatePath.toLowerCase();

        const matchesPathPrefix =
          candidatePathLower === normalizedRulePath ||
          candidatePathLower.startsWith(normalizedRulePath + '/');

        if (matchesPathPrefix) {
          matches.push({
            rule,
            pathLength: normalizedRulePath.length,
            isPathMatch: true,
          });
        }
      } else {
        // Root domain rule
        matches.push({
          rule,
          pathLength: 0,
          isPathMatch: false,
        });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by precedence:
    // 1. Path-specific matches first (descending by path length)
    // 2. Original order / stability
    matches.sort((a, b) => {
      if (a.isPathMatch && !b.isPathMatch) return -1;
      if (!a.isPathMatch && b.isPathMatch) return 1;
      if (a.isPathMatch && b.isPathMatch) {
        return b.pathLength - a.pathLength; // Longest path first
      }
      return 0;
    });

    const best = matches[0];
    return {
      rule: best.rule,
      matchedUrl: candidateUrl,
      matchedDomain: candidateDomain,
      matchedPath: best.rule.path,
      isPathSpecific: best.isPathMatch,
    };
  }
}
