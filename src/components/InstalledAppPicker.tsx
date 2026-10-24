/**
 * Application picker for Hybrid Dashboard.
 *
 * Follows FreeKiosk Managed Apps' installed-app discovery and visual language.
 * A dashboard tile must launch a real activity, not a headless system package.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AppLauncherModule, { type AppInfoAll } from '../utils/AppLauncherModule';
import { Colors, Spacing, Typography } from '../theme';
import Icon from './Icon';
import { filterInstalledApps } from '../utils/hybridDashboard';

type Props = {
  visible: boolean;
  selectedPackage?: string;
  onClose: () => void;
  onSelect: (app: AppInfoAll) => void;
};

export default function InstalledAppPicker({ visible, selectedPackage, onClose, onSelect }: Props) {
  const [allApps, setAllApps] = useState<AppInfoAll[]>([]);
  const [query, setQuery] = useState('');
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);
    setError('');
    setQuery('');
    setShowAllPackages(false);
    AppLauncherModule.getAllInstalledApps().then(apps => {
      if (active) setAllApps(apps);
    }).catch(err => {
      if (active) setError(String(err));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [visible]);

  const apps = filterInstalledApps(allApps, query, showAllPackages);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select installed application</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close application picker">
              <Icon name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search application or package"
            placeholderTextColor={Colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.search}
            accessibilityLabel="Search installed applications"
          />
          <View style={styles.toggleRow}>
            <Icon name="package-variant" size={16} color={Colors.textSecondary} />
            <Text style={styles.toggleLabel}>Show all packages (including services)</Text>
            <Switch value={showAllPackages} onValueChange={setShowAllPackages}
              trackColor={{ false: Colors.border, true: Colors.primary + '66' }}
              thumbColor={showAllPackages ? Colors.primary : '#ccc'}/>
          </View>
          {loading && <ActivityIndicator size="small" color={Colors.primary} style={styles.center}/>}
          {!!error && <Text style={styles.error}>Unable to load installed apps: {error}</Text>}
          {!loading && !error && (
            <FlatList
              data={apps}
              keyExtractor={item => item.packageName}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.appRow, !item.hasLauncherActivity && styles.disabledRow]}
                  disabled={!item.hasLauncherActivity}
                  accessibilityLabel={`Select ${item.appName} ${item.packageName}`}
                  onPress={() => { onSelect(item); onClose(); }}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconLetter}>{item.appName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.appName}</Text>
                    <Text style={styles.package}>{item.packageName}</Text>
                    {!item.hasLauncherActivity && (
                      <Text style={styles.service}>Not launchable (service)</Text>
                    )}
                  </View>
                  {item.packageName === selectedPackage && <Icon name="check" size={22} color={Colors.success} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No matching applications</Text>}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  panel: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '78%', minHeight: '48%', paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.sectionTitle, fontSize: 18, flex: 1 },
  search: { marginHorizontal: 16, marginVertical: Spacing.sm, paddingVertical: 10, paddingHorizontal: 12, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, borderRadius: 8 },
  toggleRow: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.cardInfo || '#EBF5FB' },
  toggleLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  disabledRow: { opacity: 0.55 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary + '22', marginRight: 12 },
  iconLetter: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  name: { ...Typography.label, fontWeight: '500' },
  package: { ...Typography.hint, fontSize: 11 },
  service: { ...Typography.hint, fontSize: 11 },
  center: { marginVertical: 24 },
  error: { color: Colors.error, padding: 16 },
  empty: { textAlign: 'center', color: Colors.textDisabled, padding: 24 },
});
