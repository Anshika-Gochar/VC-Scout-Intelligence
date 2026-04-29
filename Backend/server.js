import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import companyRoutes from "./routes/companyRoutes.js";
import enrichRoutes from "./routes/enrichRoutes.js";
import listRoutes from "./routes/listRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/companies", companyRoutes);
app.use("/api/enrich", enrichRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/notes", noteRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));
