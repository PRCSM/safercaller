import * as data from './mockData';
import { mockUser, mockProfile, mockMessages, mockPeople, mockListings, mockScamReports } from './mockData';
import { resetAllStores } from '../../store';

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

const MOCK_PROFESSIONS = [
  'Software Engineer', 'Teacher', 'Doctor', 'Accountant', 'Designer',
  'Sales Manager', 'Plumber', 'Electrician', 'Driver', 'Photographer',
  'Nurse', 'Pharmacist', 'Lawyer', 'Architect', 'Chef', 'Journalist',
  'Banker', 'Real Estate Agent', 'Shopkeeper', 'Student', 'Other',
];

export const mockFunctionsService = {
  getAIProfessions: async () => {
    await delay(400);
    return MOCK_PROFESSIONS;
  },
  computeReputationScore: async (uid) => {
    await delay(300);
    return mockProfile?.reputationScore ?? 900;
  },
};

export const mockAuthService = {
  signUpWithPhone: async (phone) => {
    await delay();
    return 'mock-confirmation-object';
  },
  verifyOTP: async (confirmation, code) => {
    await delay();
    if (code.length !== 6) throw new Error('Enter all 6 digits');
    return mockUser;
  },
  signOut: async () => {
    await delay();
    resetAllStores();
  },
  onAuthStateChanged: (cb) => {
    cb(mockUser);
    return () => {};
  },
};

export const mockUserService = {
  getUserProfile: async (uid) => { await delay(); return mockProfile; },
  createUserProfile: async (uid, d) => { await delay(); return { ...mockProfile, ...d }; },
  updateUserProfile: async (uid, d) => { await delay(); return { ...mockProfile, ...d }; },
  uploadProfilePhoto: async (uid, uri) => { await delay(); return 'https://i.pravatar.cc/150?u=' + uid; },
  checkDuplicatePhone: async (phone) => { await delay(300); return false; },
  checkDuplicateEmail: async (email) => { await delay(300); return false; },
};

export const mockScamService = {
  submitScamReport: async (payload, files) => { await delay(1200); return 'mock-report-id'; },
  searchScamReports: async (query, filters) => { await delay(); return mockScamReports; },
  lookupNumber: async (phone) => {
    await delay(200);
    return phone === '+919988776655'
      ? { isFlagged: true,  count: 12, categories: ['UPI Fraud'], score: 102 }
      : { isFlagged: false, count: 0,  categories: [],            score: 900 };
  },
  submitResolveRequest: async (id, payload, files) => { await delay(); return true; },
};

export const mockClassifiedsService = {
  getListings: async (filters = {}, pageSize = 20, lastDoc = null) => {
    await delay();
    return { results: mockListings, lastDoc: null };
  },
  createListing: async (sellerId, data, mediaFiles = []) => {
    await delay(1200);
    return 'mock-listing-' + Date.now();
  },
  getMyListings: async (sellerId) => {
    await delay();
    return mockListings.slice(0, 2);
  },
  getListingById: async (id) => {
    await delay();
    return mockListings.find(l => l.id === id) || mockListings[0];
  },
  updateListing: async () => {},
  deleteListing: async () => {},
  relistListing: async () => {},
};

export const mockChatService = {
  getMessages: (chatId, callback, pageSize = 50) => {
    setTimeout(() => callback(mockMessages), 600);
    return () => {};
  },
  getConversations: (uid, callback) => {
    setTimeout(() => callback([{
      id: 'chat-1',
      participants: [uid, 'u2'],
      lastMessage: 'Okay, I will confirm by tomorrow.',
      lastSenderId: 'u2',
      lastAt: new Date(),
    }]), 600);
    return () => {};
  },
  sendMessage: async (chatId, senderId, receiverId, text, mediaUri = null) => {
    await delay(300);
    return 'mock-msg-' + Date.now();
  },
  markAsRead: async () => {},
  deleteMessage: async () => {},
  blockUser: async () => {},
};

export const mockPeopleService = {
  searchPeople: async (filters = {}, pageSize = 20, lastDoc = null) => {
    await delay();
    return { results: mockPeople, lastDoc: null };
  },
};