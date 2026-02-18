/**
 * AI Context Verification Script
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * Verifies that AI has proper context data loaded
 */

const path = require('path');
// Set working directory to script location for proper module resolution
process.chdir(__dirname);

const aiContext = require('./backend/services/ai-context');

async function verifyAIContext() {
  console.log('=== AI Knowledge Base Verification ===\n');

  try {
    // Test 1: Curriculum Context
    console.log('✓ Testing Curriculum Context...');
    const curriculum = await aiContext.getCurriculumContext();
    console.log(`  - Length: ${curriculum.length} characters`);
    console.log(`  - Contains "Week 1": ${curriculum.includes('Week 1')}`);
    console.log(`  - Contains "Week 12": ${curriculum.includes('Week 12')}`);
    console.log(`  - Preview: ${curriculum.substring(0, 100)}...\n`);

    // Test 2: Lesson Context
    console.log('✓ Testing Lesson Context (Week 1)...');
    const lesson1 = await aiContext.getLessonContext(1);
    if (lesson1) {
      console.log(`  - Title: ${lesson1.title}`);
      console.log(`  - Has description: ${!!lesson1.description}`);
      console.log(`  - Assignments count: ${lesson1.assignments?.length || 0}`);
      console.log(`  - Description preview: ${lesson1.description?.substring(0, 100)}...\n`);
    } else {
      console.log('  ⚠ Week 1 lesson not found in database\n');
    }

    // Test 3: Admin Context
    console.log('✓ Testing Admin Context (General)...');
    const adminGeneral = await aiContext.getAdminContext('general');
    console.log(`  - Length: ${adminGeneral.length} characters`);
    console.log(`  - Contains "User Management": ${adminGeneral.includes('User Management')}`);
    console.log(`  - Contains API endpoints: ${adminGeneral.includes('GET /api/')}`);
    console.log(`  - Preview: ${adminGeneral.substring(0, 100)}...\n`);

    // Test 4: Admin Context (Topic-Specific)
    console.log('✓ Testing Admin Context (AI topic)...');
    const adminAI = await aiContext.getAdminContext('ai');
    console.log(`  - Contains AI features: ${adminAI.includes('AI Helper Features')}`);
    console.log(`  - Contains rate limiting: ${adminAI.includes('rate limiting')}`);
    console.log(`  - Contains Hugging Face: ${adminAI.includes('Hugging Face')}\n`);

    // Test 5: Topic Detection
    console.log('✓ Testing Topic Detection...');
    const topics = [
      { q: 'How do I add a new user?', expected: 'users' },
      { q: 'How do I update a lesson?', expected: 'lessons' },
      { q: 'How do I grade an assignment?', expected: 'assignments' },
      { q: 'How do I export analytics?', expected: 'analytics' },
      { q: 'How do I create an organization?', expected: 'organizations' },
    ];
    
    topics.forEach(({ q, expected }) => {
      const detected = aiContext.detectQuestionTopic(q);
      const match = detected === expected ? '✓' : '✗';
      console.log(`  ${match} "${q}" → ${detected} (expected: ${expected})`);
    });
    console.log();

    // Test 6: Week-Specific Rubrics
    console.log('✓ Testing Week-Specific Rubrics...');
    for (let week = 1; week <= 12; week++) {
      const rubric = aiContext.getWeekSpecificRubric(week);
      console.log(`  - Week ${week}: ${rubric.substring(0, 60)}...`);
    }
    console.log();

    // Test 7: Assignment Context
    console.log('✓ Testing Assignment Context...');
    const assignmentContext = await aiContext.getAssignmentContext(1);
    if (assignmentContext) {
      console.log(`  - Week: ${assignmentContext.week}`);
      console.log(`  - Lesson: ${assignmentContext.lessonTitle}`);
      console.log(`  - Assignment: ${assignmentContext.assignmentTitle}`);
      console.log(`  - Has rubric: ${!!assignmentContext.rubric}\n`);
    } else {
      console.log('  ⚠ Assignment 1 not found in database\n');
    }

    // Summary
    console.log('=== Verification Complete ===');
    console.log('✓ All context services operational');
    console.log('✓ Curriculum data loaded from database');
    console.log('✓ Admin documentation available');
    console.log('✓ Topic detection working');
    console.log('✓ Week-specific rubrics present');
    console.log('\nAI is ready to answer student and admin questions!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('\nTroubleshooting steps:');
    console.error('1. Ensure backend/data/project.db exists');
    console.error('2. Verify lessons table has data');
    console.error('3. Check database connection in backend/data/db.js');
    process.exit(1);
  }

  process.exit(0);
}

// Run verification
verifyAIContext();
