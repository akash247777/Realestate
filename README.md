# Real Estate Search Application

A React-based real estate search application with natural language processing capabilities powered by Google Gemini AI.

## Features

- Natural language property search
- Property listing with images
- Map integration
- AI-powered search queries

## Deployment to Vercel

Follow these steps to deploy the application to Vercel:

### 1. Prerequisites

- A [Vercel account](https://vercel.com)
- A [Google Gemini API key](https://makersuite.google.com)
- Google Cloud SQL Server database with property data

### 2. Fork or Clone the Repository

Fork this repository to your GitHub account or clone it locally.

### 3. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your repository
4. Configure the project:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 4. Environment Variables

In your Vercel project settings, add the following environment variables:

- `GEMINI_API_KEY` - Your Google Gemini API key
- `CLOUD_SQL_INSTANCE_CONNECTION_NAME` - Your Google Cloud SQL instance connection name
- `CLOUD_SQL_DB_USER` - Database username
- `CLOUD_SQL_DB_PASSWORD` - Database password
- `CLOUD_SQL_DB_NAME` - Database name

### 5. Deploy

Click "Deploy" and wait for the build to complete.

## Local Development

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.9 or higher)
- npm
- Google Cloud SQL Server database

### Installation

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   CLOUD_SQL_INSTANCE_CONNECTION_NAME=your_instance_connection_name
   CLOUD_SQL_DB_USER=your_db_user
   CLOUD_SQL_DB_PASSWORD=your_db_password
   CLOUD_SQL_DB_NAME=your_db_name
   ```

### Running the Application

Start both frontend and backend:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

- `POST /api/search` - Search for properties using natural language
- `GET /api/health` - Health check endpoint

## Architecture

This application uses:
- React for the frontend
- Vite for build tooling
- Flask for the backend API
- Google Gemini AI for natural language processing
- Google Cloud SQL for data storage
- Vercel for hosting

## How It Works

1. User enters a natural language query (e.g., "Show me 3-bedroom houses with pools")
2. The query is sent to the backend API
3. Google Gemini AI converts the natural language query to SQL
4. The SQL query is executed against Google Cloud SQL database
5. Results are returned to the frontend and displayed