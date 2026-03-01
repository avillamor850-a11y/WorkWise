# Railway Deployment Checklist - WorkWise

## 🚨 IMMEDIATE FIXES FOR 500 ERROR

### 1. Update Railway Environment Variables

Go to your Railway project → Variables tab and update these:

```env
# ❌ REMOVE or CHANGE these:
APP_DEBUG="false"           → APP_DEBUG=false (no quotes!)
CACHE_DRIVER="redis"        → CACHE_STORE=database (or redis without quotes)
DB_URL=...                  → Remove this, use DATABASE_URL only

# ✅ ENSURE these are set correctly:
APP_NAME=WorkWise
APP_ENV=production
APP_KEY=base64:DBUZCq+YUBzF0jPtt1ZdtKPsl37dm3tOS0y6g0JfNjc=
APP_DEBUG=false
APP_URL=https://workwise-production.up.railway.app

DB_CONNECTION=pgsql
DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}

# Start with database cache/session (more stable than Redis)
CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database

FILESYSTEM_DISK=public

LOG_CHANNEL=stack
LOG_LEVEL=error
```

### 2. Run These Commands in Order

```bash
# Step 1: Clear everything
railway run php artisan optimize:clear

# Step 2: Fix storage
railway run rm -f public/storage
railway run php artisan storage:link --force

# Step 3: Set permissions
railway run chmod -R 775 storage bootstrap/cache

# Step 4: Rebuild cache
railway run php artisan config:cache
railway run php artisan route:cache

# Step 5: Check logs
railway run tail -50 storage/logs/laravel.log
```

### 3. Quick Diagnostic

```bash
# Run the diagnostic script
bash railway-diagnose.sh

# Or manually check:
railway run php artisan about
railway run php artisan migrate:status
```

---

## 📋 DETAILED CHECKLIST

### ✅ Environment Configuration

- [ ] `APP_KEY` is set and valid (base64:...)
- [ ] `APP_DEBUG=false` (without quotes)
- [ ] `APP_ENV=production`
- [ ] `APP_URL` matches your Railway domain
- [ ] `DB_CONNECTION=pgsql`
- [ ] `DATABASE_URL` uses Railway's Postgres variable
- [ ] No duplicate `DB_URL` and `DATABASE_URL`
- [ ] Cache/Session drivers are valid (database, redis, or file)
- [ ] `FILESYSTEM_DISK=public` (not local)

### ✅ Database Setup

- [ ] PostgreSQL service is added to project
- [ ] Database service is linked (shows in References tab)
- [ ] Migrations have run successfully
- [ ] Can connect to database: `railway run php artisan migrate:status`

### ✅ Storage & Permissions

- [ ] Storage directories exist: `storage/app`, `storage/logs`, `storage/framework`
- [ ] Permissions are 775: `railway run chmod -R 775 storage bootstrap/cache`
- [ ] Symlink exists: `public/storage -> ../storage/app/public`
- [ ] Symlink is correct: `railway run readlink public/storage`
- [ ] Can write to logs: `railway run touch storage/logs/test.txt`

### ✅ Cache & Configuration

- [ ] Config cache is cleared: `php artisan config:clear`
- [ ] All caches cleared: `php artisan optimize:clear`
- [ ] Config is re-cached: `php artisan config:cache`
- [ ] Routes are cached: `php artisan route:cache`
- [ ] No stale `.env` cached

### ✅ Dependencies & Build

- [ ] Composer installed successfully: `composer install --no-dev`
- [ ] NPM packages installed: `npm ci`
- [ ] Assets built: `npm run build`
- [ ] Autoload generated: `composer dump-autoload`

### ✅ Redis (If Using)

- [ ] Redis service added to Railway project
- [ ] Redis service is linked
- [ ] `REDIS_URL` or individual Redis variables set
- [ ] Can connect: `railway run php artisan tinker --execute="Cache::put('test', 1);"`

### ✅ Railway Configuration

- [ ] `nixpacks.toml` exists and is optimized (no manual `start` command; Nixpacks will leverage Nginx + PHP-FPM for Laravel automatically).
- [ ] Build logs show no errors
- [ ] Deploy logs show no errors
- [ ] Health check passes (if configured)
- [ ] Port is correct (`$PORT` environment variable)

### ✅ Deployment Process

- [ ] Code pushed to repository
- [ ] Railway auto-deployed from push
- [ ] Build phase completed successfully
- [ ] Deploy phase completed successfully
- [ ] Application is running

---

## 🔍 TROUBLESHOOTING GUIDE

### Error: "No application encryption key"

**Cause:** `APP_KEY` not set or invalid

**Fix:**
```bash
# Generate new key locally
php artisan key:generate --show

# Copy output and set in Railway variables
# Should look like: base64:xxxxxxxxxxxxx
```

### Error: "SQLSTATE[08006] connection failed"

**Cause:** Database configuration wrong

