# Parent Account Integration Guide

## Overview

This guide explains how to integrate LitPath-AI with your parent website's user authentication system so that logged-in users automatically have their bookmarks synced without needing a separate login.

## How It Works

### Anonymous Users (Not Logged In)

- **No user account** → Uses anonymous ID (`anon_1731859200_abc123`)
- **Bookmarks saved to localStorage only**
- **Bookmarks persist on same browser/device**

### Authenticated Users (Logged into Parent Website)

- **Already logged in** → Uses parent account ID (`parent_12345`)
- **Bookmarks saved to localStorage + Supabase**
- **Bookmarks sync across all devices**
- **No separate login required** ✅ (automatically detects parent login)

## Integration Methods

LitPath-AI checks for parent user ID in this order:

### Method 1: SessionStorage (Recommended)

Best for single-session authentication that doesn't persist after browser close.

**Parent website code:**

```javascript
// When user logs in to parent website
sessionStorage.setItem('parent_user_id', user.id);

// When user logs out
sessionStorage.removeItem('parent_user_id');
```

**Pros:**

- Automatically cleared when browser/tab closes
- More secure than localStorage
- Shared across tabs in same session

---

### Method 2: LocalStorage

Best for persistent "remember me" functionality.

**Parent website code:**

```javascript
// When user logs in
localStorage.setItem('parent_user_id', user.id);

// When user logs out
localStorage.removeItem('parent_user_id');
```

**Pros:**

- Persists after browser close
- Simple to implement

**Cons:**

- Need to manually clear on logout
- Less secure than sessionStorage

---

### Method 3: URL Parameter

Best for embedding LitPath-AI in iframe or opening in new window.

**Parent website code:**

```javascript
// Open LitPath-AI with user ID
window.open(`https://litpath-ai.example.com?userId=${user.id}`, '_blank');

// Or in iframe
<iframe src="https://litpath-ai.example.com?userId=${user.id}"></iframe>
```

**Pros:**

- Works across domains
- Good for iframes
- No storage needed

**Cons:**

- User ID visible in URL
- Lost on page refresh (unless stored)

---

### Method 4: Cookie

Best for cross-subdomain authentication (e.g., `parent.com` → `litpath.parent.com`).

**Parent website code:**

```javascript
// When user logs in (set cookie for all subdomains)
document.cookie = `parent_user_id=${user.id}; path=/; domain=.example.com; max-age=2592000; SameSite=Lax`;

// When user logs out
document.cookie = `parent_user_id=; path=/; domain=.example.com; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
```

**Pros:**

- Works across subdomains
- Standard web authentication method
- Can set expiration time

**Cons:**

- More complex to implement
- Need to handle SameSite/CORS

---

## Recommended Integration Flow

### Step 1: Embed LitPath-AI in Parent Website

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Parent Website</title>
</head>
<body>
    <!-- Your parent website content -->
  
    <script>
        // When user logs in successfully
        function onUserLogin(userId) {
            sessionStorage.setItem('parent_user_id', userId);
            console.log('User logged in:', userId);
        }
      
        // When user logs out
        function onUserLogout() {
            sessionStorage.removeItem('parent_user_id');
            localStorage.removeItem('litpath_bookmarks'); // Optional: clear bookmarks
            console.log('User logged out');
        }
      
        // Example: Auto-login check on page load
        window.addEventListener('DOMContentLoaded', () => {
            const currentUser = getCurrentUser(); // Your auth function
            if (currentUser) {
                sessionStorage.setItem('parent_user_id', currentUser.id);
            }
        });
    </script>
  
    <!-- Embed LitPath-AI -->
    <iframe 
        src="http://localhost:5174" 
        width="100%" 
        height="800px" 
        frameborder="0"
    ></iframe>
</body>
</html>
```

---

### Step 2: Setup Supabase Database

1. **Create Supabase project** at https://supabase.com
2. **Run this SQL** in Supabase SQL Editor:

```sql
-- Create bookmarks table
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    author VARCHAR(500),
    year INTEGER,
    abstract TEXT,
    file VARCHAR(500) NOT NULL,
    degree VARCHAR(200),
    subjects TEXT,
    school VARCHAR(500),
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
    UNIQUE(user_id, file)
);

