import os
import sys
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import pandas as pd
from sqlalchemy import create_engine, text
import requests
from google.cloud.sql.connector import Connector, IPTypes
import pytds

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import the search functionality from our main API server
try:
    from backend.api_server import (
        generate_sql_query, 
        DB_STRUCTURE,
        PROMPT,
        transform_sql_results_to_properties,
        fetch_realty_properties
    )
except ImportError:
    # Fallback if direct import doesn't work
    try:
        # Try relative import
        sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
        from backend.api_server import (
            generate_sql_query, 
            DB_STRUCTURE,
            PROMPT,
            transform_sql_results_to_properties,
            fetch_realty_properties
        )
    except ImportError:
        # Create mock functions if import fails
        logging.warning("Could not import from backend.api_server, using mock functions")
        
        DB_STRUCTURE = """
        Tables:
        - Properties (property_id, unparsed_address, list_price, bedrooms, bathrooms, square_footage, property_type, year_built, description, latitude, longitude)
        - Amenities (amenity_id, property_id, amenity_type, title, address, distance_km)
        """
        
        PROMPT = """
        You are an expert in converting natural language questions to SQL queries and don't make mistakes in SQL queries.
        Given the database structure below, generate a SQL query for the user's question.
        - Always display the Properties using P.* (which includes unparsed_address)
        - Always ensure unparsed_address is included in the SELECT clause
        - For properties with a pool, check the 'description' field for the word 'pool'.
        - For amenities, only use the following key words values for 'amenity_type': Transit, Malls, Pharmacies, Hospitals, Schools, Restaurants, Groceries, ATMs, Parks.
        - Use DISTINCT to avoid duplicate rows.
        - Use LIKE for case-insensitive searches, not ILIKE.
        - Use <= for less than or equal to comparisons.
        - Use the correct spelling for locations (e.g., 'South Carolina').
        Only return the SQL query, nothing else.
        """
        
        def generate_sql_query(user_query, db_structure, prompt):
            return "SELECT * FROM Properties"
            
        def transform_sql_results_to_properties(sql_results, realty_properties=None):
            return sql_results
            
        def fetch_realty_properties():
            return []

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY_HERE')
genai.configure(api_key=GEMINI_API_KEY)

# Cloud SQL (SQL Server) configuration for Vercel
CLOUD_SQL_INSTANCE_CONNECTION_NAME = os.getenv('CLOUD_SQL_INSTANCE_CONNECTION_NAME')
CLOUD_SQL_DB_USER = os.getenv('CLOUD_SQL_DB_USER')
CLOUD_SQL_DB_PASSWORD = os.getenv('CLOUD_SQL_DB_PASSWORD')
CLOUD_SQL_DB_NAME = os.getenv('CLOUD_SQL_DB_NAME')
CLOUD_SQL_IP_TYPE = IPTypes.PRIVATE if os.getenv('CLOUD_SQL_PRIVATE_IP', 'false').lower() == 'true' else IPTypes.PUBLIC

# Initialize Cloud SQL connector for Vercel
connector = None
engine = None
database_connected = False

def initialize_database_connection():
    """Initialize database connection for Vercel environment"""
    global connector, engine, database_connected
    
    # Check if required environment variables are set
    missing_vars = []
    required_vars = ['CLOUD_SQL_INSTANCE_CONNECTION_NAME', 'CLOUD_SQL_DB_USER', 
                     'CLOUD_SQL_DB_PASSWORD', 'CLOUD_SQL_DB_NAME']
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    try:
        connector = Connector()
        
        def getconn():
            """
            Returns a raw DB-API connection to Cloud SQL for SQL Server
            using the Cloud SQL Python Connector with pytds.
            """
            return connector.connect(
                CLOUD_SQL_INSTANCE_CONNECTION_NAME,
                "pytds",
                user=CLOUD_SQL_DB_USER,
                password=CLOUD_SQL_DB_PASSWORD,
                db=CLOUD_SQL_DB_NAME,
                ip_type=CLOUD_SQL_IP_TYPE,
            )
        
        # Create engine with pytds through the Cloud SQL Connector
        engine = create_engine(
            "mssql+pytds://",
            creator=getconn,
        )
        # Test the connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database_connected = True
        logger.info("Successfully connected using Google Cloud SQL Connector with pytds")
    except Exception as e:
        logger.error(f"Failed to connect using Google Cloud SQL Connector with pytds: {e}")
        # If connection fails, raise an error
        raise RuntimeError(f"Database connection failed: {str(e)}")
    
    # Ensure connector closes when the app exits
    if database_connected:
        import atexit
        atexit.register(connector.close)

