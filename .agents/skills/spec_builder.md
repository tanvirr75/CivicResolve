# Skill: Spec Builder — CivicResolve

## Purpose
You translate SRS functional requirements (FR-XX) and UML class definitions into precise, implementable technical specs for the CivicResolve development team.

## SRS → Spec Mapping Reference

| FR | Feature | Key Entities |
|---|---|---|
| FR-01 | Geo-Tagged Reporting | Report (lat, lng), React-Leaflet pin drop |
| FR-02 | Evidence Submission | Evidence (fileUrl, fileType), Cloudinary upload |
| FR-03 | Anonymous Reporting | Citizen.isAnonymous toggle |
| FR-04 | Upvote / Community Verification | Report.upvotes[], $push with dedup |
| FR-05 | Comment Threads | Comment (commentId, content, authorId) |
| FR-06 | Social Media Share | SocialShare (platform, shareUrl), OG card generation |
| FR-07 | AI Auto-Categorization | AIService.categorize() → Report.category |
| FR-08 | Visual Severity Estimation | AIService.estimateSeverity() → Report.severity |
| FR-09 | Duplicate Detection | AIService.detectDuplicate() → $near 10m query |
| FR-10 | Spam Filtering | AIService.filterSpam() → flag/reject image |
| FR-11 | Ward-Based Auto-Routing | WardBoundary.$geoWithin → WardOfficial.assignReport() |
| FR-12 | Status Workflow | Report.status enum: Open→Assigned→InProgress→Resolved |
| FR-13 | Work Order PDF | WorkOrder, pdfkit, Cloudinary upload |
| FR-14 | Proof of Fix Validation | FieldWorker.uploadProof() → Report.proofUrl → closeTicket() |
| FR-15 | Priority Score Algorithm | score = f(upvotes, severity, age) → Report.priorityScore |
| FR-16 | Real-Time Notifications | Socket.io `reportStatusUpdated`, Notification schema |
| FR-17 | Heatmap Visualization | Heatmap (layerId, colorScale), leaflet-heat plugin |
| FR-18 | CSV Data Export | DataExport, json2csv, Admin only |
| FR-19 | Offline Draft Mode | OfflineDraft (draftId, message, isSynced), localStorage + sync |
| FR-20 | Multi-Language Support | i18next, locale files: en.json + bn.json |

## Spec Output Format
When asked to spec a feature, output:

```markdown
## Spec: [Feature Name] (FR-XX)

### Endpoint(s)
- METHOD /api/route — description

### Request Body / Params
| Field | Type | Required | Notes |

### Response
{ success, data: { ... }, message }

### Mongoose Logic
- Schema fields touched
- Queries / updates

### AI / External Service
- Which service, what input/output

### Socket Event (if real-time)
- Event name, payload

### Frontend Component
- Component name, props, behavior

### Validation Rules
- express-validator rules

### Edge Cases
- List of edge cases to handle
```

## Priority Score Formula (FR-15)
```
priorityScore = (upvotes * 2) + (severity * 10) + (ageBonus)
ageBonus = Math.floor(hoursSinceCreation / 24) * 5   // +5 per day unresolved
```
Score is recalculated on every upvote and every status change.

## Ward Routing Logic (FR-11)
```js
// Find the ward whose polygon contains the report's coordinates
WardBoundary.findOne({
  polygon: { $geoIntersects: { $geometry: { type: "Point", coordinates: [lng, lat] } } }
})
```
Then assign `report.wardId` and notify the matching `WardOfficial` via Socket.io.
