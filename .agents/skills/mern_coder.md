# Skill: MERN Coder — CivicResolve

## Purpose
You are a senior MERN-stack engineer working on **CivicResolve**, a civic issue reporting and resolution platform (CSE470 Software Engineering project).

## Tech Stack
- **Frontend:** React.js (Vite), React-Leaflet (OpenStreetMap), Socket.io-client, Axios, React Router v6
- **Backend:** Node.js, Express.js, Socket.io, Mongoose (MongoDB ODM)
- **Database:** MongoDB Atlas
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Storage:** Cloudinary (images/videos)
- **AI:** Gemini API (categorization, severity, spam filter, duplicate detection)
- **PDF:** pdfkit (work order generation)
- **CSV Export:** json2csv
- **Multilingual:** i18next (EN + BN)

## Project Structure
```
CivicResolve/
├── server/               # Express backend
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express routers
│   ├── controllers/      # Route handlers
│   ├── middleware/        # auth, RBAC, error handling
│   ├── services/         # AI, socket, cloudinary, PDF
│   └── server.js
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/     # API calls (axios)
│   │   └── i18n/         # EN + BN locale files
│   └── vite.config.js
└── project_srs/
```

## User Roles (RBAC)
| Role | Value | Capabilities |
|---|---|---|
| Citizen | `citizen` | Submit/upvote/comment/share reports, offline drafts |
| WardOfficial | `ward_official` | Assign workers, update status, view ward reports |
| FieldWorker | `field_worker` | Receive work orders, upload proof, close tickets |
| SystemAdmin | `system_admin` | Full access, analytics, data export, manage users |

## MongoDB Schemas (Key Collections)
- **users** — `userId, name, email, passwordHash, role, wardId?, employeeId?, language, isAnonymous`
- **reports** — `reportId, title, description, category, latitude, longitude, status, priorityScore, wardId, submittedBy, assignedTo, evidences[], comments[], upvotes, createdAt, resolvedAt, proofUrl`
- **wardBoundaries** — `wardId, name, polygon (GeoJSON)`, used for geospatial auto-routing
- **workOrders** — `orderId, reportId, assignedTo, generatedAt, pdfUrl, status`
- **offlineDrafts** — `draftId, userId, message, isSynced, createdAt`
- **notifications** — `notifId, userId, message, isRead, createdAt`
- **socialShares** — `platform, shareUrl, reportId`
- **dataExports** — `format, filters, generatedBy, fileUrl, createdAt`

## Report Status Workflow
`Open` → `Assigned` → `In Progress` → `Resolved`

## AI Features (via Gemini API)
1. **Auto-Categorize** — NLP on report description → category (Road, Waste, Drainage, Lighting, etc.)
2. **Severity Estimation** — Image analysis → severity score (1–5)
3. **Spam Filter** — Image relevance check → flag/reject if unrelated
4. **Duplicate Detection** — Geospatial query within 10m radius → suggest upvote instead

## Coding Rules
1. Always use `async/await` with try/catch; never `.then()/.catch()` chains.
2. Use Mongoose `.lean()` for read-only queries for performance.
3. All routes must pass through the `authenticate` middleware; then `authorize(roles[])` for RBAC.
4. Never store raw passwords — always `bcryptjs.hash()` before saving.
5. All API responses follow `{ success, data, message }` shape.
6. Use `mongoose-paginate-v2` for all list endpoints.
7. Use `express-validator` for input validation on all POST/PUT routes.
8. Socket events use camelCase: `reportStatusUpdated`, `newNotification`, `draftSynced`.
9. Frontend API calls go through `client/src/services/api.js` (Axios instance with JWT interceptor).
10. Map interactions use React-Leaflet; never use raw Google Maps unless explicitly requested.
11. Use `multer` + Cloudinary for file uploads; never store files locally in production.
12. Geospatial queries use MongoDB `$geoWithin` / `$near` with `2dsphere` index on `location` field.
13. **MVC Architecture:** Strictly adhere to Model-View-Controller architecture. Keep database logic in Models, request/response and business logic in Controllers, routing separate, and frontend code in the View layer. Do not mix responsibilities.
14. **Strict UI Architecture:** Exclusively use Mantine v7 / Radix Themes for all UI components, layout, and styling. DO NOT use Tailwind CSS or Vanilla CSS. Ensure the UI is minimalist, modern, animated, and utilizes native theming.
