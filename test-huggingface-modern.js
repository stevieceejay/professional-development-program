// Modern Hugging Face Inference API test
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fetch = require('node-fetch');

const apiKey = process.env.HUGGINGFACE_API_KEY;
console.log('API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

if (!apiKey || apiKey === 'your_huggingface_api_key_here') {
  console.error('❌ HUGGINGFACE_API_KEY not configured in .env');
  process.exit(1);
}

// Modern inference API endpoint (the one Hugging Face currently uses)
const endpoints = [
  {
    name: 'Mistral via inference API',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
  },
  {
    name: 'Text generation via inference API',
    url: 'https://api-inference.huggingface.co/models/google/flan-t5-large',
  }
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: "Explain machine learning in one sentence.",
        parameters: {
          max_new_tokens: 50,
        }
      })
    });

    console.log(`   Status: ${response.status}`);

    const result = await response.json();
    console.log(`   Response:`, JSON.stringify(result, null, 2).substring(0, 200));

    if (response.ok) {
      console.log(`   ✅ SUCCESS`);
      return true;
    } else {
      console.log(`   ⚠️  Status ${response.status}: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('Hugging Face API Connectivity Test');
  console.log('========================================');

  let anySucceeded = false;
  for (const endpoint of endpoints) {
    const succeeded = await testEndpoint(endpoint);
    if (succeeded) anySucceeded = true;
  }

  console.log('\n========================================');
  if (anySucceeded) {
    console.log('✅ At least one endpoint works!');
    console.log('AI feature is operational.');
  } else {
    console.log('⚠️  No endpoints responded successfully.');
    console.log('Possible causes:');
    console.log('  1. API key is invalid or revoked');
    console.log('  2. API key has no remaining quota');
    console.log('  3. Models are loading (first request after cold start)');
    console.log('\nSolution: Get a fresh API key from https://huggingface.co/settings/tokens');
  }
  console.log('========================================\n');
}

runTests();
