const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seed() {
  console.log('🌱 Seeding Firestore...');

  // config/professions
  await db.doc('config/professions').set({
    list: [
      'Accountant','Architect','Business Analyst','CA','Civil Engineer',
      'Content Writer','Data Scientist','Designer','Developer','Doctor',
      'Electrician','Entrepreneur','Finance Manager','HR Manager',
      'Interior Designer','Lawyer','Marketing Manager','MBA Student',
      'Mechanic','Nurse','Pharmacist','Photographer','Plumber',
      'Product Manager','Project Manager','Sales Executive',
      'Software Engineer','Student','Teacher','Videographer'
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ config/professions seeded');

  // config/legal
  await db.doc('config/legal').set({
    termsOfService: 'Terms of Service for SAFERCALLER. Last updated: 2025.',
    privacyPolicy: 'Privacy Policy for SAFERCALLER. Last updated: 2025.',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ config/legal seeded');

  // Seed one placeholder scamReport so the index has data to validate against
  await db.doc('scamReports/placeholder').set({
    scammerName: 'Test Scammer',
    scammerPhone: '+910000000000',
    email: 'test@test.com',
    category: 'UPI Fraud',
    description: 'Placeholder for index validation',
    status: 'open',
    reportedBy: 'system',
    complaintCount: 1,
    proofUrls: [],
    socialLinks: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ scamReports/placeholder seeded');

  // Seed one placeholder listing
  await db.doc('listings/placeholder').set({
    title: 'Placeholder Listing',
    type: 'service',
    category: 'Plumbing',
    price: 100,
    sellerId: 'system',
    status: 'active',
    mediaUrls: [],
    avgRating: 0,
    reviewCount: 0,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ listings/placeholder seeded');

  console.log('');
  console.log('🎉 All done! Firestore seeded successfully.');
  console.log('You can delete the placeholder docs from Firebase Console if needed.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
