import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useClassifiedsStore = create(
  immer((set) => ({
    listings: [],
    myListings: [],
    filters: {},
    isLoading: false,

    setListings: (listings) =>
      set((s) => { s.listings = listings; }),

    addListing: (listing) =>
      set((s) => { s.myListings.unshift(listing); }),

    setFilters: (filters) =>
      set((s) => { s.filters = filters; }),

    setLoading: (isLoading) =>
      set((s) => { s.isLoading = isLoading; }),

    reset: () =>
      set((s) => {
        s.listings = [];
        s.myListings = [];
        s.filters = {};
        s.isLoading = false;
      }),
  }))
);