# TESTING VIDEO PLAYBACK - Quick Start

## Step 1: Place Your Test Video

Put your test video file here:
```
frontend/public/videos/test.mp4
```

**Example:**
- Copy any MP4 file to this folder
- Rename it to `test.mp4` or `week1.mp4`
- The file is now accessible at `/videos/test.mp4`

## Step 2: Start Your Server

```powershell
cd c:\Users\NewAdmin\Documents\ARG-professional-developement
npm start
```

Server will start at: `http://localhost:4000`

## Step 3: Add Video to a Lesson

### Method A: Via Admin Dashboard (Recommended)

1. **Open browser**: `http://localhost:4000/admin-dashboard.html`
2. **Login** with your admin account
3. **Select week** from dropdown (e.g., Week 1)
4. **Click "Edit"** button
5. **Fill in**:
   - Title: "Test Video"
   - Description: "Testing video playback"
   - Video URL: `/videos/test.mp4`
6. **Click "Save Changes"**

### Method B: Direct Database Update (Quick Test)

```powershell
# Open database
sqlite3 backend/data/project.db

# Update Week 1 with test video
UPDATE lessons SET 
  title = 'Test Video Lesson',
  description = 'Testing video playback functionality',
  video_url = '/videos/test.mp4'
WHERE week = 1;

# Verify
SELECT week, title, video_url FROM lessons WHERE week = 1;

# Exit
.exit
```

## Step 4: Test Playback

### View in Browser:

1. **Go to**: `http://localhost:4000/lessons.html`
2. **Select "Week 1"** from dropdown
3. **Video should display** in the lesson card

### Direct Video Access Test:

Open in browser: `http://localhost:4000/videos/test.mp4`
- Should play directly
- If not, check file exists in the folder

## Step 5: Verify It Works

**You should see:**
- ✅ Lesson title and description
- ✅ HTML5 video player
- ✅ Play/pause controls
- ✅ Video loads and plays

**If video doesn't show:**
1. Check browser console (F12 → Console tab)
2. Verify file path is correct
3. Ensure video format is MP4 (H.264)
4. Check file permissions

## Alternative: Test with External URL

Instead of uploading, use a public video URL:

1. **In admin dashboard**, set Video URL to:
   ```
   https://www.w3schools.com/html/mov_bbb.mp4
   ```
   (This is a public test video)

2. **View lessons page** - should play immediately

---

## Folder Structure

Your video should be here:
```
ARG-professional-developement/
├── frontend/
│   └── public/
│       ├── videos/           ← Place videos here
│       │   ├── test.mp4      ← Your test video
│       │   ├── week1.mp4     ← Lesson videos
│       │   └── week2.mp4
│       ├── lessons.html      ← View videos here
│       └── admin-dashboard.html  ← Manage videos here
```

---

## Quick Copy Command

If you have a video file on your desktop:

```powershell
# Copy from desktop to videos folder
Copy-Item "$env:USERPROFILE\Desktop\your-video.mp4" "c:\Users\NewAdmin\Documents\ARG-professional-developement\frontend\public\videos\test.mp4"
```

---

## Current Status

✅ Videos folder created: `frontend/public/videos/`  
✅ Server configured to serve static files  
✅ Lessons page ready to display videos  
✅ Admin dashboard ready to manage video URLs  

**Next:** Copy a video file and follow Step 3 above!
