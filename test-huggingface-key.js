// Quick test of Hugging Face API key
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fetch = require('node-fetch');

const apiKey = process.env.HUGGINGFACE_API_KEY;
console.log('API Key loaded:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND');

if (!apiKey || apiKey === 'your_huggingface_api_key_here') {
  console.error('❌ HUGGINGFACE_API_KEY not configured properly');
  process.exit(1);
}

const testUrl = 'https://router.huggingface.co/mistralai/Mistral-7B-Instruct-v0.2';

async function testAPI() {
  try {
    console.log('\nTesting Hugging Face API...');
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: "Say hello world in one sentence.",
        parameters: {
          max_new_tokens: 50,
          temperature: 0.7
        }
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('\nAPI Response:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ API key works!');
    } else {
      console.log('\n❌ API call failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
