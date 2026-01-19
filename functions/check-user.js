const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUser() {
  const userId = 'KmZ3wn73MgZ2vnsNbat9MBR0oLB2';
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      console.log('User document exists in Firestore:');
      console.log(JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log('NO USER DOCUMENT IN FIRESTORE - This is the problem!');
      console.log('User exists in Firebase Auth but has no Firestore document.');
      console.log('This causes all permission checks to fail.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkUser();
