import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const usePeopleStore = create(
  immer((set) => ({
    searchResults: [],
    filters: {},
    isLoading: false,

    setResults: (results) =>
      set((s) => { s.searchResults = results; }),

    setFilters: (filters) =>
      set((s) => { s.filters = filters; }),

    setLoading: (isLoading) =>
      set((s) => { s.isLoading = isLoading; }),

    reset: () =>
      set((s) => {
        s.searchResults = [];
        s.filters = {};
        s.isLoading = false;
      }),
  }))
);