# Authentication Testing Guide

## **Test the Fixed Authentication Flow**

### **Prerequisites**

- ✅ App is running with `npm start`
- ✅ You have valid Supabase credentials in `.env`
- ✅ Database table `public.tasks` is created

### **Test 1: Login Flow**

1. **Open the app** - should show login screen
2. **Enter your credentials** and tap "Sign In"
3. **Watch console logs** for:
   ```
   Sign in successful, waiting for auth state change...
   Auth state change: SIGNED_IN user@example.com
   RootLayout render - user: user@example.com loading: false
   ```
4. **Navigation should happen automatically** to main app
5. **Check debug component** - should show your user info

### **Test 2: Logout Flow**

1. **In main app**, tap the logout button (top right header)
2. **Watch console logs** for:
   ```
   Signing out...
   Sign out successful, waiting for auth state change...
   Auth state change: SIGNED_OUT undefined
   RootLayout render - user: undefined loading: false
   ```
3. **Navigation should happen automatically** back to login screen

### **Test 3: Debug Button**

1. **On login screen**, tap the red "Debug Auth State" button
2. **Check console** for debug information
3. **Verify Supabase client** is properly configured

### **Expected Console Output**

**Successful Login:**

```
Sign in successful, waiting for auth state change...
Auth state change: SIGNED_IN user@example.com
RootLayout render - user: user@example.com loading: false
```

**Successful Logout:**

```
Signing out...
Sign out successful, waiting for auth state change...
Auth state change: SIGNED_OUT undefined
RootLayout render - user: undefined loading: false
```

### **If Still Not Working**

**Check these common issues:**

1. **Supabase credentials** - verify `.env` file exists and has correct values
2. **Database table** - ensure `public.tasks` table exists in Supabase
3. **Network connectivity** - check if app can reach Supabase
4. **Console errors** - look for any JavaScript errors

**Debug Steps:**

1. **Clear app cache** - restart Expo Go completely
2. **Check Supabase dashboard** - verify project is active
3. **Test credentials** - try logging in via Supabase dashboard
4. **Check RLS policies** - ensure database permissions are correct

### **Remove Debug Components After Testing**

Once authentication is working:

1. Remove `AuthDebug` component from home screen
2. Remove debug button from login screen
3. Remove console.log statements from production code

## **Current Status**

- ✅ **Authentication hooks updated** with proper state management
- ✅ **Navigation flow improved** with force re-render mechanism
- ✅ **Remote update errors disabled** in app.json
- ✅ **Debug components added** for testing
- 🔄 **Ready for testing** - authentication should work immediately



