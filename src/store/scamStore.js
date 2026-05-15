import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useScamStore = create(
  immer((set) => ({
    reports: [],
    searchResults: [],
    searchQuery: '',
    activeFilter: 'all',
    isLoading: false,

    setReports: (reports) =>
      set((s) => { s.reports = reports; }),

    setSearchResults: (results) =>
      set((s) => { s.searchResults = results; }),

    setFilter: (filter) =>
      set((s) => { s.activeFilter = filter; }),

    setQuery: (query) =>
      set((s) => { s.searchQuery = query; }),

    setLoading: (isLoading) =>
      set((s) => { s.isLoading = isLoading; }),

    reset: () =>
      set((s) => {
        s.reports = [];
        s.searchResults = [];
        s.searchQuery = '';
        s.activeFilter = 'all';
        s.isLoading = false;
      }),
  }))
);