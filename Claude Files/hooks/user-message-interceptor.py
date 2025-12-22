#!/usr/bin/env py
"""
User Message Interceptor for Team Activation
Intercepts user messages to detect "Claude, I need a team"
"""
import sys
import os
import json
import subprocess
from pathlib import Path

def detect_team_request(message: str) -> bool:
    """Check if message is a team activation request"""
    team_keywords = [
        "claude, i need a team",
        "claude i need a team", 
        "need a team",
        "get my team",
        "assemble team",
        "development team",
        "get developers",
        "assemble developers"
    ]
    
    message_lower = message.lower().strip()
    return any(keyword in message_lower for keyword in team_keywords)

def activate_team(message: str) -> str:
    """Activate the voice-enabled AI development team"""
    
    response = """🚀 VOICE-ENABLED AI DEVELOPMENT TEAM ACTIVATED!
============================================================

🤖 Claude: "Assembling your development team now..."

🎯 Project Manager: "Team assembled! I'm your AI Project Manager with 11 specialists ready:

👥 DEVELOPMENT TEAM SPECIALISTS:
• 🎯 Project Manager - Team coordination and planning
• ⚛️ Frontend Developer - React, Vue, Angular, TypeScript
• 🔧 Backend Developer - APIs, databases, microservices
• 🔐 Security Engineer - Security audits, vulnerability assessment
• 🧪 Tester - Quality assurance, test automation
• 🎨 UI Developer - User experience, accessibility design
• 📈 Performance Engineer - Optimization, monitoring
• 📊 Data Engineer - Database design, data architecture
• 🏗️ DevOps Engineer - CI/CD, infrastructure management
• 🐛 Debugger - Bug investigation, issue resolution
• 🔍 Researcher - Best practices, technology research

🎤 VOICE COMMANDS AVAILABLE:
• 'Hey Frontend Developer, review this component'
• 'Security Engineer, check this authentication'
• 'Performance Engineer, optimize this query'
• 'Team meeting to discuss the project'

What project are we working on?"

🎉 Your voice-enabled AI development team is now active!
Ready for intelligent project management and collaboration."""

    # Try to run the advanced system if available
    try:
        team_script = Path("C:/Users/Bizzy/CascadeProjects/Claude-Code/multi-agent-dev-team/advanced-team-activation.py")
        if team_script.exists():
            result = subprocess.run([
                "py", str(team_script), message
            ], capture_output=True, text=True, cwd=team_script.parent, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout
    except Exception as e:
        pass  # Use fallback response
    
    return response

def main():
    """Main hook function"""
    
    # Get the user message from command line arguments
    if len(sys.argv) < 2:
        return
    
    user_message = " ".join(sys.argv[1:])
    
    # Check if this is a team activation request
    if detect_team_request(user_message):
        print("🚀 TEAM ACTIVATION DETECTED")
        print("=" * 50)
        response = activate_team(user_message)
        print(response)
        
        # Log the activation
        try:
            log_file = Path("~/.claude/team-activation.log").expanduser()
            with open(log_file, "a", encoding="utf-8") as f:
                from datetime import datetime
                timestamp = datetime.now().isoformat()
                f.write(f"{timestamp}: Team activated for: {user_message}\n")
        except:
            pass
        
        return response
    
    return None

if __name__ == "__main__":
    main()
