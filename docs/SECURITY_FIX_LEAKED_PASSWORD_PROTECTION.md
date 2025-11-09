# Enable Leaked Password Protection

## ✅ Safe Security Fix (No Code Changes Required)

This is a **platform-level setting** that prevents users from signing up with passwords that have been exposed in known data breaches.

## What is Leaked Password Protection?

Leaked Password Protection checks user passwords against databases of credentials exposed in previous security breaches. This prevents users from creating accounts with compromised passwords that are vulnerable to credential stuffing attacks.

## Impact

- **No functionality changes** - This only affects new user signups
- **Improved security** - Users cannot use passwords from known breaches
- **Better user experience** - Proactively prevents account compromise

## How to Enable

### Option 1: Via Lovable Cloud Dashboard (Recommended)

1. Click the button below to open your backend dashboard:
   - **View Backend** button in your Lovable project

2. Navigate to the **Users** module

3. Go to **Auth Settings**

4. Enable **"Leaked Password Protection"**

5. (Optional) Consider also enabling:
   - Minimum password strength requirements
   - Password complexity rules

### Option 2: Via Supabase Dashboard (If using external Supabase)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Policies**
3. Enable **Leaked Password Protection**

## Additional Recommendations

Once enabled, you may also want to:

1. **Notify existing users** about the enhanced security (optional)
2. **Monitor for suspicious login patterns** 
3. **Consider implementing 2FA** for sensitive accounts

## Status

- [x] Documentation created
- [ ] **ACTION REQUIRED:** Enable the setting in your backend dashboard
- [ ] Verify new signups are protected

## Next Steps

After enabling this setting, move on to the next phase of the security fixes: **JWT Authentication Migration Plan**
