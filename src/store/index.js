import { useAuthStore } from './authStore';
import { useDialerStore } from './dialerStore';
import { useScamStore } from './scamStore';
import { useClassifiedsStore } from './classifiedsStore';
import { useChatStore } from './chatStore';
import { usePeopleStore } from './peopleStore';

export const resetAllStores = () => {
  useAuthStore.getState().clearAuth();
  useDialerStore.getState().reset();
  useScamStore.getState().reset();
  useClassifiedsStore.getState().reset();
  useChatStore.getState().reset();
  usePeopleStore.getState().reset();
};

export { useAuthStore, useDialerStore, useScamStore, useClassifiedsStore, useChatStore, usePeopleStore };