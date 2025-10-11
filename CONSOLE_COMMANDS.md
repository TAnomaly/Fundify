# Console Commands to Debug

## Run these commands one by one in the browser console (F12 → Console tab)

### 1. Check if you're on a creator profile page
```javascript
window.location.pathname
```
Expected: `/creators/[username]`

### 2. Check React state for posts (if on creator page)
```javascript
// This will work after the new code deploys
// Look for the console logs automatically when page loads:
// "📰 Loaded posts: X"
// "Post 1: Title"
// "  - Images: [...]"
// "  - Video: ..."
```

### 3. Check what's in your test post by making an API call directly
```javascript
// Replace with your actual creator ID
const creatorId = 'YOUR_CREATOR_ID_HERE';
const token = localStorage.getItem('authToken');

fetch(`${window.location.origin}/api/posts/creator/${creatorId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('📡 API Response:', data);
  if (data.success && data.data.posts) {
    data.data.posts.forEach((post, i) => {
      console.log(`\nPost ${i + 1}: ${post.title}`);
      console.log('  Images:', post.images);
      console.log('  Video:', post.videoUrl);
    });
  }
});
```

### 4. Test if backend is reachable
```javascript
fetch(`${window.location.origin}/api/health`)
  .then(r => r.json())
  .then(data => console.log('🏥 Backend health:', data))
  .catch(e => console.error('❌ Backend not reachable:', e));
```

### 5. Check environment variables
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

