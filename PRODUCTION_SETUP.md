# 🚀 VinciUI Production Setup Guide

Complete guide for setting up VinciUI with Google OAuth, AWS RDS, and developer accounts.

## ✅ **What We've Built**

Your VinciUI now has a complete production-ready security system:

- **🔐 Google OAuth Authentication**
- **🗄️ PostgreSQL Database (AWS RDS)**
- **⚡ Rate Limiting** with 3 tiers: Free, Premium, Developer
- **🛡️ Content Moderation** (bypassable for developers)
- **🔒 Protected API Endpoints**
- **👤 User Management** with usage tracking
- **📊 Audit Logging**

## 🎯 **User Tiers**

### **Free Tier** 🆓
- 2 images per day
- 5 prompt enhancements per day
- 30-minute cooldown between generations
- 300 character prompt limit
- Full content moderation

### **Premium Tier** ⭐
- 100 images per day
- 200 prompt enhancements per day
- No cooldown
- 1000 character prompt limit
- Full content moderation

### **Developer Tier** 🔧
- **1000 images per day** (unlimited for testing)
- **1000 prompt enhancements per day**
- **No cooldown periods**
- **2000 character prompt limit**
- **Content moderation bypass** (for testing)
- **Full API access**

## 🔧 **Setup Steps**

### **1. Google OAuth Setup**

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**
2. **Create new project** or select existing
3. **Enable Google+ API**:
   - APIs & Services → Library
   - Search "Google+ API" → Enable
4. **Create OAuth credentials**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client IDs
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:5173/api/auth/callback` (development)
     - `https://your-domain.vercel.app/api/auth/callback` (production)
5. **Copy Client ID and Client Secret**

### **2. Environment Variables**

Update your `.env.local`:

```env
# Frontend (exposed to client)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Backend (server-side only)
DATABASE_URL=postgresql://postgres:your_password@vinci-db.cn8ueayae54y.eu-north-1.rds.amazonaws.com:5432/postgres
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_super_long_random_jwt_secret_here_make_it_at_least_32_characters
BASE_URL=http://localhost:5173
NODE_ENV=development
```

### **3. Database is Ready** ✅

Your AWS RDS PostgreSQL database is already configured and working:
- ✅ Connection established
- ✅ Tables created
- ✅ SSL configured
- ✅ Security groups configured

### **4. Create Developer Account**

After setting up OAuth, create a developer account for testing:

```bash
# First, have the developer sign in via Google OAuth on your app
# Then promote them to developer tier:
npx tsx scripts/create-developer.ts developer@yourdomain.com
```

This will give them:
- 🔧 **Developer badge** in UI
- ⚡ **1000 daily generations**
- 🚫 **No content restrictions**
- 📏 **Extended prompt limits**
- ⏱️ **No cooldowns**

## 🌐 **Deployment Options**

### **Option A: Vercel (Recommended)**

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Deploy**:
```bash
vercel login
vercel
```

3. **Set Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Update `BASE_URL` to your Vercel domain

4. **Update OAuth redirect URIs** in Google Console:
   - Add `https://your-app.vercel.app/api/auth/callback`

### **Option B: AWS (Advanced)**

1. **Lambda Functions** for API endpoints
2. **API Gateway** for routing
3. **CloudFront** for CDN
4. **S3** for static assets

## 🧪 **Testing the System**

### **1. Test Authentication Flow**

1. Visit your deployed app
2. Click "Enter Workshop" → "Continue with Google"
3. Complete OAuth flow
4. Should see workshop with user profile

### **2. Test Rate Limiting**

**Free User:**
- Generate 2 images → should hit daily limit
- Try generating again → should show rate limit message

**Developer User:**
- Can generate many images without limits
- No cooldown periods
- Can use inappropriate prompts (moderation bypassed)

### **3. Test Content Moderation**

**Free/Premium Users:**
- Try prompt: "violent scene" → should be blocked
- Try prompt: "beautiful landscape" → should work

**Developer Users:**
- Any prompt should work (moderation bypassed for testing)

## 📊 **Monitoring & Analytics**

### **Database Queries**

```sql
-- Check user tiers
SELECT tier, COUNT(*) as count FROM users GROUP BY tier;

-- Daily usage stats
SELECT 
  DATE(created_at) as date,
  COUNT(*) as generations,
  COUNT(DISTINCT user_id) as unique_users
FROM generations 
WHERE status = 'success'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Content moderation stats
SELECT 
  action,
  COUNT(*) as count
FROM moderation_logs
GROUP BY action;

-- Developer account usage
SELECT 
  u.name,
  u.email,
  COUNT(g.id) as total_generations
FROM users u
LEFT JOIN generations g ON u.id = g.user_id
WHERE u.tier = 'developer'
GROUP BY u.id, u.name, u.email;
```

## 🔒 **Security Features**

### **Authentication**
- ✅ Google OAuth 2.0
- ✅ JWT tokens (7-day expiration)
- ✅ HTTP-only cookies
- ✅ CSRF protection

### **Rate Limiting**
- ✅ Per-user daily quotas
- ✅ Cooldown periods (free tier)
- ✅ Real-time usage tracking
- ✅ Automatic reset at midnight

### **Content Safety**
- ✅ 100+ banned keywords
- ✅ Pattern matching
- ✅ AI-powered moderation
- ✅ Audit logging
- ✅ Developer bypass for testing

### **API Security**
- ✅ Protected endpoints
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection

## 🎯 **Developer Account Benefits**

The developer tier is perfect for:

- **🧪 Testing all features** without restrictions
- **🔍 Content moderation testing** (can use any prompts)
- **⚡ Performance testing** (no rate limits)
- **🔧 API integration testing** (full access)
- **📊 Analytics testing** (high usage volumes)

## 🚨 **Important Notes**

1. **API Keys**: Keep Gemini API key secure (server-side only)
2. **Database**: AWS RDS is configured with SSL
3. **OAuth**: Redirect URIs must match exactly
4. **Rate Limits**: Enforced per-user, not per-session
5. **Developer Accounts**: Use sparingly, only for trusted developers

## 🎉 **You're Ready!**

Your VinciUI is now production-ready with:
- ✅ **Secure authentication**
- ✅ **Scalable database**
- ✅ **Content safety**
- ✅ **Developer testing capabilities**
- ✅ **Professional user management**

Deploy it and start creating amazing AI-generated images! 🎨

---

**Need help?** Check the troubleshooting section in the main README or create an issue.
