import type { DashboardTile } from '../types/dashboard';
import { isValidPackageName } from '../types/managedApps';

/** Legacy tiles with no `kind` remain website tiles. */
export function isAndroidDashboardTile(tile: DashboardTile): boolean {
  return tile.kind === 'app' && !!tile.packageName && isValidPackageName(tile.packageName);
}

/**
 * Reuse the existing WebView URL whitelist matcher.
 * Return null if the tile intentionally has navigation restriction disabled.
 */
export function getWebTileAllowedPatterns(tile: DashboardTile | null): string[] | null {
  if (!tile || tile.kind === 'app' || tile.restrictNavigation === false) return null;
  const siteOrigin = tile.url.match(/^https?:\/\/[^/?#]+/i)?.[0];
  if (!siteOrigin) return [];
  const extra = (tile.extraAllowedOrigins || []).filter(origin =>
    /^https?:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(origin)
  );
  return [...new Set([siteOrigin, ...extra])].map(origin => `${origin}/*`);
}
