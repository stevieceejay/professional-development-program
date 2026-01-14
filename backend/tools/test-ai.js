/**
 * Test script for AI Chatbot functionality
 * Run: node backend/tools/test-ai.js
 */

require('dotenv').config();
const aiHelper = require('../services/ai-helper');

async function testAIFeatures() {
  console.log('🤖 Testing AI Chatbot Features...\n');

  // Check API key
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.error('❌ ERROR: HUGGINGFACE_API_KEY not found in .env file');
    console.log('\nPlease add your Hugging Face API key to backend/.env:');
    console.log('HUGGINGFACE_API_KEY=hf_your_key_here\n');
    console.log('Get a free key: https://huggingface.co/settings/tokens\n');
    process.exit(1);
  }

  console.log('✅ API key found\n');

  // Test 1: Lesson Help
  console.log('📚 Test 1: Student Lesson Help');
  console.log('Question: "What is professional development?"\n');
  
  const lesson = {
    id: 1,
    title: 'Introduction to Professional Development',
    description: 'This lesson covers the basics of continuous learning and career growth in AI and technology.'
  };

  try {
    const answer1 = await aiHelper.answerLessonQuestion(lesson, 'What is professional development?');
    console.log('🤖 AI Response:', answer1);
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message);
  }

  // Test 2: Admin Help
  console.log('👨‍💼 Test 2: Admin Platform Help');
  console.log('Question: "How do I create an organization?"\n');

  try {
    const answer2 = await aiHelper.answerAdminQuestion('How do I create an organization?');
    console.log('🤖 AI Response:', answer2);
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message);
  }

  // Test 3: Simplify Concept
  console.log('💡 Test 3: Simplify Concept');
  console.log('Concept: "Machine Learning"\n');

  try {
    const answer3 = await aiHelper.simplifyTopic('Machine Learning');
    console.log('🤖 AI Response:', answer3);
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Test 3 Failed:', error.message);
  }

  // Test 4: Assignment Feedback
  console.log('📝 Test 4: Assignment Feedback');
  console.log('Submission: "Professional development means learning new skills"\n');

  try {
    const answer4 = await aiHelper.reviewAssignment(
      'Explain the importance of professional development in 2-3 sentences.',
      'Professional development means learning new skills to stay current in your field.'
    );
    console.log('🤖 AI Response:', answer4);
    console.log('\n' + '='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Test 4 Failed:', error.message);
  }

  console.log('✅ All tests completed!\n');
  console.log('Next steps:');
  console.log('1. Start server: npm start');
  console.log('2. Open http://localhost:4000/lessons.html');
  console.log('3. Click "🤖 Ask AI Tutor" button');
  console.log('4. Try asking a question!\n');
}

// Run tests
testAIFeatures().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});
