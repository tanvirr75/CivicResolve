const PDFDocument = require('pdfkit');

/**
 * Generates a beautiful PDF Work Order purely in Node.js memory Buffer.
 * @param {Object} report - The full report model
 * @param {Object} worker - The full worker user model 
 * @param {String} notes - Custom administrative notes
 * @returns {Promise<Buffer>} The complete PDF file bytes ready for Cloudinary
 */
const generateWorkOrderPdf = (report, worker, notes) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // ── Branding & Header ──
      doc.fontSize(22).text('CivicResolve', { align: 'center' });
      doc.fontSize(12).fillColor('gray').text('Official Urban Maintenance Department', { align: 'center' });
      doc.moveDown(2);

      doc.fillColor('black').fontSize(16).text('Digital Work Order Dispatch', { align: 'center', underline: true });
      doc.moveDown(2);

      // ── Core Report Info ──
      doc.fontSize(14).text('Work Order Details:', { underline: true });
      doc.fontSize(12).moveDown(0.5);
      doc.text(`Official Report ID: ${report._id}`);
      doc.text(`Date Generated: ${new Date().toLocaleString()}`);
      doc.text(`Severity Level: ${report.severity || 'N/A'} / 5`);
      doc.moveDown();

      // ── Worker Assignment ──
      doc.fontSize(14).text('Assigned Field Worker:', { underline: true });
      doc.fontSize(12).moveDown(0.5);
      doc.text(`Name: ${worker.name}`);
      doc.text(`Employee ID: ${worker.employeeId || 'N/A'}`);
      doc.text(`Account ID: ${worker._id}`);
      doc.moveDown();

      // ── Issue Summary ──
      doc.fontSize(14).text('Issue Summary:', { underline: true });
      doc.fontSize(12).moveDown(0.5);
      doc.text(`Category: ${report.category}`);
      doc.text(`Title: ${report.title}`);
      doc.text(`Description: ${report.description}`);
      doc.text(`GPS Location: [${report.latitude}, ${report.longitude}]`);
      doc.moveDown();

      // ── Admin Notes ──
      if (notes) {
        doc.fontSize(14).text('Official Notes/Instructions:', { underline: true });
        doc.fontSize(12).moveDown(0.5);
        doc.text(notes);
        doc.moveDown();
      }

      // ── Footer ──
      doc.moveDown(4);
      doc.fontSize(9).fillColor('grey').text('This is an automatically generated document by the CivicResolve automated system. Ensure photographic "Proof of Fix" is submitted before closure.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateWorkOrderPdf };
