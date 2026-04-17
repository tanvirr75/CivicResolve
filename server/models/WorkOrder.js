const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * WorkOrder schema — generated PDF work orders for FieldWorkers.
 * UML: WorkOrder { orderId, assignedTo } — +generatePDF(), +assignWorker(), +validateProof(), +updateStatus()
 * SRS FR-13: Digital Work Order Generation
 * SRS FR-14: Proof of Fix Validation
 */
const workOrderSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // FieldWorker
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // WardOfficial
      required: true,
    },
    pdfUrl: {
      type: String, // Cloudinary URL of generated PDF
    },
    pdfPublicId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

workOrderSchema.plugin(mongoosePaginate);

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);
module.exports = WorkOrder;
