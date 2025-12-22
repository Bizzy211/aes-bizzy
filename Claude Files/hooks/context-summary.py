#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime

def extract_key_decisions(transcript_path):
    """Extract key decisions from the transcript"""
    decisions = []
    try:
        with open(transcript_path, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    # Look for decision patterns in the content
                    if entry.get('type') == 'message' and entry.get('role') == 'assistant':
                        content = entry.get('content', '').lower()
                        if any(keyword in content for keyword in ['decided', 'chose', 'selected', 'will use', 'going with']):
                            # Extract a summary of the decision
                            decisions.append({
                                'timestamp': entry.get('timestamp', ''),
                                'summary': content[:200] + '...' if len(content) > 200 else content
                            })
                except json.JSONDecodeError:
                    continue
    except FileNotFoundError:
        pass
    
    return decisions

def main():