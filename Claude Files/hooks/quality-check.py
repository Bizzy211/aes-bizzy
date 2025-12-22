#!/usr/bin/env python3
import json
import sys
import re
import os

# Define quality rules
QUALITY_RULES = [
    # Security checks
    (r'(api_key|apikey|secret|password)\s*=\s*["\'][\w\d]+["\']', "Hardcoded secrets detected"),
    (r'eval\(|exec\(', "Dangerous function usage"),
    (r'innerHTML\s*=', "Potential XSS vulnerability"),
    (r'<script.*?src=.*?http:', "Insecure script loading"),
    
    # Code quality
    (r'console\.log\(', "Remove console.log statements"),
    (r'TODO:|FIXME:', "Unresolved TODO/FIXME comments"),
    (r'^\s*\/\/\s*\w+$', "Commented out code detected"),
    (r'debugger;', "Debugger statement found"),
    
    # Best practices
    (r'var\s+\w+\s*=', "Use const/let instead of var"),
    (r'==(?!=)', "Use === instead of =="),
    (r'!=(?!=)', "Use !== instead of !="),
]

def check_content(content, file_path):
    """Check content against quality rules"""
    issues = []
    
    # Skip checks for certain file types
    skip_extensions = ['.md', '.txt', '.json', '.yml', '.yaml', '.lock', '.svg', '.png', '.jpg']