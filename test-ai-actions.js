// Simple test script to trigger AI action generation
// Run with: node test-ai-actions.js

const https = require('https');

console.log('🧪 Testing AI Action Generation\n');
console.log('Calling Cloud Function...\n');

const options = {
  hostname: 'us-central1-parentpulse-d68ba.cloudfunctions.net',
  path: '/generateDailyActionsManual',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response:', data);

    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(data);
        console.log('\n✅ Success!');
        console.log(`Generated ${result.actionsCreated} action(s)`);
        console.log('\n📱 Go to http://localhost:3000/dashboard to see your actions!');
      } catch (e) {
        console.log('\n✅ Function called successfully');
        console.log('Response:', data);
      }
    } else {
      console.log('\n❌ Error:', data);
      console.log('\nMake sure you have:');
      console.log('  1. Created at least one journal entry today');
      console.log('  2. Are logged in as a parent');
      console.log('  3. Have children added to your family');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error calling function:', error.message);
});

req.write(JSON.stringify({}));
req.end();
