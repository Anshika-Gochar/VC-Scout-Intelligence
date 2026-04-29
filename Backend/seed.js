import mongoose from "mongoose";
import dotenv from "dotenv";
import Company from "./models/Company.js";

dotenv.config();

const companies = [
  {
    name: "Anthropic",
    website: "https://www.anthropic.com",
    industry: "AI/ML",
    location: "San Francisco",
    funding: "Series C",
    tags: ["AI", "Safety", "LLM"]
  },
  {
    name: "Stripe",
    website: "https://stripe.com",
    industry: "Fintech",
    location: "San Francisco",
    funding: "Series G",
    tags: ["Payments", "Financial Infrastructure"]
  },
  {
    name: "Notion",
    website: "https://notion.so",
    industry: "SaaS",
    location: "San Francisco",
    funding: "Series C",
    tags: ["Productivity", "Workspace"]
  },
  {
    name: "Figma",
    website: "https://www.figma.com",
    industry: "SaaS",
    location: "San Francisco",
    funding: "Series D",
    tags: ["Design", "Collaboration"]
  },
  {
    name: "Linear",
    website: "https://linear.app",
    industry: "SaaS",
    location: "San Francisco",
    funding: "Series B",
    tags: ["Project Management", "Dev Tools"]
  },
  {
    name: "Vercel",
    website: "https://vercel.com",
    industry: "SaaS",
    location: "San Francisco",
    funding: "Series C",
    tags: ["Cloud", "Deployment", "Frontend"]
  },
  {
    name: "OpenAI",
    website: "https://openai.com",
    industry: "AI/ML",
    location: "San Francisco",
    funding: "Series B",
    tags: ["AI", "Research", "LLM"]
  },
  {
    name: "Airbnb",
    website: "https://airbnb.com",
    industry: "E-commerce",
    location: "San Francisco",
    funding: "Series G",
    tags: ["Travel", "Marketplace"]
  },
  {
    name: "Coinbase",
    website: "https://www.coinbase.com",
    industry: "Crypto",
    location: "San Francisco",
    funding: "Series E",
    tags: ["Cryptocurrency", "Exchange"]
  },
  {
    name: "Duolingo",
    website: "https://www.duolingo.com",
    industry: "EdTech",
    location: "San Francisco",
    funding: "Series G",
    tags: ["Education", "Language Learning"]
  },
  {
    name: "Slack",
    website: "https://slack.com",
    industry: "SaaS",
    location: "San Francisco",
    funding: "Series F",
    tags: ["Communication", "Enterprise"]
  },
  {
    name: "Zoom",
    website: "https://zoom.us",
    industry: "SaaS",
    location: "San Jose",
    funding: "Series D",
    tags: ["Video", "Communication"]
  },
  {
    name: "Instacart",
    website: "https://www.instacart.com",
    industry: "E-commerce",
    location: "San Francisco",
    funding: "Series F",
    tags: ["Grocery", "Delivery"]
  },
  {
    name: "Discord",
    website: "https://discord.com",
    industry: "SaaS",
    location: "San Francisco",
    funding: "Series H",
    tags: ["Communication", "Gaming"]
  },
  {
    name: "Pinterest",
    website: "https://www.pinterest.com",
    industry: "E-commerce",
    location: "San Francisco",
    funding: "Series G",
    tags: ["Social", "Discovery"]
  },
  {
    name: "Databricks",
    website: "https://databricks.com",
    industry: "AI/ML",
    location: "San Francisco",
    funding: "Series H",
    tags: ["Data Analytics", "AI Infrastructure"]
  },
  {
    name: "Airtable",
    website: "https://airtable.com",
    industry: "SaaS",
    location: "San Francisco",
    funding: "Series D",
    tags: ["No-Code", "Productivity"]
  },
  {
    name: "Canva",
    website: "https://www.canva.com",
    industry: "SaaS",
    location: "Sydney",
    funding: "Series D",
    tags: ["Design", "Creative Tools"]
  },
  {
    name: "Fivetran",
    website: "https://www.fivetran.com",
    industry: "SaaS",
    location: "Oakland",
    funding: "Series C",
    tags: ["Data", "Integration"]
  },
  {
    name: " Gusto",
    website: "https://gusto.com",
    industry: "Fintech",
    location: "San Francisco",
    funding: "Series D",
    tags: ["HR", "Payroll"]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/vcscout");
    console.log("Connected to MongoDB");
    
    await Company.deleteMany({});
    console.log("Cleared existing companies");
    
    await Company.insertMany(companies);
    console.log(`Seeded ${companies.length} companies`);
    
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
