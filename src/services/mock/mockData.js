export const mockUser = {
  uid: 'dev-uid-001',
  email: 'test@safercaller.com',
  phoneNumber: '+919876543210',
};

export const mockProfile = {
  uid: 'dev-uid-001',
  name: 'Paikhomba K.',
  profession: 'Software Engineer',
  subProfession: 'Full Stack',
  location: 'Chennai',
  reputationScore: 847,
  goOnline: true,
  isPremium: false,
  verified: { liveness: true, idProof: true, thumbprint: true },
  createdAt: new Date(),
};

export const mockCallLogs = [
  { id: '1', number: '+919988776655', direction: 'inbound',  status: 'flagged',      duration: 0,   callerIdResult: 'flagged', createdAt: new Date() },
  { id: '2', name: 'Rahul Kumar', number: '+919876543210', direction: 'outbound', status: 'safe',         duration: 323, callerIdResult: 'safe',    createdAt: new Date() },
  { id: '3', name: 'Sandeep K.',  number: '+917765543210', direction: 'inbound',  status: 'missed',       duration: 0,   callerIdResult: 'unknown', createdAt: new Date() },
  { id: '4', number: '+917766554433', direction: 'inbound', status: 'receptionist', duration: 45,  callerIdResult: 'unknown', createdAt: new Date() },
  { id: '5', name: 'Mom', number: '+919123456789', direction: 'inbound', status: 'safe',         duration: 752, callerIdResult: 'safe',    createdAt: new Date() },
];

export const mockScamReports = [
  { id: 'r1', scammerName: 'Unknown Scammer', scammerPhone: '+919988776655', category: 'UPI Fraud',  status: 'open',      complaintCount: 12, reputationScore: 102, proofCount: 7 },
  { id: 'r2', scammerName: 'Priya Sharma',    scammerPhone: '+918877665544', category: 'Fake Jobs',  status: 'resolved',  complaintCount: 3,  reputationScore: 480, proofCount: 2 },
  { id: 'r3', scammerName: 'Fake Agent',      scammerPhone: '+917766554433', category: 'Phishing',   status: 'reviewing', complaintCount: 2,  reputationScore: 310, proofCount: 1 },
];

export const mockListings = [
  { id: 'l1', title: 'AC Repair & Service', type: 'service', category: 'Electrical', price: 500,   priceUnit: '/visit', location: 'T.Nagar, Chennai', sellerId: 'u2', sellerName: 'Vikram R.', sellerScore: 820, rating: 4.8, status: 'active' },
  { id: 'l2', title: 'iPhone 13 (128GB)',   type: 'product', category: 'Electronics', price: 42000,                       condition: 'Used',         location: 'Anna Nagar',       sellerId: 'u3', sellerName: 'Priya S.',  sellerScore: 760, rating: 4.2, status: 'active' },
  { id: 'l3', title: 'Home Plumbing Work',  type: 'service', category: 'Plumbing',    price: 200,   priceUnit: '/hr',    location: 'Velachery',        sellerId: 'u4', sellerName: 'Unknown',   sellerScore: 150, rating: 2.1, status: 'active' },
  { id: 'l4', title: 'Study Table',         type: 'product', category: 'Furniture',   price: 1800,                       condition: 'New',           location: 'Porur',            sellerId: 'u5', sellerName: 'Arun M.',   sellerScore: 900, rating: 4.9, status: 'active' },
];

export const mockPeople = [
  { uid: 'u2', name: 'Rahul Kumar',  profession: 'Software Engineer', company: 'Zomato',        location: 'Chennai',     reputationScore: 847, verified: { liveness: true,  idProof: true,  thumbprint: true  }, goOnline: true },
  { uid: 'u3', name: 'Meena Devi',   profession: 'Teacher',           company: 'Self Employed', location: 'Coimbatore',  reputationScore: 620, verified: { liveness: true,  idProof: false, thumbprint: true  }, goOnline: true },
  { uid: 'u4', name: 'Unknown User', profession: null,                company: null,            location: 'Unknown',     reputationScore: 102, verified: { liveness: false, idProof: false, thumbprint: false }, goOnline: true },
];

export const mockMessages = [
  { id: 'm1', senderId: 'u2',          receiverId: 'dev-uid-001', text: 'Hi, is the AC service still available?',     read: true,  createdAt: new Date(Date.now() - 600000) },
  { id: 'm2', senderId: 'dev-uid-001', receiverId: 'u2',          text: 'Yes, available this weekend. What area?',    read: true,  createdAt: new Date(Date.now() - 500000) },
  { id: 'm3', senderId: 'u2',          receiverId: 'dev-uid-001', text: "I'm in T.Nagar, Chennai.",                   read: true,  createdAt: new Date(Date.now() - 400000) },
  { id: 'm4', senderId: 'dev-uid-001', receiverId: 'u2',          text: 'Great! My rate is INR 500 for the first visit.', read: true, createdAt: new Date(Date.now() - 300000) },
  { id: 'm5', senderId: 'u2',          receiverId: 'dev-uid-001', text: 'Okay, I will confirm by tomorrow.',          read: false, createdAt: new Date(Date.now() - 60000) },
];