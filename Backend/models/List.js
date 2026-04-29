import mongoose from "mongoose";

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("List", listSchema);
