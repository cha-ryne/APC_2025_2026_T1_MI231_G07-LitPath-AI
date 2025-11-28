# 🔒 Security Setup Guide

## ⚠️ CRITICAL: Your API Keys Were Exposed!

Your `.env` file was committed to the public GitHub repository, exposing:
- ✅ Gemini API Key
- ✅ Supabase Database Password
- ✅ Supabase Anon Key

## Immediate Actions Required:

### 1. Revoke Exposed Credentials

**Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Delete ALL existing API keys
3. Create a NEW API key
4. Save it securely (DO NOT commit to git)

**Supabase Database:**
1. Go to https://supabase.com/dashboard
2. Select your project: `xaudzmogsihyjfeagdbh`
3. Settings → Database → Database Password
4. Click "Reset database password"
5. Copy the new password
6. Update your `DATABASE_URL` in `.env`

### 2. Clean Up Git Repository

```powershell
# Remove .env from git tracking (keeps your local file)
git rm --cached backend/.env

# Commit the removal
git add .gitignore
git commit -m "Remove .env from version control"

# Push to GitHub
git push origin main
```

**Note:** This doesn't remove the file from git history. Anyone can still see old commits with the exposed keys. That's why you MUST revoke the keys first.

### 3. Setup Environment Variables Properly

**For your local machine:**
1. Copy `backend/.env.example` to `backend/.env`
2. Fill in your NEW credentials
3. Save the file
4. **Never commit `.env` to git** (already in `.gitignore` ✅)

**For your friend's machine:**
1. They should copy `.env.example` to `.env`
2. Fill in the same credentials (share securely via encrypted message, NOT via git)
3. Save and restart Django server

**For production/deployment:**
- Use environment variables in your hosting platform (Vercel, Railway, etc.)
- Never store secrets in code or git

## Best Practices Going Forward:

✅ **DO:**
- Keep `.env` in `.gitignore` (already done)
- Use `.env.example` with placeholder values for git
- Share credentials via secure channels (encrypted messages, password managers)
- Rotate API keys regularly
- Use different keys for development/production

❌ **DON'T:**
- Commit `.env` files to git
- Share API keys in screenshots, issues, or pull requests
- Use production keys in development
- Hardcode secrets in code files

## Verification Checklist:

- [ ] Deleted old Gemini API key
- [ ] Created new Gemini API key
- [ ] Reset Supabase database password
- [ ] Updated local `.env` with new credentials
- [ ] Ran `git rm --cached backend/.env`
- [ ] Pushed changes to GitHub
- [ ] Verified `.env` is NOT visible in GitHub repository
- [ ] Tested application with new credentials
- [ ] Shared new credentials with team members securely

## Additional Security Measures:

### Add API Key Restrictions (Recommended):
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find your Gemini API key
3. Add restrictions:
   - **Application restrictions:** HTTP referrers (websites) or IP addresses
   - **API restrictions:** Only allow Generative Language API

### Use Environment Variables in Production:
```bash
# On hosting platforms like Vercel/Railway/Heroku:
GEMINI_API_KEY=your-key-here
DATABASE_URL=your-db-url-here
```

## Need Help?
- Google AI Studio: https://ai.google.dev/
- Supabase Docs: https://supabase.com/docs
- Django Security: https://docs.djangoproject.com/en/stable/topics/security/
