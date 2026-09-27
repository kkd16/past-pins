import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const ARRIVAL_TASK_NAME = 'past-pins-country-arrivals';

TaskManager.defineTask<{ locations: LocationObject[] }>(ARRIVAL_TASK_NAME, async ({ data, error }) => {
  try {
    if (!data && !error) return;
    const { handleBackgroundArrivals } = await import('./arrival-notifications');
    await handleBackgroundArrivals(error ? [] : data.locations);
    if (error) throw error;
  } catch (error) {
    await import('../recovery/diagnostics-file').then(({ diagnostics }) => {
      diagnostics.record('reminders', error);
    }).catch(() => undefined);
  }
});
