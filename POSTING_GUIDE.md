# How to Post Using GitHub Issues

This website uses GitHub Issues as a free posting system. Here's how to create a new post:

## Step-by-Step Guide

### 1. Go to the Issues Tab
Visit: https://github.com/Yukisando/yfc.github.io/issues

### 2. Click "New Issue"
You'll see a template called "📝 New Post" - click "Get started"

### 3. Fill in the Form
- **Password**: `yukisan2024` (required - keeps random people from posting)
- **Date**: Use format DD-MM-YYYY (e.g., `29-10-2025`)
- **Content**: Write whatever you want to say
- **Image URLs**: 
  - Drag and drop images directly into the "Image URLs" text box
  - Wait for them to upload (you'll see a loading indicator)
  - GitHub will convert them to URLs automatically
  - The URLs will look like `https://github.com/user-attachments/assets/...`
  - You can add multiple images, one URL per line

### 4. Submit the Issue
Click "Submit new issue"

### 5. Wait for Automation
- GitHub Actions will automatically process your post
- It checks the password
- If correct, it adds the post to `posts.json`
- The website updates automatically
- You'll get a comment on the issue when it's done (✅ or ❌)

### 6. Done!
Your post is now live! The website updates within 1-2 minutes.

## Example

**Password**: `yukisan2024`  
**Date**: `29-10-2025`  
**Content**: `Having fun with my guild!`  
**Image URLs**:
```
https://github.com/user-attachments/assets/abc123.png
https://github.com/user-attachments/assets/def456.png
```

## Changing the Password

To change the password, edit `.github/workflows/create-post.yml` and find this line:
```javascript
const CORRECT_PASSWORD = 'yukisan2024';
```
Change it to your new password.

## Benefits of This System

✅ **100% Free** - Uses GitHub's free features  
✅ **No Server Needed** - Everything runs on GitHub  
✅ **Easy to Use** - Simple web form  
✅ **Image Hosting** - GitHub hosts your images for free  
✅ **Password Protected** - Only people with the password can post  
✅ **Automatic** - No manual file editing needed  
✅ **Mobile Friendly** - Post from your phone!
