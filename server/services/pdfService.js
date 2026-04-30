const PDFDocument = require('pdfkit');
const QRCode      = require('qrcode');

/**
 * Generates a PDF Work Order purely in Node.js memory (Buffer).
 * Embeds a QR code linking to Google Maps for the GPS coordinates.
 * @param {Object} report  - The full report model
 * @param {Object} worker  - The full worker user model
 * @param {String} notes   - Custom administrative notes
 * @returns {Promise<Buffer>} The complete PDF file bytes ready for Cloudinary
 */
const generateWorkOrderPdf = async (report, worker, notes) => {
  // ── 1. Generate QR code as a PNG Buffer in RAM ───────────────────────────
  // QRCode.toBuffer runs async — we await before touching the PDF stream.
  const mapsUrl   = `https://maps.google.com/?q=${report.latitude},${report.longitude}`;
  const qrBuffer  = await QRCode.toBuffer(mapsUrl, {
    type:              'png',
    width:             120,
    margin:            1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // ── 2. Build PDF synchronously now that we have all assets ──────────────
  return new Promise((resolve, reject) => {
    try {
      const doc     = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end',  () => resolve(Buffer.concat(buffers)));

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
      doc.text(`Date Generated:     ${new Date().toLocaleString()}`);
      doc.text(`Severity Level:     ${report.severity || 'N/A'} / 5`);
      doc.moveDown();

      // ── Worker Assignment ──
      doc.fontSize(14).text('Assigned Field Worker:', { underline: true });
      doc.fontSize(12).moveDown(0.5);
      doc.text(`Name:        ${worker.name}`);
      doc.text(`Employee ID: ${worker.employeeId || 'N/A'}`);
      doc.text(`Account ID:  ${worker._id}`);
      doc.moveDown();

      // ── Issue Summary ──
      doc.fontSize(14).text('Issue Summary:', { underline: true });
      doc.fontSize(12).moveDown(0.5);
      doc.text(`Category:    ${report.category}`);
      doc.text(`Title:       ${report.title}`);
      doc.text(`Description: ${report.description}`);

      // ── GPS Coordinates + QR Code side-by-side ──
      doc.moveDown(0.5);
      const coordsY = doc.y;
      doc.text(`GPS Location: ${report.latitude}, ${report.longitude}`);
      if (report.streetAddress) {
        doc.fontSize(10).fillColor('gray').text(`Address: ${report.streetAddress}`);
        doc.fillColor('black').fontSize(12);
      }
      doc.text('Scan QR to open in Google Maps →', { continued: false });
      // Place QR image to the right of the text block
      doc.image(qrBuffer, doc.page.width - 170, coordsY, { width: 100 });
      doc.moveDown(4); // leave room for the QR image

      // ── Admin Notes ──
      if (notes) {
        doc.fontSize(14).text('Official Notes/Instructions:', { underline: true });
        doc.fontSize(12).moveDown(0.5);
        doc.text(notes);
        doc.moveDown();
      }

      // ── Footer ──
      doc.moveDown(2);
      doc.fontSize(9).fillColor('grey').text(
        'This is an automatically generated document by the CivicResolve automated system. ' +
        'Ensure photographic "Proof of Fix" is submitted before closure.',
        { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateWorkOrderPdf };
