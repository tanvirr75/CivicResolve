const Report = require('../models/Report');
const { Parser } = require('json2csv');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Export all reports to CSV format
// @route   GET /api/export/reports
// @access  Private (system_admin only)
// FR-18 (Data Export for Planning)
// ─────────────────────────────────────────────────────────────────────────────
const exportReportsCsv = async (req, res, next) => {
  try {
    // Fetch all reports and populate critical user references
    const reports = await Report.find({})
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Map nested objects and arrays into a flat structure for CSV compliance
    const flatReports = reports.map((rpt) => ({
      Report_ID: rpt._id.toString(),
      Title: rpt.title,
      Category: rpt.category,
      Severity: rpt.severity || 'N/A',
      Status: rpt.status,
      Is_Spam: rpt.isSpam ? 'Yes' : 'No',
      Latitude: rpt.latitude,
      Longitude: rpt.longitude,
      Priority_Score: rpt.priorityScore,
      Upvotes: rpt.upvoteCount || 0,
      Ward_ID: rpt.wardId || 'Unassigned',
      Submitted_By: rpt.submittedBy?.name || 'Anonymous',
      Assigned_To: rpt.assignedTo?.name || 'Nobody',
      Created_At: rpt.createdAt ? new Date(rpt.createdAt).toISOString() : '',
      Resolved_At: rpt.resolvedAt ? new Date(rpt.resolvedAt).toISOString() : 'Pending',
      // Dynamically calculate exact hours to resolution for analytics
      Resolution_Time_Hours: rpt.resolvedAt && rpt.createdAt 
        ? Math.round((new Date(rpt.resolvedAt) - new Date(rpt.createdAt)) / (1000 * 60 * 60)) 
        : ''
    }));

    // Explicitly define CSV headers
    const fields = [
      'Report_ID', 'Title', 'Category', 'Severity', 'Status', 'Is_Spam', 
      'Latitude', 'Longitude', 'Priority_Score', 'Upvotes', 'Ward_ID', 
      'Submitted_By', 'Assigned_To', 'Created_At', 'Resolved_At', 'Resolution_Time_Hours'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(flatReports);

    // Force browser or client to download the payload as a CSV file
    res.header('Content-Type', 'text/csv');
    res.attachment('civicresolve_reports_export.csv');
    
    return res.status(200).send(csv);

  } catch (err) {
    next(err);
  }
};

module.exports = { exportReportsCsv };
