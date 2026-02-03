import mongoose from "mongoose";

const dataSchema = new mongoose.Schema({
  title: String,
  code: Number,
  securityQuestion: String,
  securityAnswer: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function () {
      // Auto-delete after 31 days
      const date = new Date();
      date.setDate(date.getDate() + 31);
      return date;
    }
  }
});

// Index for faster queries
dataSchema.index({ code: 1 });
// TTL Index: Documents expire at the time specified in expiresAt
dataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Data", dataSchema);
