# Quick Setup Guide

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Wait for the project to be ready (usually 1-2 minutes)

## 2. Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
3. Copy the **anon public** key (starts with `eyJ...`)

## 3. Configure the App

### Option A: Using .env file (Recommended)

1. In your TodoApp folder, copy the template:

   ```bash
   cp env.template .env
   ```

2. Edit `.env` and replace the placeholders:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Option B: Set environment variables directly

**Windows PowerShell:**

```powershell
$env:EXPO_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**macOS/Linux:**

```bash
export EXPO_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 4. Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the SQL commands from the README.md file to create the tasks table
3. This sets up the database structure and security policies

## 5. Start the App

```bash
npm start
```

## 6. Test

- Scan the QR code with Expo Go app
- Or press `a` for Android emulator, `w` for web

## Troubleshooting

- **"Supabase Not Configured" error**: Make sure you've set the environment variables correctly
- **"Invalid URL" error**: Check that your Supabase URL is correct and starts with `https://`
- **Authentication errors**: Verify your anon key is correct

## Need Help?

- Check the main README.md for detailed information
- Review the Supabase documentation: [https://supabase.com/docs](https://supabase.com/docs)
- Check the app's console logs for specific error messages