-- Indexes for performance
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_file ON bookmarks(file);
CREATE INDEX idx_bookmarks_bookmarked_at ON bookmarks(bookmarked_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write their own bookmarks (including anonymous)
CREATE POLICY "Users can manage their own bookmarks"
    ON bookmarks FOR ALL
    USING (true)  -- Allow all users (anonymous and authenticated)
    WITH CHECK (true);
```

3. **Add environment variables** to `my-app/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. **Restart dev server** after adding .env file

---

### Step 3: Test Integration

#### Test Anonymous User:

1. Clear storage: `sessionStorage.clear(); localStorage.clear();`
2. Reload LitPath-AI
3. Check console: Should see "Using anonymous user ID: anon_..."
4. Bookmark a paper → Saved to localStorage only

#### Test Authenticated User:

1. Set parent user ID: `sessionStorage.setItem('parent_user_id', '12345');`
2. Reload LitPath-AI
3. Check console: Should see "Using parent account user ID: parent_12345"
4. Bookmark a paper → Saved to localStorage + Supabase
5. Check Supabase: Should see record with `user_id = 'parent_12345'`

---

## Data Flow Diagram

```
Parent Website (has user accounts)
    ↓
Sets: sessionStorage.setItem('parent_user_id', userId)
    ↓
LitPath-AI reads parent_user_id
    ↓
    ├─ Found → Use parent account ID → Save to Supabase + localStorage
    └─ Not Found → Generate anonymous ID → Save to localStorage only
```

---

## Security Considerations

### ✅ Safe to Use

- Anonymous users can only access their own bookmarks (localStorage)
- Parent user IDs are prefixed (`parent_12345`) to prevent conflicts
- Supabase RLS (Row Level Security) prevents unauthorized access

### ⚠️ Important Notes

- **User IDs are NOT sensitive data** (they're just identifiers)
- **Bookmarks are NOT private** (they're just saved papers)
- If you need **private bookmarks**, implement Supabase Auth with JWT tokens

---

## Troubleshooting

### Bookmarks not syncing?

1. Check Supabase env vars in `.env`
2. Check browser console for errors
3. Verify Supabase table exists
4. Check RLS policies are enabled

### User ID not detected?

1. Open browser DevTools
2. Check `sessionStorage.getItem('parent_user_id')`
3. Verify parent website sets it correctly
4. Check console logs for "Using parent account user ID"

### Bookmarks lost after logout?

- Expected behavior! Clear user's localStorage on logout:

```javascript
function onUserLogout() {
    sessionStorage.removeItem('parent_user_id');
    localStorage.removeItem('litpath_bookmarks');
    localStorage.removeItem('litpath_user_id');
}
```

---

## Advanced: Custom Integration

If you need a custom integration method, modify the `useEffect` in `LitPathAI.jsx`:

```javascript
useEffect(() => {
    // Your custom user detection logic
    let parentUserId = await fetchUserFromYourAPI();
  
    let finalUserId;
    if (parentUserId) {
        finalUserId = `parent_${parentUserId}`;
    } else {
        finalUserId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  
    setUserId(finalUserId);
    loadBookmarkCount();
}, []);
```

---

## Summary

| Feature           | Anonymous Users            | Authenticated Users     |
| ----------------- | -------------------------- | ----------------------- |
| Login Required    | ❌ No                      | ❌ No (auto-detected)   |
| Bookmark Storage  | localStorage               | localStorage + Supabase |
| Cross-Device Sync | ❌ No                      | ✅ Yes                  |
| Persistence       | Until browser data cleared | Permanent (in Supabase) |
| User ID Format    | `anon_1731859200_abc`    | `parent_12345`        |

**Result:** Users from parent website get automatic sync, anonymous users still get bookmarks locally! 🎉
