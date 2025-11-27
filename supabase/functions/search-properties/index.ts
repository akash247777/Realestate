import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "jsr:@std/http@1.0.2";

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

async function getCloudSqlAccessToken(): Promise<string> {
  try {
    const gcpSaJson = Deno.env.get('GCP_SA_JSON');
    if (!gcpSaJson) {
      throw new Error('GCP_SA_JSON not configured');
    }

    const serviceAccount = JSON.parse(gcpSaJson);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600;

    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: expiresAt,
        iat: now,
      })
    );

    const jwt = `${header}.${payload}`;
    const encoder = new TextEncoder();
    const jwtData = encoder.encode(jwt);

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      Deno.base64Decode(serviceAccount.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\n/g, '')),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, jwtData);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const signedJwt = `${jwt}.${signatureB64}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt,
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting Cloud SQL access token:', error);
    throw error;
  }
}

async function executeCloudSqlQuery(sql: string): Promise<any[]> {
  try {
    const projectId = Deno.env.get('GCP_PROJECT_ID');
    const instanceName = Deno.env.get('CLOUD_SQL_INSTANCE_NAME');
    const database = Deno.env.get('CLOUD_SQL_DB_NAME');

    if (!projectId || !instanceName || !database) {
      throw new Error('Missing Cloud SQL configuration');
    }

    const accessToken = await getCloudSqlAccessToken();

    const response = await fetch(
      `https://sqladmin.googleapis.com/v1/projects/${projectId}/instances/${instanceName}/databases/${database}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Cloud SQL API error:', error);
      throw new Error(`Cloud SQL query failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result.rows || [];
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

serve(async (req: Request) => {
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

    console.log('Search query:', query);
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
