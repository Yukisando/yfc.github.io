# How to Post Using GitHub Issues

This website uses GitHub Issues as a free posting system. Here's how to create a new post:

## Step-by-Step Guide

### 1. Go to the Issues Tab
Visit: https://github.com/Yukisando/yfc.github.io/issues

### 2. Click "New Issue"
You'll see a template called "📝 New Post" - click "Get started"

### 3. Fill in the Form
- **Access Code**: `iloveyuki` (required - keeps random people from posting)
- **Content**: 
  - Write your post text
  - **Drag and drop images directly into the Content box!**
  - GitHub automatically uploads them for you
  - No need to copy/paste URLs anymore!

### 4. Submit the Issue
Click "Submit new issue"

### 5. Wait for Automation (about 30 seconds)
- GitHub Actions automatically processes your post
- It checks the access code (then hides it for security)
- Extracts your images automatically
- Adds today's date automatically
- Updates the website
- You'll get a ✅ comment when it's done

### 6. Done!
Your post is now live! Refresh the website to see it.

## Example

**Access Code**: `iloveyuki`  
**Content**: 
```
Having fun with my guild!
[Just drag and drop your images here - no need to do anything else!]
```

## What Happens Automatically

✅ **Date** - Uses today's date (DD-MM-YYYY)  
✅ **Images** - Extracted from your drag-and-drop uploads  
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
