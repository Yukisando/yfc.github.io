# How to Post Using GitHub Issues

This website uses GitHub Issues as a free posting system. Here's how to create a new post:

## Step-by-Step Guide

### 1. Go to the Issues Tab
Visit: https://github.com/Yukisando/yfc.github.io/issues

### 2. Click "New Issue"
You'll see a template called "📝 New Post" - click "Get started"

### 3. Fill in the Form
- **Title**: Replace "[POST] " with your post text (e.g., "[POST] Off to work!")
- **Access Code**: `iloveyuki` (required - hidden immediately for security)
- **Content**: 
  - **Drag and drop images directly into the Content box!**
  - GitHub automatically uploads them for you
  - You can leave the content field with just images, or add additional text if you want

### 4. Submit the Issue
Click "Submit new issue"

### 5. Wait for Automation (about 30 seconds)
- GitHub Actions automatically processes your post
- It hides the access code immediately for security
- Checks if the code was correct
- Extracts your images automatically
- Adds today's date automatically
- Updates the website
- You'll get a ✅ comment when it's done

### 6. Done!
Your post is now live! Refresh the website to see it.

## Example

**Title**: `[POST] Off to work!`  
**Access Code**: `iloveyuki`  
**Content**: 
```
[Just drag and drop your images here!]
```

## What Happens Automatically

✅ **Date** - Uses today's date (DD-MM-YYYY)  
✅ **Post Text** - Taken from the issue title (after "[POST]")  
✅ **Images** - Extracted from your drag-and-drop uploads in the Content field  
✅ **Access Code** - Hidden after verification for security  
✅ **Website Update** - Posts appear within 1-2 minutes

## Changing the Access Code

To change the access code, edit `.github/workflows/create-post.yml` and find this line:
```javascript
const CORRECT_PASSWORD = 'iloveyuki';
```
Change it to your new access code.

## Benefits of This System

✅ **100% Free** - Uses GitHub's free features  
✅ **No Server Needed** - Everything runs on GitHub  
✅ **Super Easy** - Just drag & drop images!  
✅ **Image Hosting** - GitHub hosts your images for free  
✅ **Password Protected** - Only people with the access code can post  
✅ **Automatic** - No manual file editing needed  
✅ **Mobile Friendly** - Post from your phone!
