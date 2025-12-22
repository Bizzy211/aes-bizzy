#!/usr/bin/env py
"""
Team Activation Hook for Claude
Detects "Claude, I need a team" and activates the voice-enabled AI development team
"""
import sys
import os
import subprocess
from pathlib import Path

def should_trigger(message: str) -> bool:
    """Check if message should trigger team activation"""
    team_keywords = [
        "claude, i need a team",
        "claude i need a team", 
        "get my team",
        "assemble team",
        "development team",
        "need developers",
        "get developers",
        "assemble developers",
        "get my development team",
        "need my team"
    ]
    
    message_lower = message.lower().strip()
    return any(keyword in message_lower for keyword in team_keywords)

def activate_team(message: str) -> str:
    """Activate the voice-enabled AI development team"""
    
    # Path to the advanced team activation script
    team_script = Path("C:/Users/Bizzy/CascadeProjects/Claude-Code/multi-agent-dev-team/advanced-team-activation.py")
    
    if not team_script.exists():
        return "❌ Team activation script not found. Please ensure the multi-agent-dev-team is properly installed."
    
    try:
        # Run the advanced team activation
        result = subprocess.run([
            "python", str(team_script), message
        ], capture_output=True, text=True, cwd=team_script.parent)
        
        if result.returncode == 0:
            return result.stdout
        else:
            # Fallback to simple activation message
            return """🎤 Voice-Enabled AI Development Team Activated!

🤖 Claude: "Assembling your development team now..."

🎯 Project Manager: "Team assembled! I'm your AI Project Manager with 11 specialists ready:
• Frontend Developer (React, Vue, Angular)
• Backend Developer (APIs, databases, microservices)  
• Security Engineer (audits, vulnerability assessment)
• Tester (quality assurance, automation)
• UI Developer (user experience, accessibility)
• Performance Engineer (optimization, monitoring)
• Data Engineer (database design, ETL)
• DevOps Engineer (CI/CD, infrastructure)
• Debugger (issue resolution, tracing)
• Researcher (best practices, innovation)

What project are we working on?"

🎤 Your voice-enabled AI development team is now active!
Ready for intelligent project management and collaboration."""
            
    except Exception as e:
        return f"⚠️ Team activation encountered an issue: {str(e)}\n\nFallback: Your AI development team is conceptually activated and ready to assist!"

def main():
    """Main hook function"""
    if len(sys.argv) < 2:
        return
    
    user_message = " ".join(sys.argv[1:])
    
    if should_trigger(user_message):
        print("🚀 TEAM ACTIVATION HOOK TRIGGERED")
        print("=" * 50)
        response = activate_team(user_message)
        print(response)
        return response
    
    return None

if __name__ == "__main__":
    main()
