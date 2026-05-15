export const mockStats = {
  totalUsers: 14820,
  totalUsersDelta: 124,
  scamReports: 3441,
  scamReportsDelta: 18,
  activeListings: 8207,
  activeListingsDelta: 56,
  resolved: 892,
  resolvedRate: 68,
};

export type ScamRow = {
  id: string;
  reporter: string;
  number: string;
  category: string;
  complaints: number;
  score: number;
  status: 'open' | 'resolved' | 'reviewing';
};

export const mockScamReports: ScamRow[] = [
  { id: 'r1', reporter: 'Paikhomba K.', number: '+91 99887 76655', category: 'UPI Fraud',     complaints: 12, score: 102, status: 'open' },
  { id: 'r2', reporter: 'Meena Devi',   number: '+91 88776 65544', category: 'Fake Jobs',     complaints: 3,  score: 480, status: 'resolved' },
  { id: 'r3', reporter: 'Rahul Kumar',  number: '+91 77665 54433', category: 'Phishing',      complaints: 2,  score: 310, status: 'reviewing' },
  { id: 'r4', reporter: 'Anonymous',    number: '+91 66554 43322', category: 'Investment Fraud', complaints: 8,  score: 180, status: 'open' },
  { id: 'r5', reporter: 'Priya S.',     number: '+91 55443 32211', category: 'Romance Scam',  complaints: 5,  score: 240, status: 'reviewing' },
];

export type HighRiskUser = {
  id: string;
  name: string;
  score: number;
  complaints: number;
};

export const mockHighRiskUsers: HighRiskUser[] = [
  { id: 'h1', name: 'Unknown Scammer', score: 102, complaints: 12 },
  { id: 'h2', name: 'Fake Agent',       score: 180, complaints: 8 },
  { id: 'h3', name: 'Rohit Verma',      score: 220, complaints: 6 },
  { id: 'h4', name: 'Susmita R.',       score: 245, complaints: 5 },
];