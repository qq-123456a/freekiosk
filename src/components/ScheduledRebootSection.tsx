import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Text } from 'react-native';
import {
  SettingsButton,
  SettingsInfoBox,
  SettingsSection,
  SettingsSwitch,
  TimeInput,
} from './settings';
import ScheduledRebootModule, {
  type ScheduledRebootSettings,
} from '../utils/ScheduledRebootModule';

const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const parseTime = (time: string): { hour: number; minute: number } | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

const ScheduledRebootSection: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('04:00');
  const [savedTime, setSavedTime] = useState('04:00');
  const [nextTriggerAt, setNextTriggerAt] = useState(0);
  const [isDeviceOwner, setIsDeviceOwner] = useState(false);
  const [exactAlarmAvailable, setExactAlarmAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applySettings = useCallback((settings: ScheduledRebootSettings) => {
    const normalizedTime = formatTime(settings.hour, settings.minute);
    setEnabled(settings.enabled);
    setTime(normalizedTime);
    setSavedTime(normalizedTime);
    setNextTriggerAt(settings.nextTriggerAt || 0);
    setIsDeviceOwner(settings.isDeviceOwner);
    setExactAlarmAvailable(settings.exactAlarmAvailable);
  }, []);

  const load = useCallback(async () => {
    try {
      const settings = await ScheduledRebootModule.getSettings();
      applySettings(settings);
    } catch (error) {
      console.warn('Failed to load scheduled reboot settings:', error);
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (nextEnabled: boolean, nextTime: string) => {
    const parsed = parseTime(nextTime);
    if (!parsed) {
      Alert.alert('Invalid time', 'Enter a valid 24-hour time in HH:MM format.');
      return false;
    }

    if (nextEnabled && !isDeviceOwner) {
      Alert.alert(
        'Device Owner required',
        'Scheduled device reboot requires FreeKiosk to be configured as Device Owner.',
      );
      return false;
    }

    setSaving(true);
    try {
      const settings = await ScheduledRebootModule.setSchedule(
        nextEnabled,
        parsed.hour,
        parsed.minute,
      );
      applySettings(settings);
      return true;
    } catch (error: any) {
      Alert.alert(
        'Scheduled reboot',
        error?.message || 'Failed to update the reboot schedule.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [applySettings, isDeviceOwner]);

  const nextRebootLabel = useMemo(() => {
    if (!enabled || !nextTriggerAt) return null;
    try {
      return new Date(nextTriggerAt).toLocaleString();
    } catch {
      return null;
    }
  }, [enabled, nextTriggerAt]);

  return (
    <SettingsSection title="Scheduled Device Reboot" icon="restart">
      <SettingsSwitch
        label="Enable Daily Reboot"
        hint={isDeviceOwner
          ? 'Automatically reboot the Android tablet once per day'
          : 'Requires Device Owner mode'}
        value={enabled}
        onValueChange={(value) => save(value, time)}
        disabled={loading || saving || !isDeviceOwner}
      />

      {!loading && !isDeviceOwner && (
        <SettingsInfoBox variant="warning">
          <Text>
            Android only permits FreeKiosk to reboot the whole device while FreeKiosk is
            Device Owner. Configure Device Owner first, then enable this schedule.
          </Text>
        </SettingsInfoBox>
      )}

      {isDeviceOwner && enabled && (
        <>
          <TimeInput
            label="Daily Reboot Time"
            value={time}
            onChange={setTime}
            disabled={saving}
          />

          <SettingsButton
            title={time === savedTime ? 'Reboot Time Saved' : 'Save Reboot Time'}
            icon="content-save"
            variant={time === savedTime ? 'outline' : 'primary'}
            onPress={() => save(true, time)}
            disabled={saving || time === savedTime}
            loading={saving}
          />

          <SettingsInfoBox variant="info">
            <Text>
              The reboot follows the tablet's local time. If the tablet is powered off at the
              scheduled time, FreeKiosk skips that occurrence and schedules the next day. Time
              and time-zone changes automatically recalculate the next reboot.
              {nextRebootLabel ? `\n\nNext reboot: ${nextRebootLabel}` : ''}
              {!exactAlarmAvailable
                ? '\n\nAndroid exact-alarm access is not available, so the system may delay the reboot slightly during deep idle.'
                : ''}
            </Text>
          </SettingsInfoBox>
        </>
      )}
    </SettingsSection>
  );
};

export default ScheduledRebootSection;
