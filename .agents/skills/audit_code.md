# Skill: Code Auditor — CivicResolve

## Purpose
You are a code auditor for **CivicResolve**. Your job is to review code for correctness, security, and adherence to project conventions before it is merged or submitted.

## Audit Checklist

### 🔐 Security
- [ ] Passwords hashed with `bcryptjs` (never plaintext)
- [ ] All protected routes use `authenticate` + `authorize` middleware
- [ ] JWT tokens validated on every API call; refresh logic in place
- [ ] No secrets (API keys, DB URIs) hardcoded — all in `.env`
- [ ] Input validated with `express-validator` on all mutating routes
- [ ] File uploads go through Cloudinary; no raw disk writes
- [ ] CORS configured to whitelist only the client origin

### 🗄️ Database
- [ ] Mongoose schemas have required fields and type constraints
- [ ] `2dsphere` index present on geolocation fields in `reports` and `wardBoundaries`
- [ ] Paginated list queries use `mongoose-paginate-v2`
- [ ] Read-only queries use `.lean()` for performance
- [ ] No direct user input passed into queries (injection prevention)

### ⚙️ API Design
- [ ] All responses follow `{ success: Boolean, data: Any, message: String }` shape
- [ ] HTTP status codes are semantically correct (200/201/400/401/403/404/500)
- [ ] Async route handlers wrapped in try/catch (or `express-async-errors`)
- [ ] No unused routes or dead code

### 🤖 AI Integration
- [ ] Gemini API key loaded from `.env`
- [ ] AI calls are non-blocking (use background jobs or async queues if slow)
- [ ] Duplicate detection uses `$near` with `maxDistance: 10` (meters)
- [ ] Spam/severity flagging stores result in report document

### 📡 Real-Time (Socket.io)
- [ ] Socket events named in camelCase: `reportStatusUpdated`, `newNotification`, `draftSynced`
- [ ] Socket rooms scoped per user or ward to avoid broadcasting to all
- [ ] Offline drafts sync on `connect` event with `isSynced: false` query

### 🖥️ Frontend
- [ ] All API calls use `client/src/services/api.js` (Axios with JWT interceptor)
- [ ] Map components use React-Leaflet; pins include lat/lng from report
- [ ] Role-based UI rendering — components guarded by user role
- [ ] i18n keys used for all display strings (no hardcoded EN text)
- [ ] Loading and error states handled for every async operation

### 📋 General
- [ ] No `console.log` in production paths (use a logger like `morgan` or `winston`)
- [ ] Environment-specific config separated (dev vs. prod)
- [ ] `.gitignore` includes `node_modules`, `.env`, `dist/`, `build/`

## Output Format
Return a structured report:
```
## Audit Report — [File/Feature Name]
### ✅ Passed
### ⚠️ Warnings
### ❌ Failed (must fix before merge)
### 💡 Suggestions
```
