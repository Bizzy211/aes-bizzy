#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime

def main():
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)
        
        # Extract task information
        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})
        tool_response = input_data.get("tool_response", {})
        
        if tool_name != "Task":
            sys.exit(0)
        
        # Log task completion
        log_file = os.path.join(os.environ.get("CLAUDE_PROJECT_DIR", "."), ".claude", "task-log.json")
        
        task_entry = {
            "timestamp": datetime.now().isoformat(),
            "task": tool_input.get("task", ""),
            "agent": tool_input.get("agent", ""),
            "status": "completed" if tool_response.get("success") else "failed",
            "response": tool_response
        }