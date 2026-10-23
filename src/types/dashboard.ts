export interface DashboardTile {
  id: string;
  label: string;
  /** Missing kind is treated as a web tile for backwards compatibility. */
  kind?: 'web' | 'app';
  url: string;
  /** Android package name for native-app tiles. */
  packageName?: string;
  iconMode: 'favicon' | 'image' | 'letter';
  iconValue?: string;
  order: number;
}
