import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: String,
  website: String,
  industry: String,
  location: String,
  funding: String,
  tags: [String],
});

export default mongoose.model("Company", companySchema);