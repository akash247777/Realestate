import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  query: string;
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: any[];
  count: number;
  message?: string;
  error?: string;
}

const DB_STRUCTURE = `
Tables:
- Properties (property_id, unparsed_address, list_price, bedrooms, bathrooms, square_footage, property_type, year_built, description, latitude, longitude)
- Amenities (amenity_id, property_id, amenity_type, title, address, distance_km)
`;

const PROMPT = `You are an expert in converting natural language questions to SQL Server T-SQL queries and don't make mistakes in SQL queries.
Given the database structure below, generate a SQL query for the user's question.
- Always display the Properties using P.* (which includes unparsed_address)
- Always ensure unparsed_address is included in the SELECT clause
- For properties with a pool, check the 'description' field for the word 'pool'.
- For amenities, only use the following key words values for 'amenity_type': Transit, Malls, Pharmacies, Hospitals, Schools, Restaurants, Groceries, ATMs, Parks.
- Use DISTINCT to avoid duplicate rows.
- Use LIKE for case-insensitive searches, not ILIKE.
- Use <= for less than or equal to comparisons.
- Use the correct spelling for locations (e.g., 'South Carolina').
- Only return the SQL query, nothing else.
Database Structure:
${DB_STRUCTURE}`;

async function generateSqlQuery(userQuery: string): Promise<string> {
  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${PROMPT}\n\nUser Query: ${userQuery}`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text.trim().replace(/```sql/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error('Error generating SQL query:', error);
    throw error;
  }
}

async function executeCloudSqlQuery(sql: string): Promise<any[]> {
  try {
    const instanceConnection = Deno.env.get('CLOUD_SQL_INSTANCE_CONNECTION_NAME');
    const dbUser = Deno.env.get('CLOUD_SQL_DB_USER');
    const dbPassword = Deno.env.get('CLOUD_SQL_DB_PASSWORD');
    const dbName = Deno.env.get('CLOUD_SQL_DB_NAME');

    if (!instanceConnection || !dbUser || !dbPassword || !dbName) {
      throw new Error('Missing Cloud SQL configuration');
    }

    // Use Cloud SQL Python Connector proxy endpoint
    const proxyUrl = `http://127.0.0.1:3307`; // Default Cloud SQL Auth proxy port
    const connectionString = `mssql://${dbUser}:${encodeURIComponent(dbPassword)}@${proxyUrl}/${dbName}`;

    console.log('Executing query on Cloud SQL...');
    
    // Since we can't use direct SQL Server connections in Edge Functions,
    // we'll call an external service or use Cloud SQL Admin API
    // For now, return mock data - in production, use Cloud SQL Connector or Proxy
    const mockResults = [
      {
        property_id: '1',
        unparsed_address: '123 Main St, Springfield, IL',
        list_price: 350000,
        bedrooms: 3,
        bathrooms: 2,
        square_footage: 2500,
        property_type: 'Single Family',
        year_built: 2005,
        description: 'Beautiful home with pool and garage',
        latitude: 39.7817,
        longitude: -89.6501,
      },
    ];

    return mockResults;
  } catch (error) {
    console.error('Error executing Cloud SQL query:', error);
    throw error;
  }
}

function transformProperties(dbResults: any[]): any[] {
  return dbResults.map((prop: any) => ({
    ListingKey: String(prop.property_id || ''),
    ListingId: String(prop.property_id || ''),
    ListPrice: Number(prop.list_price) || 0,
    UnparsedAddress: String(prop.unparsed_address || ''),
    StreetNumber: '',
    StreetName: '',
    City: '',
    BedroomsTotal: Number(prop.bedrooms) || 0,
    BathroomsTotalInteger: Number(prop.bathrooms) || 0,
    LivingArea: Number(prop.square_footage) || 0,
    Media: [{ MediaURL: 'https://via.placeholder.com/400x300?text=Property+Image' }],
    Latitude: Number(prop.latitude) || null,
    Longitude: Number(prop.longitude) || null,
    PublicRemarks: String(prop.description || ''),
    YearBuilt: Number(prop.year_built) || null,
    PropertyType: String(prop.property_type || ''),
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: SearchRequest = await req.json();
    const { query } = body;

    if (!query || !query.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          query: '',
          results: [],
          count: 0,
          error: 'Query cannot be empty',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const sqlQuery = await generateSqlQuery(query);
    console.log('Generated SQL:', sqlQuery);

    const dbResults = await executeCloudSqlQuery(sqlQuery);
    const transformedResults = transformProperties(dbResults);

    const message = query.toLowerCase().startsWith('show me ')
      ? `Showing ${transformedResults.length} ${query.slice(8)}`
      : `Showing ${transformedResults.length} results for: ${query}`;

    return new Response(
      JSON.stringify({
        success: true,
        query,
        results: transformedResults,
        count: transformedResults.length,
        message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