# Initialize database connection when module is loaded
try:
    initialize_database_connection()
except Exception as e:
    logger.error(f"Failed to initialize database: {str(e)}")

def execute_sql_query(sql_query):
    """Execute SQL query and return results as list of dictionaries"""
    if not database_connected or engine is None:
        raise Exception("Database connection not available. Please check your database configuration.")
    
    try:
        with engine.connect() as connection:
            result = connection.execute(text(sql_query))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df.to_dict('records')
    except Exception as e:
        raise Exception(f"Error executing SQL query: {str(e)}")

def handler(event, context):
    """Vercel serverless function handler for property search"""
    try:
        # Log the incoming event for debugging
        logger.info(f"Incoming event: {event}")
        
        # Handle CORS preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
                'body': ''
            }
        
        # Only allow POST requests
        if event.get('httpMethod') != 'POST':
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
        
        # Parse the request body
        try:
            body = json.loads(event.get('body', '{}'))
        except:
            body = {}
        
        if not body or 'query' not in body:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing query parameter'})
            }
        
        user_query = body['query'].strip()
        
        if not user_query:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Query cannot be empty'})
            }
        
        # Check if database is connected
        if not database_connected:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Database not connected. Please check your database configuration.'
                })
            }
        
        # Generate SQL query using Gemini
        try:
            sql_query = generate_sql_query(user_query, DB_STRUCTURE, PROMPT)
            logger.info(f"Generated SQL query: {sql_query}")
        except Exception as e:
            logger.error(f"Error generating SQL query: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': f'Error generating SQL query: {str(e)}'
                })
            }
        
        # Clean the SQL query (remove markdown code blocks if present)
        cleaned_sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
        
        # Execute SQL query to get results from database
        try:
            sql_results = execute_sql_query(cleaned_sql_query)
            logger.info(f"Executed SQL query successfully, got {len(sql_results)} results")
        except Exception as e:
            logger.error(f"Error executing SQL query: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': f'Error executing SQL query: {str(e)}'
                })
            }
        
        # Fetch RealtyFeed properties once for image matching
        try:
            realty_properties = fetch_realty_properties()
        except Exception as e:
            logger.warning(f"Error fetching RealtyFeed properties: {str(e)}")
            realty_properties = []
        
        # Transform results to property format
        try:
            transformed_properties = transform_sql_results_to_properties(sql_results, realty_properties)
        except Exception as e:
            logger.error(f"Error transforming SQL results: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': f'Error transforming results: {str(e)}'
                })
            }
        
        count = len(transformed_properties)
        
        message = ""
        lower_query = user_query.lower()
        if lower_query.startswith('show me '):
            rest_of_query = user_query[len('show me '):]
            message = f"Showing {count} {rest_of_query}"
        else:
            message = f"Showing {count} results for: {user_query}"
        
        response_body = {
            'success': True,
            'query': user_query,
            'sql': cleaned_sql_query,
            'results': transformed_properties,
            'count': count,
            'message': message
        }
        
        logger.info(f"Search completed successfully, returning {count} results")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response_body)
        }
        
    except Exception as e:
        logger.error(f"Error in search handler: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': f'Search failed: {str(e)}'
            })
        }
