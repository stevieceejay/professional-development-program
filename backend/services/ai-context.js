/**
 * Professional Development Project - AI Context Service
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This service manages context loading for AI responses,
 * ensuring Hugging Face has relevant platform knowledge.
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../data/db');
const { promisify } = require('util');

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

class AIContextService {
  constructor() {
    this.curriculumCache = null;
    this.docsCache = {};
    this.cacheExpiry = 3600000; // 1 hour
    this.lastCacheTime = 0;
  }

  /**
   * Get comprehensive curriculum overview for AI context
   * @returns {Promise<string>} - Formatted curriculum summary
   */
  async getCurriculumContext() {
    // Use cache if fresh
    if (this.curriculumCache && (Date.now() - this.lastCacheTime) < this.cacheExpiry) {
      return this.curriculumCache;
    }

    try {
      const lessons = await dbAll(
        `SELECT week, title, description FROM lessons ORDER BY week`,
        []
      );

      let context = '=== 12-Week Professional Development Curriculum ===\n\n';
      
      for (const lesson of lessons) {
        context += `Week ${lesson.week}: ${lesson.title}\n`;
        if (lesson.description) {
          // Trim description to 200 chars for context size
          const desc = lesson.description.substring(0, 200);
          context += `${desc}${lesson.description.length > 200 ? '...' : ''}\n`;
        }
        context += '\n';
      }

      // Add general curriculum themes
      context += `
=== Core Themes ===
- Weeks 1-4: Self-assessment, MBTI, digital literacy (Gmail, Drive, Docs, Sheets, Slides, Notion, Zoom, Slack)
- Weeks 5-7: Resume development (fundamentals, drafting, refining)
- Weeks 8-9: Job search strategies, LinkedIn optimization
- Weeks 10-11: Interview preparation, professional communication
- Week 12: Portfolio finalization, job application strategies

=== Key Skills Developed ===
- Professional email and document creation
- Cloud collaboration tools (Google Workspace, Slack, Notion)
- Resume writing and formatting
- LinkedIn profile optimization
- Interview techniques and professional communication
- Portfolio development
- Job search and application strategies
      `.trim();

      this.curriculumCache = context;
      this.lastCacheTime = Date.now();
      
      return context;
    } catch (error) {
      console.error('Error loading curriculum context:', error);
      return '12-week professional development program covering digital literacy, resume writing, job search, and interview skills.';
    }
  }

  /**
   * Get specific lesson context for student questions
   * @param {number} week - Lesson week number
   * @returns {Promise<Object>} - Detailed lesson data with related content
   */
  async getLessonContext(week) {
    try {
      const lesson = await dbGet(
        `SELECT id, week, title, description, video_url FROM lessons WHERE week = ?`,
        [week]
      );

      if (!lesson) {
        return null;
      }

      // Get assignments for this lesson
      const assignments = await dbAll(
        `SELECT title, instructions FROM assignments WHERE lesson_id = ? ORDER BY id`,
        [lesson.id]
      );

      return {
        ...lesson,
        assignments: assignments || [],
        fullDescription: lesson.description || 'Professional development content'
      };
    } catch (error) {
      console.error('Error loading lesson context:', error);
      return null;
    }
  }

  /**
   * Get admin documentation context
   * @param {string} topic - Optional topic to focus on (users, lessons, assignments, analytics)
   * @returns {Promise<string>} - Relevant documentation snippets
   */
  async getAdminContext(topic = null) {
    const cacheKey = topic || 'general';
    
    // Use cache if available
    if (this.docsCache[cacheKey] && (Date.now() - this.lastCacheTime) < this.cacheExpiry) {
      return this.docsCache[cacheKey];
    }

    try {
      let context = '=== Platform Administration Guide ===\n\n';

      // Core admin capabilities
      context += `
== User Management ==
- View all users: Admin Dashboard → Users section
- Create user: POST /api/users with {username, email, password, role}
- Update user: PUT /api/users/:id
- Delete user: DELETE /api/users/:id
- Reset password: Admin can update user.password_hash directly

== Lesson Management ==
- View lessons: GET /api/lessons (shows all 12 weeks)
- Update lesson: PUT /api/lessons/:week with {title, description, video_url}
- Edit via UI: Admin Dashboard → Lessons → Select week → Edit fields
- Video URLs: Place .mp4 files in frontend/public/videos/ or use external URLs

== Assignment Management ==
- View assignments: GET /api/assignments
- Create assignment: POST /api/assignments with {lesson_id, title, instructions, due_date}
- Update assignment: PUT /api/assignments/:id
- Assignments automatically appear on student lesson pages

== Submission Review ==
- View all submissions: GET /api/submissions (admin only)
- View by user: GET /api/submissions?user_id=X
- Grade submission: PUT /api/submissions/:id with {grade, feedback}
- Download files: Submissions stored in backend/uploads/

== Analytics & Reporting ==
- Visit logs: GET /api/analytics/visits (tracks user activity)
- User engagement: GET /api/analytics/visits/by-user
- Export data: GET /api/exports/submissions.csv or /api/exports/visits.csv
- Dashboard shows: total users, active users, completion rates

== Multi-Tenant Organizations ==
- Create org: Admin Dashboard → Organizations → Add New
- Generate token: Select org → Generate Token button
- Share link: https://yoursite.com/?org=TOKEN
- Each org has isolated data (users, submissions, lessons)
      `.trim();

      // Topic-specific details
      if (topic === 'ai') {
        context += `\n\n== AI Helper Features ==
- Students: Ask questions about lesson content (10 per hour)
- Admins: Ask about platform features, get guidance (10 per hour)
- Model: Hugging Face Mistral-7B-Instruct via router API
- Rate limiting: Stored in ai_usage table, resets hourly
- Enable: Set HUGGINGFACE_API_KEY environment variable
- Test: POST /api/ai/lesson-help or /api/ai/admin-help`;
      }

      this.docsCache[cacheKey] = context;
      return context;
    } catch (error) {
      console.error('Error loading admin context:', error);
      return 'Admin features: manage users, lessons, assignments, review submissions, view analytics.';
    }
  }

  /**
   * Get context for assignment feedback
   * @param {number} assignmentId - Assignment ID
   * @returns {Promise<Object>} - Assignment details with grading rubric
   */
  async getAssignmentContext(assignmentId) {
    try {
      const assignment = await dbGet(
        `SELECT a.*, l.title as lesson_title, l.week 
         FROM assignments a 
         JOIN lessons l ON a.lesson_id = l.id 
         WHERE a.id = ?`,
        [assignmentId]
      );

      if (!assignment) {
        return null;
      }

      // Build grading context
      const context = {
        week: assignment.week,
        lessonTitle: assignment.lesson_title,
        assignmentTitle: assignment.title,
        instructions: assignment.instructions,
        rubric: this.getWeekSpecificRubric(assignment.week)
      };

      return context;
    } catch (error) {
      console.error('Error loading assignment context:', error);
      return null;
    }
  }

  /**
   * Get week-specific grading rubric
   * @param {number} week - Week number
   * @returns {string} - Rubric guidelines
   */
  getWeekSpecificRubric(week) {
    const rubrics = {
      1: 'Self-Assessment: Check for honest reflection, clear goal articulation, MBTI understanding',
      2: 'Email Skills: Proper formatting, professional tone, clear subject lines, appropriate signatures',
      3: 'Document Creation: Formatting consistency, proper use of headers/styles, clear organization',
      4: 'Collaboration Tools: Understanding of platform features, practical use cases described',
      5: 'Resume Basics: Contact info, work history, education, skills sections present',
      6: 'Resume Draft: Complete resume with formatting, 1-page length, achievements quantified',
      7: 'Resume Polish: Professional language, action verbs, error-free, ATS-friendly',
      8: 'Job Search: Research methods, target companies identified, search strategy outlined',
      9: 'LinkedIn: Profile completeness, headline optimization, summary strength, connections strategy',
      10: 'Interview Prep: STAR method understanding, example responses, question preparation',
      11: 'Communication: Professional email examples, follow-up strategies, networking approach',
      12: 'Portfolio: Work samples organized, professional presentation, ready for applications'
    };

    return rubrics[week] || 'Completeness, clarity, professionalism, application of lesson concepts';
  }

  /**
   * Detect question topic and provide relevant context
   * @param {string} question - User's question
   * @returns {string} - Detected topic category
   */
  detectQuestionTopic(question) {
    const lower = question.toLowerCase();
    
    if (lower.includes('user') || lower.includes('student') || lower.includes('account')) {
      return 'users';
    }
    if (lower.includes('lesson') || lower.includes('week') || lower.includes('video')) {
      return 'lessons';
    }
    if (lower.includes('assignment') || lower.includes('submission') || lower.includes('grade')) {
      return 'assignments';
    }
    if (lower.includes('analytic') || lower.includes('report') || lower.includes('export')) {
      return 'analytics';
    }
    if (lower.includes('ai') || lower.includes('tutor') || lower.includes('help')) {
      return 'ai';
    }
    if (lower.includes('organization') || lower.includes('org') || lower.includes('token')) {
      return 'organizations';
    }
    
    return 'general';
  }

  /**
   * Clear caches (useful after curriculum updates)
   */
  clearCache() {
    this.curriculumCache = null;
    this.docsCache = {};
    this.lastCacheTime = 0;
  }
}

module.exports = new AIContextService();
