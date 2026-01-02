# Fixing 404 NOT_FOUND Errors on Vercel

If you're getting `404: NOT_FOUND` errors for API routes like `/api/servers` and `/api/tools`, follow these steps:

## Step 1: Check Vercel Build Logs

1. Go to: https://vercel.com/dashboard
2. Select your **Project Nexus** project
3. Go to **Deployments** tab
4. Click on the **latest deployment**
5. Check the **Build Logs** for any errors

**Look for:**
- Build errors or warnings
- TypeScript compilation errors
- Missing dependencies
- Route generation issues

## Step 2: Verify Build Output

Check if API routes are being built:

1. In the deployment, check the **Functions** tab
2. Look for functions like:
   - `api/servers`
   - `api/tools`
   - Other API routes

If they're missing, the build didn't include them.

## Step 3: Common Causes & Solutions

### Cause 1: Build Configuration Issue

**Check:** Make sure your build command is correct in Vercel:
- Go to **Settings** → **General**
- Build Command should be: `next build` (or just use default)
- Output Directory should be: `.next` (default)

### Cause 2: Node.js Version Mismatch

**Check:** 
1. Go to **Settings** → **General**
2. Node.js Version should be: `18.x` or `20.x`

### Cause 3: TypeScript Build Errors

Even with `ignoreBuildErrors: true`, some errors can prevent routes from being built.

**Solution:** Check build logs for TypeScript errors and fix them.

### Cause 4: Missing Dependencies

**Check:** Build logs for "Module not found" errors.

**Solution:** Ensure all dependencies in `package.json` are installed.

## Step 4: Force Rebuild

1. Go to **Deployments** tab
2. Click **⋯** on the latest deployment
3. Click **Redeploy**
4. Or create a new deployment by pushing to git

## Step 5: Check Vercel Function Logs

After deployment, check real-time logs:

1. Go to deployment
2. Click **Functions** tab
3. Try accessing `/api/servers` from your site
4. Check if any errors appear in the logs

## Step 6: Verify Route Files Exist

Make sure these files exist in your repo:
- ✅ `app/api/servers/route.ts`
- ✅ `app/api/tools/route.ts`
- ✅ Other API route files

Check with: `git ls-files app/api/`

## Quick Test

After redeploying, test these URLs directly:

- `https://your-project.vercel.app/api/servers`
- `https://your-project.vercel.app/api/tools`

Should return JSON (not 404).

## If Still Not Working

1. Check Vercel Support/Documentation
2. Try creating a minimal test route: `app/api/test/route.ts`
   ```typescript
   import { NextResponse } from 'next/server'
   export async function GET() {
     return NextResponse.json({ test: 'ok' })
   }
   ```
3. Deploy and test `/api/test`
4. If this works, the issue is specific to your routes (likely Supabase connection)
5. If this also 404s, it's a Vercel deployment issue
