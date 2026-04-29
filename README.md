# VC Scout - Venture Capital Company Discovery Platform

A premium full-stack MERN web application for discovering and enriching venture capital company data. Built with a focus on clean design, usability, and realistic workflows for investors.

## Features

- **Company Discovery** - Search and filter companies by industry, location, and funding stage
- **Company Profiles** - Detailed company information with enrichment data
- **Live Enrichment** - AI-powered extraction of company data from websites
- **Lists Management** - Create custom lists, add/remove companies, export to CSV/JSON
- **Notes** - Add personal notes to any company
- **Premium UI** - Modern SaaS-style interface with smooth interactions

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **API**: RESTful endpoints

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Installation

### 1. Clone the repository

```
bash
cd vc-scout-app
```

### 2. Backend Setup

```
bash
cd Backend
npm install
```

Create a `.env` file (or use the provided `.env`):

```
env
MONGO_URI=mongodb://localhost:27017/vcscout
# Optional: Add OpenAI key for AI enrichment
OPENAI_KEY=your_openai_key
```

Start MongoDB (if running locally):

```
bash
mongod
```

Seed the database with sample companies:

```
bash
npm run seed
```

Start the backend server:

```
bash
npm start
# or for development with hot reload
npm run dev
```

The backend will run on http://localhost:5000

### 3. Frontend Setup

Open a new terminal:

```
bash
cd Frontend/Vc-Scout
npm install
npm run dev
```

The frontend will run on http://localhost:5173

## Project Structure

```
vc-scout-app/
├── Backend/
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── models/
│   │   ├── Company.js      # Company schema
│   │   ├── Enrichment.js   # Enrichment cache schema
│   │   ├── List.js         # List schema
│   │   └── Note.js         # Note schema
│   ├── routes/
│   │   ├── companyRoutes.js
│   │   ├── enrichRoutes.js
│   │   ├── listRoutes.js
│   │   └── noteRoutes.js
│   ├── seed.js             # Database seeder
│   ├── server.js           # Express server
│   ├── .env                # Environment variables
│   └── package.json
├── Frontend/
│   └── Vc-Scout/
│       ├── src/
│       │   ├── components/
│       │   │   └── Sidebar.jsx
│       │   ├── pages/
│       │   │   ├── Companies.jsx
│       │   │   ├── CompanyProfile.jsx
│       │   │   └── Lists.jsx
│       │   ├── api.js
│       │   ├── App.jsx
│       │   ├── index.css
│       │   └── main.jsx
│       ├── index.html
│       ├── vite.config.js
│       └── package.json
├── README.md
└── package.json
```

## API Endpoints

### Companies
- `GET /api/companies` - List all companies (with filters)
- `GET /api/companies/:id` - Get single company
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Enrichment
- `GET /api/enrich/:companyId` - Get enrichment data
- `POST /api/enrich` - Create enrichment (scrape + extract)

### Lists
- `GET /api/lists` - Get all lists
- `GET /api/lists/:id` - Get list with companies
- `POST /api/lists` - Create list
- `DELETE /api/lists/:id` - Delete list
- `PUT /api/lists/:id/add` - Add company to list
- `PUT /api/lists/:id/remove` - Remove company from list

### Notes
- `GET /api/notes/:companyId` - Get notes for company
- `POST /api/notes` - Create note
- `DELETE /api/notes/:id` - Delete note

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| MONGO_URI | MongoDB connection string | Yes |
| OPENAI_KEY | OpenAI API key for AI enrichment | No |
| FIRECRAWL_KEY | Firecrawl API key for web scraping | No |

## Usage

1. **Browse Companies**: Navigate to the Companies page to see all companies
2. **Filter & Search**: Use the search bar and filters to find specific companies
3. **View Details**: Click on any company to see its profile
4. **Enrich Data**: Click "Enrich" to fetch and analyze company website data
5. **Save to Lists**: Add companies to custom lists for tracking
6. **Export**: Export lists as CSV or JSON for further analysis

## Deployment

### Backend (Render/Railway/Heroku)
1. Push code to GitHub
2. Connect repository to deployment platform
3. Set environment variables (MONGO_URI, optional API keys)
4. Deploy

### Frontend (Vercel/Netlify)
1. Build the frontend: `cd Frontend/Vc-Scout && npm run build`
2. Deploy the `dist` folder to any static hosting

## License

MIT
