export interface DashboardTile {
  id: string;
  label: string;
  /** Missing kind is treated as a web tile for backwards compatibility. */
  kind?: 'web' | 'app';
  url: string;
  /** Android package name for native-app tiles. */
  packageName?: string;
  /** Restrict WebView navigation to this tile's URL origin by default. */
  restrictNavigation?: boolean;
  /** Extra HTTPS origins required by a particular site's login flow. */
  extraAllowedOrigins?: string[];
  iconMode: 'favicon' | 'image' | 'letter';
  iconValue?: string;
  order: number;
}
