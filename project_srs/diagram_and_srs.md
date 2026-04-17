# Software Requirements Specification (SRS)

**Project Title:** CivicResolve - Urban Issue Reporting & Resolving Platform  
**Course Code:** CSE470  
**Course Title:** Software Engineering  
**Group No:** 08  

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to define the functional and non-functional requirements for "CivicResolve," a web and mobile-based platform designed to bridge the gap between citizens and city authorities. The system allows citizens to report urban issues (potholes, garbage, broken streetlights, drainage problems, etc.) using a map interface, and enables city officials to manage, track, and resolve these reports efficiently. This SRS is intended for the honorable course instructor.

### 1.2 Scope
CivicResolve is designed to:
* Allow citizens to submit geo-tagged reports with images/videos.
* Enable community verification via upvotes.
* Provide real-time status updates (Open → Assigned → In Progress → Resolved).
* Allow city officials/admins to route reports based on ward boundaries.
* Use AI to assist with categorization, spam detection, and duplicate detection.
* Provide analytics such as heatmaps and exportable reports.

The system aims to improve civic engagement, reduce response times for city maintenance, and provide transparent data visualization for urban planning.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Meaning |
| :--- | :--- |
| **SRS** | Software Requirements Specification |
| **MVC** | Model View Controller |
| **MERN** | MongoDB, Express.js, React.js, Node.js |
| **RBAC** | Role Based Access Control |
| **API** | Application Programming Interface |
| **AI** | Artificial Intelligence |
| **GIS** | Geographic Information System |

---

## 2. Overall Description

### 2.1 Product Perspective
CivicResolve is a new standalone system. It is not dependent on any legacy software. It will be developed as a web application with the following technology stack:
* **Frontend:** React.js
* **Backend:** Node.js + Express.js
* **Database:** MongoDB
* **Real-time Communication:** Socket.io
* **Maps:** React-Leaflet (OpenStreetMap) or Google Maps
* **Storage:** Cloudinary / Firebase Storage
* **AI Services:** Gemini API / OpenAI API

### 2.2 User Classes and Characteristics
* **Citizen:** Can report issues, view status, upvote nearby reports, and comment.
* **Ward Commissioner/Official:** Can view reports in their specific ward, assign tasks to workers, and update status.
* **Field Worker:** Receives work orders, uploads "Resolved" proof (images), and closes tickets.
* **System Admin:** Manages user accounts, monitors overall system health, and accesses datasets and analytics.

### 2.3 Operating Environment
* **Client:** Modern Web Browser (Chrome, Firefox, Edge) and Mobile Browser.
* **Server:** Node.js runtime environment.
* **Database:** MongoDB (Atlas Cluster).

---

## 3. System Features (Functional Requirements)

### Citizen Reports & Engagement
* **FR-01: Geo-Tagged Reporting** - Users drop a pin on a map interface to capture exact Latitude/Longitude coordinates for an issue.
* **FR-02: Evidence Submission** - Users upload images or short videos of the issue.
* **FR-03: Anonymous Reporting** - A toggle for "Anonymous Mode" to allow citizens to submit reports anonymously.
* **FR-04: Upvote & Community Verification** - Allow nearby users to "Verify" or "Upvote" a report.
* **FR-05: Comment & Discussion Threads** - Enable a threaded comment section for each report, allowing citizens and officials to communicate clarifications.
* **FR-06: Social Media Integration** - Generate shareable cards (with image and location) for Facebook/Twitter to allow citizens to publicly share issues.

### AI & Automation
* **FR-07: AI Auto-Categorization** - Analyze the report description text using NLP (e.g., Gemini API) and automatically assign a category (e.g., "Waste," "Drainage," "Road").
* **FR-08: Visual Severity Estimation** - Process uploaded images to estimate the severity of damage.
* **FR-09: Duplicate Report Detection** - Query geospatial data to detect if a similar report exists within a 10-meter radius and prompt the user to "Verify" the existing one instead of creating a new one.
* **FR-10: Automated Spam Filtering** - Use computer vision to flag and auto-reject irrelevant images (e.g., selfies, memes) that do not match the report category.

### Administrative Management
* **FR-11: Ward-Based Auto-Routing** - Automatically assign a new report to the specific Ward Commissioner based on which polygon boundary the GPS coordinates fall into.
* **FR-12: Status Workflow Management** - Standardized flow: Open → Assigned → In Progress → Resolved.
* **FR-13: Digital Work Order Generation** - Generate a downloadable PDF work order containing the map location, image, and details for offline field workers.
* **FR-14: "Proof of Fix" Validation** - Restrict the "Close Ticket" action until an official uploads a new "Resolved" photo, which the system compares against the original.
* **FR-15: Priority Calculation Algorithm** - Dynamically calculate a "Priority Score" for every issue.

### Data & System Utilities
* **FR-16: Real-Time Status Notifications** - WebSockets (Socket.io) to push instant alerts to the user when their report status changes (e.g., "Work Started").
* **FR-17: Public Heatmap Visualization** - Render a color-coded heatmap overlay on the main map to visualize clusters of high-issue density.
* **FR-18: Data Export for Planning** - Allow Admin users to export report data (Category, Location, Resolution Time) into CSV formats for external analysis.
* **FR-19: Offline Drafting Mode** - Allow the mobile view to save a report locally if the internet connection is lost and automatically sync/upload it once connectivity is restored.
* **FR-20: Multi-Language Support** - Provide a toggle to switch the entire UI (labels, buttons, notifications) between English and Bengali.

---

## 4. Non-Functional Requirements

### Performance
* **NFR-01: Response Time** - The system shall render the map and issue markers within 2 seconds on standard mobile networks.
* **NFR-02: Concurrent Users** - The backend shall support at least 100 simultaneous users without crashing or significant lag.

### Security
* **NFR-03: Data Protection** - All user passwords must be hashed (encrypted) before storage, and API access must be secured using JWT (JSON Web Tokens).

### Availability
* **NFR-04: Uptime** - The system shall aim to be available 99% of the time during business hours (9 AM - 5 PM).

### Usability
* **NFR-05: Mobile Responsiveness** - The user interface must be fully functional on mobile devices, as citizens will primarily report issues from the field.
