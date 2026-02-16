const API_URL = '/api';

// ==================== LESSONS ====================
// Fetch all lessons
async function fetchLessons() {
    try {
        const response = await fetch(`${API_URL}/lessons`);
        if (!response.ok) throw new Error('Failed to fetch lessons');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || data.lessons || []);
    } catch (error) {
        console.error('Error fetching lessons:', error);
        return [];
    }
}

// Fetch single lesson
async function fetchLesson(lessonId) {
    try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}`);
        if (!response.ok) throw new Error('Failed to fetch lesson');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lesson:', error);
        return null;
    }
}

// Fetch assignments for a lesson
async function fetchAssignments(lessonId) {
    try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}/assignments`);
        if (!response.ok) throw new Error('Failed to fetch assignments');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || data.assignments || []);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
    }
}

// ==================== SUBMISSIONS ====================
// Submit assignment
async function submitAssignment(assignmentId, content) {
    try {
        const response = await fetch(`${API_URL}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignment_id: assignmentId, content })
        });
        if (!response.ok) throw new Error('Failed to submit assignment');
        return await response.json();
    } catch (error) {
        console.error('Error submitting assignment:', error);
        throw error;
    }
}

// Get user submissions
async function getUserSubmissions() {
    try {
        // Try multiple possible endpoints
        let response = await fetch(`${API_URL}/submissions/me`);
        if (response.status === 404) {
            response = await fetch(`${API_URL}/submissions/my`);
        }
        if (!response.ok) throw new Error('Failed to fetch submissions');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || data.submissions || []);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return [];
    }
}

// ==================== ADMIN - SUBMISSIONS ====================
// Get all submissions (admin only)
async function getAllSubmissions() {
    try {
        const response = await fetch(`${API_URL}/submissions`);
        if (!response.ok) throw new Error('Failed to fetch submissions');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || data.submissions || []);
    } catch (error) {
        console.error('Error fetching all submissions:', error);
        return [];
    }
}

// Get submission by ID (admin only)
async function getSubmission(submissionId) {
    try {
        const response = await fetch(`${API_URL}/submissions/${submissionId}`);
        if (!response.ok) throw new Error('Failed to fetch submission');
        return await response.json();
    } catch (error) {
        console.error('Error fetching submission:', error);
        return null;
    }
}

// Grade submission (admin only)
async function gradeSubmission(submissionId, grade, feedback = '') {
    try {
        const response = await fetch(`${API_URL}/submissions/${submissionId}/grade`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade: parseFloat(grade), feedback })
        });
        if (!response.ok) throw new Error('Failed to grade submission');
        return await response.json();
    } catch (error) {
        console.error('Error grading submission:', error);
        throw error;
    }
}

// ==================== ADMIN - USERS ====================
// Get all users (admin only)
async function getAllUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || data.users || []);
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

// Get user by ID (admin only)
async function getUser(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        return await response.json();
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

// Get user submissions (admin only)
async function getUserSubmissionsByUserId(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/submissions`);
        if (!response.ok) throw new Error('Failed to fetch user submissions');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || data.submissions || []);
    } catch (error) {
        console.error('Error fetching user submissions:', error);
        return [];
    }
}

// Delete user (admin only)
async function deleteUser(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return await response.json();
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

// ==================== ADMIN - LESSONS ====================
// Create lesson (admin only)
async function createLesson(lessonData) {
    try {
        const response = await fetch(`${API_URL}/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lessonData)
        });
        if (!response.ok) throw new Error('Failed to create lesson');
        return await response.json();
    } catch (error) {
        console.error('Error creating lesson:', error);
        throw error;
    }
}

// Update lesson (admin only)
async function updateLesson(lessonId, lessonData) {
    try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lessonData)
        });
        if (!response.ok) throw new Error('Failed to update lesson');
        return await response.json();
    } catch (error) {
        console.error('Error updating lesson:', error);
        throw error;
    }
}

// Delete lesson (admin only)
async function deleteLesson(lessonId) {
    try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete lesson');
        return await response.json();
    } catch (error) {
        console.error('Error deleting lesson:', error);
        throw error;
    }
}

// ==================== AUTHENTICATION ====================
// Get current user
async function getCurrentUser() {
    try {
        // Try multiple possible endpoints
        let response = await fetch(`${API_URL}/users/me`);
        if (response.status === 404) {
            response = await fetch(`${API_URL}/user`);
        }
        if (response.status === 404) {
            response = await fetch(`${API_URL}/session`);
        }
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Login
async function login(username, password) {
    try {
        const response = await fetch(`${API_URL}/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
}

// Logout
async function logout() {
    try {
        const response = await fetch(`${API_URL}/signout`, { method: 'POST' });
        return await response.json();
    } catch (error) {
        console.error('Error logging out:', error);
        throw error;
    }
}

// Signup
async function signup(username, password, email) {
    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        return await response.json();
    } catch (error) {
        console.error('Error signing up:', error);
        throw error;
    }
}

// ==================== STATS (ADMIN) ====================
// Get platform statistics
async function getStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
}

// ==================== VIDEOS (ADMIN) ====================
// Upload video for lesson
async function uploadVideo(lessonId, videoFile) {
    try {
        const formData = new FormData();
        formData.append('video', videoFile);
        
        const response = await fetch(`${API_URL}/lessons/${lessonId}/video`, {
            method: 'POST',
            body: formData  // Don't set Content-Type header - browser does it automatically with boundary
        });
        if (!response.ok) throw new Error('Failed to upload video');
        return await response.json();
    } catch (error) {
        console.error('Error uploading video:', error);
        throw error;
    }
}

// Delete video from lesson
async function deleteVideo(lessonId) {
    try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}/video`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete video');
        return await response.json();
    } catch (error) {
        console.error('Error deleting video:', error);
        throw error;
    }
}

// Get video URL for lesson
async function getVideoUrl(lessonId) {
    try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}/video`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.video_url || data.url || null;
    } catch (error) {
        console.error('Error fetching video URL:', error);
        return null;
    }
}

// Upload video with progress tracking
async function uploadVideoWithProgress(lessonId, videoFile, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('video', videoFile);

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject(new Error('Upload failed'));
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
        });

        // Send request
        xhr.open('POST', `${API_URL}/lessons/${lessonId}/video`);
        xhr.send(formData);
    });
}

// Example usage
// Example: fetch current user's submissions
fetch('/api/submissions/my', { credentials: 'same-origin' })
    .then(async r => { console.log('STATUS', r.status); console.log(await r.json()); })
    .catch(console.error);