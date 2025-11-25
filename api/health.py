import os
import json
import logging

def handler(event, context):
    """Vercel serverless function handler for health check"""
    try:
        # Log environment variables (without sensitive values) for debugging
        env_vars = {
            'CLOUD_SQL_INSTANCE_CONNECTION_NAME': os.getenv('CLOUD_SQL_INSTANCE_CONNECTION_NAME', 'NOT_SET'),
            'CLOUD_SQL_DB_USER': os.getenv('CLOUD_SQL_DB_USER', 'NOT_SET'),
            'CLOUD_SQL_DB_NAME': os.getenv('CLOUD_SQL_DB_NAME', 'NOT_SET'),
            'CLOUD_SQL_PRIVATE_IP': os.getenv('CLOUD_SQL_PRIVATE_IP', 'NOT_SET'),
            'GEMINI_API_KEY': 'SET' if os.getenv('GEMINI_API_KEY') else 'NOT_SET'
        }
        
        logging.info(f"Health check - Environment variables: {env_vars}")
        
        # Check if required environment variables are set
        missing_vars = []
        required_vars = ['CLOUD_SQL_INSTANCE_CONNECTION_NAME', 'CLOUD_SQL_DB_USER', 
                        'CLOUD_SQL_DB_PASSWORD', 'CLOUD_SQL_DB_NAME', 'GEMINI_API_KEY']
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'unhealthy',
                    'service': 'Real Estate Search API',
                    'error': f'Missing required environment variables: {", ".join(missing_vars)}',
                    'env_check': env_vars
                })
            }
        
        # If all environment variables are set, return healthy status
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'healthy',
                'service': 'Real Estate Search API',
                'env_check': env_vars
            })
        }
        
    except Exception as e:
        logging.error(f"Health check error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'unhealthy',
                'service': 'Real Estate Search API',
                'error': str(e),
                'env_check': env_vars
            })
        }
