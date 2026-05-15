import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Dialer state.
 *
 * Persisted slices:
 *   - blockedNumbers, scamBlockEnabled, spamBlockEnabled, receptionistMode
 *     (user preferences -- should survive a restart)
 *   - callLogs (treat as source of truth between fetches)
 *
 * Not persisted:
 *   - currentNumber (transient input; clear on relaunch)
 *
 * reset() restores in-memory state to initial values. Persisted slices
 * will re-hydrate from AsyncStorage on the next launch; call
 * `useDialerStore.persist.clearStorage()` if you need a hard wipe.
 */
export const useDialerStore = create(
  persist(
    immer((set) => ({
      currentNumber: '',
      callLogs: [],
      blockedNumbers: [],
      scamBlockEnabled: true,
      spamBlockEnabled: true,
      receptionistMode: false,

      addDigit: (digit) =>
        set((s) => { s.currentNumber += String(digit); }),

      deleteDigit: () =>
        set((s) => { s.currentNumber = s.currentNumber.slice(0, -1); }),

      clearNumber: () =>
        set((s) => { s.currentNumber = ''; }),

      toggleScamBlock: () =>
        set((s) => { s.scamBlockEnabled = !s.scamBlockEnabled; }),

      toggleSpamBlock: () =>
        set((s) => { s.spamBlockEnabled = !s.spamBlockEnabled; }),

      toggleReceptionist: () =>
        set((s) => { s.receptionistMode = !s.receptionistMode; }),

      addCallLog: (log) =>
        set((s) => { s.callLogs.unshift(log); }),

      deleteCallLog: (id) =>
        set((s) => {
          s.callLogs = s.callLogs.filter((l) => l.id !== id);
        }),

      addBlockedNumber: (number) =>
        set((s) => {
          if (!s.blockedNumbers.includes(number)) s.blockedNumbers.push(number);
        }),

      removeBlockedNumber: (number) =>
        set((s) => {
          s.blockedNumbers = s.blockedNumbers.filter((n) => n !== number);
        }),

      reset: () =>
        set((s) => {
          s.currentNumber = '';
          s.callLogs = [];
          s.blockedNumbers = [];
          s.scamBlockEnabled = true;
          s.spamBlockEnabled = true;
          s.receptionistMode = false;
        }),
    })),
    {
      name: 'safercaller-dialer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        callLogs: state.callLogs,
        blockedNumbers: state.blockedNumbers,
        scamBlockEnabled: state.scamBlockEnabled,
        spamBlockEnabled: state.spamBlockEnabled,
        receptionistMode: state.receptionistMode,
      }),
    }
  )
);