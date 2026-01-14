/**
 * Professional Development Project platform - AI Helper Service
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This service provides AI-powered assistance for students and administrators
 * using Hugging Face Inference API (free tier: 30K requests/month)
 */

const fetch = require('node-fetch');

class AIHelper {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.apiUrl = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
    
    // Fallback to free model if rate limited
    this.fallbackUrl = 'https://api-inference.huggingface.co/models/google/flan-t5-large';
  }

  /**
   * Generate AI response using Hugging Face
   * @param {string} prompt - The full prompt including system context
   * @param {number} maxTokens - Maximum response length
   * @returns {Promise<string>} - AI-generated response
   */
  async generate(prompt, maxTokens = 300) {
    if (!this.apiKey) {
      return "AI assistance is currently unavailable. Please contact your administrator.";
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false
          }
        })
      });

      if (!response.ok) {
        // Try fallback model
        return await this.useFallback(prompt, maxTokens);
      }

      const result = await response.json();
      
      if (Array.isArray(result) && result[0]?.generated_text) {
        return result[0].generated_text.trim();
      } else if (result.generated_text) {
        return result.generated_text.trim();
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('AI Helper Error:', error);
      return "I'm having trouble processing your question right now. Please try again or contact your instructor.";
    }
  }

  /**
   * Fallback to simpler model if primary fails
   */
  async useFallback(prompt, maxTokens) {
    try {
      const response = await fetch(this.fallbackUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error('Fallback model also failed');
      }

      const result = await response.json();
      return Array.isArray(result) && result[0]?.generated_text 
        ? result[0].generated_text.trim() 
        : "Unable to generate response.";
    } catch (error) {
      console.error('Fallback AI Error:', error);
      return "AI service is temporarily unavailable. Please try again later.";
    }
  }

  /**
   * Answer student questions about lesson content
   * @param {Object} lesson - Lesson data with title, description, content
   * @param {string} studentQuestion - The student's question
   * @returns {Promise<string>} - AI tutor response
   */
  async answerLessonQuestion(lesson, studentQuestion) {
    const prompt = `You are a helpful AI tutor for professional development training. A student is learning about: "${lesson.title}".

Lesson Content:
${lesson.description || ''}

Student Question: ${studentQuestion}

Provide a clear, encouraging answer that helps them understand the concept. Keep it under 150 words and be supportive.

Answer:`;

    return await this.generate(prompt, 250);
  }

  /**
   * Help administrators navigate the platform
   * @param {string} adminQuestion - The admin's question
   * @param {string} docsContext - Relevant documentation snippets
   * @returns {Promise<string>} - AI assistant response
   */
  async answerAdminQuestion(adminQuestion, docsContext = '') {
    const prompt = `You are a helpful AI assistant for platform administrators. Answer questions about managing the Professional Development Project platform.

${docsContext ? `Documentation Context:\n${docsContext}\n\n` : ''}Admin Question: ${adminQuestion}

Provide a clear, step-by-step answer. If it involves specific actions, list them clearly. Keep it under 200 words.

Answer:`;

    return await this.generate(prompt, 350);
  }

  /**
   * Provide feedback on assignment submissions
   * @param {string} assignmentPrompt - The assignment requirements
   * @param {string} studentSubmission - Student's answer
   * @returns {Promise<string>} - Constructive feedback
   */
  async reviewAssignment(assignmentPrompt, studentSubmission) {
    const prompt = `You are an AI teaching assistant reviewing a student's assignment.

Assignment: ${assignmentPrompt}

Student's Answer:
${studentSubmission}

Provide brief, constructive feedback:
1. What they did well
2. What could be improved
3. One specific suggestion

Keep it encouraging and under 150 words.

Feedback:`;

    return await this.generate(prompt, 250);
  }

  /**
   * Generate quiz questions for lesson review
   * @param {Object} lesson - Lesson data
   * @param {number} count - Number of questions
   * @returns {Promise<string>} - Quiz questions
   */
  async generateQuiz(lesson, count = 3) {
    const prompt = `Based on this lesson: "${lesson.title}"

Content: ${lesson.description?.substring(0, 500) || 'Professional development content'}

Generate ${count} multiple-choice quiz questions to test understanding. Format:

Q1: [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Correct: [Letter]

Questions:`;

    return await this.generate(prompt, 400);
  }

  /**
   * Simplify complex concepts for struggling students
   * @param {string} concept - The difficult concept
   * @returns {Promise<string>} - Simplified explanation
   */
  async simplifyTopic(concept) {
    const prompt = `Explain this concept in simple terms for someone new to professional development:

"${concept}"

Use an analogy or real-world example. Keep it under 100 words and easy to understand.

Simple Explanation:`;

    return await this.generate(prompt, 200);
  }
}

module.exports = new AIHelper();
