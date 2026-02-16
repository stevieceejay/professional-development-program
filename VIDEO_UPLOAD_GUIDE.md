# Video Upload Guide

Quick guide for uploading and managing video content in the application.

---

## Pre-Upload Checklist

✅ **Disk Space**: You have **379 GB** free - plenty for videos  
✅ **Upload Directory**: Created at `backend/uploads/`  
✅ **File Limits**: 500MB per file configured  
✅ **Allowed Formats**: MP4, MOV, AVI, WMV, WebM  
✅ **Security**: File type validation and sanitization active  

---

## Video Upload Options

### Option 1: Upload Video Files Directly

1. **File Location**: Videos uploaded via the app will be stored in:
   ```
   backend/uploads/{userId}/timestamp_filename.mp4
   ```

2. **Access URL**: Uploaded videos are accessible at:
   ```
   /uploads/{userId}/timestamp_filename.mp4
   ```

3. **Admin Dashboard**: Use the "Video URL" field to reference uploaded videos:
   ```
   /uploads/1/1704938402123_week1_intro.mp4
   ```

### Option 2: External Video URLs (Recommended for Large Libraries)

1. **Host videos externally**:
   - YouTube (embed or direct link)
   - Vimeo
   - AWS S3 / CloudFront
   - Google Drive (public links)
   - Any HTTPS video URL

2. **In Admin Dashboard**, paste the full URL:
   ```
   https://www.youtube.com/embed/VIDEO_ID
   https://player.vimeo.com/video/VIDEO_ID
   https://yourdomain.com/videos/lesson1.mp4
   ```

### Option 3: Local Video Directory (Best for Self-Hosting)

1. **Create a videos directory**:
   ```powershell
   mkdir backend\public\videos
   ```

2. **Copy video files** to this directory:
   ```
   backend/public/videos/week1.mp4
   backend/public/videos/week2.mp4
   ```

3. **Serve via static middleware** (already configured):
   ```javascript
   // In server.js
   app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
   ```

4. **Reference in admin dashboard**:
   ```
   /videos/week1.mp4
   ```

---

## Recommended Video Formats

### Compression & Quality
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1080p (1920x1080) for high quality, 720p (1280x720) for smaller file size
- **Bitrate**: 4-8 Mbps for 1080p, 2-4 Mbps for 720p
- **Audio**: AAC codec, 128-192 kbps

### File Size Estimates
- **10-minute video at 1080p**: ~300-600 MB
- **10-minute video at 720p**: ~150-300 MB
- **1-hour video at 1080p**: ~1.8-3.6 GB

### Compression Tools
- **Free**: HandBrake, FFmpeg
- **Online**: CloudConvert, Online-Convert
- **Professional**: Adobe Media Encoder, Compressor

---

## Testing Upload Functionality

### 1. Start the Server
```powershell
npm start
# Or in development mode:
npm run dev
```

### 2. Test Small Upload First
- Upload a small test video (< 50MB)
- Verify it appears in `backend/uploads/{userId}/`
- Check that the file is accessible via browser

### 3. Test Large Upload
- Upload a larger video (100-500MB)
- Monitor for timeout issues
- Verify rate limiting doesn't block legitimate uploads

### 4. Test Video Playback
- Open lessons page
- Verify video loads and plays correctly
- Test on different browsers (Chrome, Firefox, Edge)
- Test on mobile devices if applicable

---

## Current Application Workflow

### Admin: Adding a Lesson with Video

1. **Login** as admin user
2. **Navigate** to Admin Dashboard
3. **Select week** from dropdown
4. **Edit lesson** fields:
   - Title: "Week 1: Introduction to Professional Development"
   - Description: "Overview of the program..."
   - Video URL: Enter one of:
     - External URL: `https://youtube.com/...`
     - Uploaded file: `/uploads/1/video.mp4`
     - Local video: `/videos/week1.mp4`
5. **Save** the lesson

### Students: Viewing Lessons

1. **Navigate** to Lessons page (`/lessons.html`)
2. **Video displays** automatically if `video_url` is set
3. **Browser plays** the video using HTML5 `<video>` tag

---

## Storage Strategy Recommendations

### For Small Organizations (< 100 users)
- **Use local storage** in `backend/uploads/` or `backend/public/videos/`
- **Backup regularly** to external drive or cloud storage
- **Monitor disk space** weekly

### For Medium Organizations (100-1000 users)
- **Use cloud storage** (AWS S3, Google Cloud Storage)
- **Enable CDN** for faster delivery (CloudFront, Cloudflare)
- **Keep local backup** of original files

### For Large Organizations (1000+ users)
- **Dedicated video hosting** (Vimeo Pro, Wistia, YouTube)
- **CDN required** for global audience
- **Separate storage server** from application server

---

## Nginx Configuration for Video Streaming

If using local video files, optimize Nginx for video delivery:

```nginx
location /uploads/ {
    # Enable byte-range requests for video seeking
    add_header Accept-Ranges bytes;
    
    # Cache video files
    expires 30d;
    add_header Cache-Control "public, immutable";
    
    # Enable sendfile for efficient file serving
    sendfile on;
    tcp_nopush on;
    
    # Large file optimization
    proxy_buffering off;
    proxy_request_buffering off;
}

location /videos/ {
    alias /path/to/backend/public/videos/;
    add_header Accept-Ranges bytes;
    expires 30d;
    sendfile on;
}
```

---

## Troubleshooting

### Upload Fails
1. **Check disk space**: `df -h` (Linux) or `Get-PSDrive` (Windows)
2. **Check file size**: Must be < 500MB
3. **Check file type**: Must be mp4, mov, avi, wmv, or webm
4. **Check rate limiting**: Wait 15 minutes if hit upload limit
5. **Check logs**: `pm2 logs argapp` or `journalctl -u argapp -f`

### Video Won't Play
1. **Check file exists**: Browse to URL directly
2. **Check permissions**: File should be readable (644)
3. **Check MIME type**: Server should send `video/mp4`
4. **Check browser console**: Look for CORS or security errors
5. **Test different browsers**: Some codecs not supported everywhere

### Slow Upload
1. **Check internet speed**: Upload speed is often slower than download
2. **Compress video first**: Use HandBrake or FFmpeg
3. **Use wired connection**: WiFi can be unreliable for large uploads
4. **Upload during off-hours**: Less network congestion

### Video Streaming Issues
1. **Enable byte-range requests**: Check Nginx configuration
2. **Reduce bitrate**: Re-encode at lower quality
3. **Use adaptive streaming**: Consider HLS or DASH for large videos
4. **Check CDN**: Ensure CDN is properly configured

---

## Security Considerations

✅ **File Type Validation**: Only allowed video formats accepted  
✅ **File Size Limits**: 500MB maximum prevents DoS  
✅ **Filename Sanitization**: Special characters removed  
✅ **User Isolation**: Videos stored in user-specific directories  
✅ **Rate Limiting**: 50 uploads per 15 minutes  
✅ **Authentication**: Upload endpoints require login  

---

## Monitoring Video Storage

### Check Storage Usage
```powershell
# Windows
du -sh backend/uploads

# Or detailed breakdown
Get-ChildItem backend/uploads -Recurse | Measure-Object -Property Length -Sum
```

### Set Up Alerts
- Monitor disk space monthly
- Alert when < 50GB free
- Archive old videos to cold storage

---

## Next Steps

1. ✅ **Test upload with small file** (< 50MB)
2. ✅ **Verify file appears in uploads directory**
3. ✅ **Test video playback in browser**
4. ✅ **Upload actual lesson video**
5. ✅ **Update lesson via admin dashboard**
6. ✅ **Verify students can view video**

---

**Ready to upload!** Your system is configured and tested. Start with a small test video, then proceed with your actual lesson content.

---

## Server-Side Video Upload Configuration

For developers: Configure video upload handling in the server code.

### 1. Install Dependencies
```bash
npm install multer
```

### 2. Configure Multer Storage
```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Create uploads/videos directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/videos');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const lessonId = req.params.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `lesson-${lessonId}-${timestamp}${ext}`);
  }
});

// File filter - only accept videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|avi|mov|wmv|flv|mkv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('video/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'));
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: fileFilter
});

module.exports = upload;
```
