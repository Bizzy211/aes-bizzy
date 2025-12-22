#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime

def get_project_status():
    """Get current project status from logs"""
    status = {
        "tasks_completed": 0,
        "tasks_pending": 0,
        "active_agents": [],
        "recent_activity": []
    }
    
    # Check task log
    task_log_path = os.path.join(
        os.environ.get("CLAUDE_PROJECT_DIR", "."),
        ".claude",
        "task-log.json"
    )
    
    if os.path.exists(task_log_path):
        try:
            with open(task_log_path, 'r') as f:
                tasks = json.load(f)
                for task in tasks:
                    if task.get("status") == "completed":
                        status["tasks_completed"] += 1
                    else:
                        status["tasks_pending"] += 1