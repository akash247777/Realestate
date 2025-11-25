import json
from datetime import datetime

def handler(event, context):
    """Health check endpoint for the API"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'status': 'healthy',
            'service': 'Real Estate Search API',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
    }