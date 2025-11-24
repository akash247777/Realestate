# Real Estate Natural Language Search - Setup Instructions

## Backend Setup

### 1. Install Python Dependencies

Navigate to the backend directory and install required packages:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

The `.env` file has been created with your database credentials. Make sure to update the `GEMINI_API_KEY`:

```
GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY
```

### 3. Start the Backend Server

```bash
python api_server.py
```

The server will start on `http://localhost:5000`

## Frontend Setup

The frontend has been integrated with the SearchBar component. To run it:

```bash
npm run dev
```

## Testing the Search

Once both servers are running, you can test natural language queries like:

- "Show me properties with a pool"
- "Find 3 bedroom houses under $500,000"
- "Properties with 4 bedrooms and 2 bathrooms"
- "Houses near schools in South Carolina"

## Architecture

```
Frontend (React) → Backend API (Flask) → Gemini API → SQL Server
                                           ↓
                                    Generated SQL Query
```

## Files Created

### Backend
- `backend/api_server.py` - Flask API server
- `backend/requirements.txt` - Python dependencies
- `backend/.env` - Environment configuration
- `backend/.env.example` - Template for environment variables

### Frontend
- `services/searchService.ts` - API communication service
- Updated `App.tsx` - Integrated SearchBar component
- Updated `types.ts` - Added search result types
- Updated `.gitignore` - Excluded sensitive files
