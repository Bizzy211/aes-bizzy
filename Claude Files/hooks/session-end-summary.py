#!/usr/bin/env python3
"""
Session End Summary Hook for Claude Desktop
This hook is called when a session ends to provide a summary.
"""

import sys
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('C:\\Users\\Bizzy\\AppData\\Roaming\\Claude\\.claude\\logs\\session-end-summary.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('session-end-summary')

def main():
    """Main function for session end summary hook."""
    try:
        logger.info("Session end summary hook triggered")
        
        # Read input if provided via stdin
        input_data = None
        if not sys.stdin.isatty():
            input_data = sys.stdin.read()
            if input_data:
                try:
                    input_data = json.loads(input_data)
                    logger.info(f"Received input data: {input_data}")
                except json.JSONDecodeError:
                    logger.warning("Failed to parse input as JSON")
        
        # Generate session summary
        summary = {
            "timestamp": datetime.now().isoformat(),
            "hook": "session-end-summary",
            "status": "completed",
            "message": "Session ended successfully"
        }
        
        # Output the summary
        print(json.dumps(summary, indent=2))
        
        logger.info("Session end summary hook completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error in session end summary hook: {str(e)}", exc_info=True)
        error_response = {
            "timestamp": datetime.now().isoformat(),
            "hook": "session-end-summary",
            "status": "error",
            "error": str(e)
        }
        print(json.dumps(error_response, indent=2))
        return 1

if __name__ == "__main__":
    sys.exit(main())