**Fix:**
1. Check `DATABASE_URL` variable in Railway
2. Ensure Postgres service is linked
3. Try using individual DB_* variables instead:
```env
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_DATABASE=${{Postgres.PGDATABASE}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
```

### Error: "Connection refused [tcp://127.0.0.1:6379]"

**Cause:** Redis not available or misconfigured

**Fix:**
1. Either add Redis service in Railway
2. Or change to database drivers:
```env
CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

### Error: "failed to open stream: Permission denied"

**Cause:** Storage permissions wrong

**Fix:**
```bash
railway run chmod -R 775 storage bootstrap/cache
railway run chmod -R 775 storage/logs
```

### Error: "Symlink target is not valid"

**Cause:** Storage link broken

**Fix:**
```bash
railway run rm -f public/storage
railway run php artisan storage:link --force
railway run readlink public/storage  # Should show: ../storage/app/public
```

### Error: "Class 'X' not found"

**Cause:** Autoload not generated or outdated

**Fix:**
```bash
railway run composer dump-autoload
railway run php artisan optimize:clear
```

### Error: "Vite manifest not found"

**Cause:** Frontend assets not built

**Fix:**
```bash
# Locally or in Railway:
npm ci
npm run build
```

---

## 🚀 DEPLOYMENT WORKFLOW

### Initial Setup
1. Create Railway project
2. Add PostgreSQL service
3. Add Redis service (optional)
4. Link services to your app
5. Set all environment variables
6. Deploy application

### Every Deployment
1. Push code to repository
2. Railway auto-builds
3. Migrations run automatically (if configured in nixpacks.toml)
4. Application restarts
5. Verify deployment: `railway logs`

### If 500 Error Occurs
1. Check Railway logs: `railway logs`
2. Check Laravel logs: `railway run cat storage/logs/laravel.log`
3. Run diagnostic: `bash railway-diagnose.sh`
4. Run fix: `bash railway-fix.sh`
5. Check environment variables
6. Verify storage link
7. Clear caches

---

## 📱 USEFUL COMMANDS

### Viewing Logs
```bash
# Railway platform logs
railway logs
railway logs --limit 100

# Laravel application logs
railway run cat storage/logs/laravel.log
railway run tail -50 storage/logs/laravel.log
railway run tail -f storage/logs/laravel.log
```

### Database Commands
```bash
# Check connection
railway run php artisan db:show

# Run migrations
railway run php artisan migrate --force

# Check migration status
railway run php artisan migrate:status

# Seed database
railway run php artisan db:seed --force

# Fresh migration (⚠️ destroys data)
railway run php artisan migrate:fresh --force
```

### Cache Commands
```bash
# Clear all caches
railway run php artisan optimize:clear

# Clear specific caches
railway run php artisan config:clear
railway run php artisan route:clear
railway run php artisan view:clear
railway run php artisan cache:clear

# Rebuild caches
railway run php artisan config:cache
railway run php artisan route:cache
railway run php artisan view:cache
```

### Debugging Commands
```bash
# Show environment
railway run php artisan env

# Show app info
railway run php artisan about

# Laravel tinker (interactive shell)
railway run php artisan tinker

# Test specific code
railway run php artisan tinker --execute="dd(config('database'));"
```

---

## 🎯 QUICK REFERENCE

### Most Common Issues (in order)
1. ❌ `APP_DEBUG="false"` with quotes → Use `APP_DEBUG=false`
2. ❌ Redis not available → Switch to `CACHE_STORE=database`
3. ❌ Storage link broken → Run `storage:link --force`
4. ❌ Stale config cache → Run `optimize:clear`
5. ❌ Wrong DATABASE_URL → Check Postgres service variables

### Essential Environment Variables
```
APP_KEY=base64:...        (REQUIRED)
APP_DEBUG=false           (no quotes)
DATABASE_URL=${{...}}     (REQUIRED)
DB_CONNECTION=pgsql       (REQUIRED)
CACHE_STORE=database      (safe default)
SESSION_DRIVER=database   (safe default)
FILESYSTEM_DISK=public    (REQUIRED)
```

### One-Command Fix (try this first)
```bash
railway run php artisan optimize:clear && \
railway run rm -f public/storage && \
railway run php artisan storage:link --force && \
railway run chmod -R 775 storage bootstrap/cache && \
railway run php artisan config:cache
```

---

## 📞 GETTING HELP

If still experiencing issues:

1. **Check diagnostics:**
   ```bash
   bash railway-diagnose.sh > diagnostic-report.txt
   ```

2. **Get full logs:**
   ```bash
   railway logs > railway-logs.txt
   railway run cat storage/logs/laravel.log > laravel-logs.txt
   ```

3. **Check specific error:**
   Look for the actual error message in logs (not just "500")

4. **Common error patterns:**
   - "SQLSTATE" → Database issue
   - "Connection refused" → Redis/service unavailable  
   - "Permission denied" → Storage permissions
   - "Class not found" → Autoload issue
   - "No encryption key" → APP_KEY missing

---

**Last Updated:** 2025-06-13
**Railway Deployment:** WorkWise Production
