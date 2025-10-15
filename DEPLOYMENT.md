# Deployment Instructions for cPanel

## Prerequisites
- Node.js and npm installed on your local machine
- SSH access to your cPanel server (optional, for Git hook automation)
- cPanel File Manager access

## Method 1: Manual Deployment (Recommended for first time)

### Step 1: Build the Project Locally

```bash
# Install dependencies (if not already done)
npm install

# Build the production version
npm run build
```

This creates a `dist/` folder with optimized files ready for production.

### Step 2: Upload to cPanel

1. **Login to cPanel** and open **File Manager**
2. **Navigate** to `public_html` (or your domain's root directory)
3. **Delete all existing files** in the directory (backup first if needed)
4. **Upload all contents** from the `dist/` folder to `public_html`
   - You can use File Manager's upload feature
   - Or use FTP client like FileZilla
   - Make sure to upload the `.htaccess` file as well

### Step 3: Verify Deployment

Visit your domain in a browser. Your app should now work correctly!

---

## Method 2: Automated Deployment with Git Hooks

### Prerequisites
- SSH access to your cPanel server
- Git installed on the server
- Node.js and npm installed on the server

### Step 1: Set Up Git Repository on Server

```bash
# SSH into your server
ssh yourusername@yourdomain.com

# Create a bare Git repository
mkdir -p ~/repositories/yourapp.git
cd ~/repositories/yourapp.git
git init --bare
```

### Step 2: Install the Post-Receive Hook

```bash
# Navigate to hooks directory
cd ~/repositories/yourapp.git/hooks

# Create post-receive hook (use the deploy-hook.sh content)
nano post-receive

# Paste the content from deploy-hook.sh
# Update the paths to match your server setup:
# - REPO_DIR: Path to your bare git repository
# - WORK_TREE: Temporary directory for building
# - PUBLIC_WWW: Your public_html or domain root directory

# Make the hook executable
chmod +x post-receive
```

### Step 3: Configure Local Git Remote

```bash
# On your local machine, add the server as a remote
git remote add production ssh://yourusername@yourdomain.com/~/repositories/yourapp.git

# Push to deploy
git push production main
```

### Step 4: Automatic Deployment

Now every time you push to the production remote:

```bash
git push production main
```

The server will automatically:
1. Checkout the latest code
2. Install dependencies
3. Build the project
4. Deploy to your public_html
5. Clean up temporary files

---

## Troubleshooting

### Blank Page Issues
- **Check browser console** for errors (F12 → Console)
- **Verify .htaccess** file was uploaded and is in the root directory
- **Check file permissions**: Files should be 644, directories 755
- **Clear browser cache** and try again

### 404 Errors on Refresh
- Make sure `.htaccess` file exists in the root directory
- Verify mod_rewrite is enabled in cPanel (usually enabled by default)

### Environment Variables
If your app uses environment variables (like Supabase keys):
- Make sure `.env` variables are prefixed with `VITE_`
- They are embedded during build time, not runtime
- Rebuild after changing any environment variables

### API/Database Connection Issues
- Verify your Supabase URL and keys in `.env`
- Check CORS settings if connecting to external APIs
- Ensure your server can access external services

---

## Build Command Reference

```bash
# Development server (local only)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Important Notes

1. **Never upload source files** (`src/` folder) to production
2. **Always upload the `dist/` folder contents** after building
3. **Include the `.htaccess` file** from the `dist/` folder for routing
4. **Rebuild after any code changes** - changes to source files don't automatically reflect in production
5. **Environment variables** are baked into the build - rebuild if they change

---

## Quick Deployment Checklist

- [ ] Run `npm run build` locally
- [ ] Verify `dist/` folder was created
- [ ] Backup existing cPanel files (if any)
- [ ] Clear `public_html` directory
- [ ] Upload all contents from `dist/` to `public_html`
- [ ] Verify `.htaccess` file is present
- [ ] Test the website in a browser
- [ ] Check all routes work (refresh on different pages)
- [ ] Verify API connections work

---

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Verify all files uploaded correctly
3. Check cPanel error logs
4. Ensure your Supabase/backend is accessible from your domain
