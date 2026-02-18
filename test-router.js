// Test Hugging Face router endpoint (used by ai-helper.js)
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fetch = require('node-fetch');

const apiKey = process.env.HUGGINGFACE_API_KEY;
console.log('API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

if (!apiKey || apiKey === 'your_huggingface_api_key_here') {
  console.error('❌ HUGGINGFACE_API_KEY not configured in .env');
  process.exit(1);
}

// Router endpoint (same as ai-helper.js uses)
const routerUrl = 'https://router.huggingface.co/mistralai/Mistral-7B-Instruct-v0.2';

async function testRouter() {
  try {
    console.log('\n🧪 Testing Hugging Face Router Endpoint');
    console.log(`   URL: ${routerUrl}`);
    console.log('   Sending test prompt...\n');

    const response = await fetch(routerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: "Explain machine learning in one sentence.",
        parameters: {
          max_new_tokens: 75,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false
        }
      })
    });

    console.log(`   Response Status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`   Error Response: ${text}\n`);
      console.log('❌ Router endpoint failed');
      process.exit(1);
    }

    const result = await response.json();
    console.log(`   Response Type: ${Array.isArray(result) ? 'Array' : 'Object'}`);
    
    if (Array.isArray(result) && result[0]?.generated_text) {
      console.log(`\n✅ AI Response:\n   "${result[0].generated_text}"\n`);
      console.log('✅ Hugging Face API is working!');
      process.exit(0);
    } else if (result.generated_text) {
      console.log(`\n✅ AI Response:\n   "${result.generated_text}"\n`);
      console.log('✅ Hugging Face API is working!');
      process.exit(0);
    } else {
      console.log(`\n   Full response: ${JSON.stringify(result, null, 2)}`);
      console.log('\n⚠️  Unexpected response format');
      process.exit(1);
    }
  } catch (error) {
    console.log(`\n❌ Connection Error: ${error.message}`);
    process.exit(1);
  }
}

testRouter();
