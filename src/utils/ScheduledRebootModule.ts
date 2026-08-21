import { NativeModules } from 'react-native';

export interface ScheduledRebootSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  nextTriggerAt: number;
  isDeviceOwner: boolean;
  exactAlarmAvailable: boolean;
}

interface ScheduledRebootModuleInterface {
  getSettings(): Promise<ScheduledRebootSettings>;
  setSchedule(
    enabled: boolean,
    hour: number,
    minute: number,
  ): Promise<ScheduledRebootSettings>;
  requestExactAlarmAccess(): Promise<boolean>;
}

const { ScheduledRebootModule } = NativeModules;

export default ScheduledRebootModule as ScheduledRebootModuleInterface;
