#!/usr/bin/env python3
"""
Project Manager Agent - Multi-Agent Development Team
Coordinates team activities, tracks progress, manages priorities, and facilitates communication.
"""
import sys
import os
from pathlib import Path

# Add the src directory to the path so we can import our base agent
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from agents.base_agent import BaseAgent
from typing import Dict, List, Any

class ProjectManagerAgent(BaseAgent):
    """
    Project Manager Agent - The team coordinator and facilitator.
    
    Responsibilities:
    - Coordinate team activities and communication
    - Track project progress and milestones
    - Manage task priorities and assignments
    - Facilitate team meetings and decisions
    - Monitor project health and blockers
    """
    
    def __init__(self):
        super().__init__(
            agent_name="project-manager",
            agent_type="coordinator",
            specialization="Project coordination, team management, progress tracking"
        )
        
        # Project Manager specific state
        self.state.setdefault("active_projects", [])
        self.state.setdefault("team_meetings", [])
        self.state.setdefault("project_milestones", [])
        self.state.setdefault("team_performance", {})
    
    def get_agent_personality(self) -> Dict[str, str]:
        """Project Manager personality traits"""
        return {
            "voice_type": "professional_male",
            "communication_style": "authoritative_but_supportive",
            "speaking_pace": "measured",
            "personality_traits": [
                "organized", "decisive", "collaborative", 
                "results-oriented", "diplomatic"
            ],
            "catchphrases": [
                "Let's align on priorities",
                "What are the blockers?",
                "How can we move this forward?",
                "Let's schedule a quick sync"
            ]
        }
    
    def process_hook_input(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Process hook input and coordinate team response"""
        
        # Session start - initialize project coordination
        if tool_name == "session_start":
            return self.handle_session_start(tool_input)
        
        # Major file changes - assess impact and coordinate team
        elif "file" in tool_name.lower() or tool_name in ["Write", "Edit", "MultiEdit"]:
            return self.handle_file_changes(tool_name, tool_input)
        
        # Git operations - coordinate with relevant team members
        elif tool_name == "Bash" and tool_input.get("command", "").startswith("git"):
            return self.handle_git_operations(tool_input)
        
        # General coordination
        else:
            return self.handle_general_coordination(tool_name, tool_input)
    
    def handle_session_start(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle session start - set up project coordination"""
        
        # Load current project context
        shared_state = self.load_shared_state()
        
        # Determine project type and setup
        project_info = self.analyze_project_context()
        
        # Update shared state with project info
        self.update_shared_state({
            "project_name": project_info.get("name", "Unknown Project"),
            "project_type": project_info.get("type", "General Development"),
            "active_agents": ["project-manager"],
            "session_start": self.state["last_active"]
        })
        
        # Broadcast session start to team
        self.broadcast_to_team(
            "session_started",
            {
                "project_info": project_info,
                "coordinator": "project-manager",
                "session_id": f"session_{self.state['last_active']}"
            }
        )
        
        # Determine which agents should be active for this project
        recommended_agents = self.recommend_active_agents(project_info)
        
        message = f"🎯 Project Manager: Session started for {project_info.get('name', 'project')}"
        if recommended_agents:
            message += f"\n   📋 Recommended team: {', '.join(recommended_agents)}"
        
        return {
            "message": message,
            "block": False
        }
    
    def handle_file_changes(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file changes - coordinate with relevant specialists"""
        
        file_path = tool_input.get("file_path", "") or tool_input.get("path", "")
        
        if not file_path:
            return {"message": "", "block": False}
        
        # Determine which agents should be involved
        relevant_agents = self.determine_relevant_agents(file_path)
        
        # Notify relevant agents about the change
        for agent in relevant_agents:
            self.send_message(
                agent,
                "file_change_notification",
                {
                    "file_path": file_path,
                    "tool_name": tool_name,
                    "tool_input": tool_input,
                    "coordinator": "project-manager"
                },
                priority="normal"
            )
        
        # Check if this is a significant change that needs team coordination
        if self.is_significant_change(file_path, tool_name):
            # Call a quick team sync
            meeting = self.call_meeting(
                relevant_agents,
                f"File change coordination: {Path(file_path).name}",
                urgency="normal"
            )
            
            return {
                "message": f"🎯 Project Manager: Coordinating {Path(file_path).name} changes with {', '.join(relevant_agents)}",
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_git_operations(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle git operations - ensure team coordination"""
        
        command = tool_input.get("command", "")
        
        # Major git operations that need team coordination
        if any(op in command for op in ["merge", "rebase", "reset --hard", "push origin"]):
            
            # Notify all active agents
            self.broadcast_to_team(
                "git_operation_alert",
                {
                    "command": command,
                    "coordinator": "project-manager",
                    "requires_attention": True
                },
                priority="high"
            )
            
            return {
                "message": f"🎯 Project Manager: Major git operation detected - notifying team about: {command}",
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_general_coordination(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle general coordination tasks"""
        
        # Log the activity for project tracking
        self.log_project_activity(tool_name, tool_input)
        
        return {"message": "", "block": False}
    
    def analyze_project_context(self) -> Dict[str, Any]:
        """Analyze current directory to understand project context"""
        
        cwd = Path.cwd()
        project_info = {
            "name": cwd.name,
            "path": str(cwd),
            "type": "General Development"
        }
        
        # Check for common project indicators
        if (cwd / "package.json").exists():
            project_info["type"] = "Node.js/JavaScript Project"
        elif (cwd / "requirements.txt").exists() or (cwd / "pyproject.toml").exists():
            project_info["type"] = "Python Project"
        elif (cwd / "Cargo.toml").exists():
            project_info["type"] = "Rust Project"
        elif (cwd / "go.mod").exists():
            project_info["type"] = "Go Project"
        elif (cwd / "pom.xml").exists():
            project_info["type"] = "Java Project"
        elif (cwd / ".csproj").exists():
            project_info["type"] = "C# Project"
        
        # Check for web development indicators
        if any((cwd / f).exists() for f in ["index.html", "src/App.js", "src/App.tsx"]):
            project_info["type"] += " (Web Application)"
        
        return project_info
    
    def recommend_active_agents(self, project_info: Dict[str, Any]) -> List[str]:
        """Recommend which agents should be active for this project"""
        
        recommended = ["project-manager"]  # PM is always active
        project_type = project_info.get("type", "").lower()
        
        # Always useful agents
        recommended.extend(["tester", "debugger"])
        
        # Project-type specific recommendations
        if "web" in project_type or "javascript" in project_type or "node" in project_type:
            recommended.extend(["frontend-developer", "ui-developer"])
        
        if "api" in project_type or "backend" in project_type or "python" in project_type:
            recommended.append("backend-developer")
        
        if "docker" in str(Path.cwd()).lower() or (Path.cwd() / "Dockerfile").exists():
            recommended.append("devops-engineer")
        
        # Security is always important
        recommended.append("security-engineer")
        
        return list(set(recommended))  # Remove duplicates
    
    def determine_relevant_agents(self, file_path: str) -> List[str]:
        """Determine which agents are relevant for a specific file"""
        
        file_path = file_path.lower()
        relevant = []
        
        # Frontend files
        if any(ext in file_path for ext in [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"]):
            relevant.append("frontend-developer")
        
        # UI/Styling files
        if any(ext in file_path for ext in [".css", ".scss", ".sass", ".less", ".styled"]):
            relevant.append("ui-developer")
        
        # Backend files
        if any(ext in file_path for ext in [".py", ".java", ".go", ".rs", ".cs"]) or "api" in file_path:
            relevant.append("backend-developer")
        
        # Test files
        if any(pattern in file_path for pattern in ["test", "spec", "__tests__"]):
            relevant.append("tester")
        
        # Config/deployment files
        if any(file in file_path for file in ["dockerfile", "docker-compose", ".yml", ".yaml", "deploy"]):
            relevant.append("devops-engineer")
        
        # Database files
        if any(pattern in file_path for pattern in ["migration", "schema", ".sql", "database"]):
            relevant.append("data-engineer")
        
        # Security-related files
        if any(pattern in file_path for pattern in ["auth", "security", "permission", ".env"]):
            relevant.append("security-engineer")
        
        return relevant
    
    def is_significant_change(self, file_path: str, tool_name: str) -> bool:
        """Determine if a file change is significant enough to require coordination"""
        
        # Major files that always require coordination
        significant_files = [
            "package.json", "requirements.txt", "dockerfile", "docker-compose",
            "config", "settings", "env", "schema", "migration"
        ]
        
        file_path_lower = file_path.lower()
        
        # Check if it's a significant file
        if any(sig_file in file_path_lower for sig_file in significant_files):
            return True
        
        # New file creation in important directories
        if tool_name == "Write" and any(dir in file_path_lower for dir in ["src/", "lib/", "api/", "components/"]):
            return True
        
        return False
    
    def log_project_activity(self, tool_name: str, tool_input: Dict[str, Any]):
        """Log project activity for tracking and reporting"""
        
        activity = {
            "timestamp": self.state["last_active"],
            "tool_name": tool_name,
            "activity_type": "development",
            "coordinator": "project-manager"
        }
        
        # Add to project activities
        if "project_activities" not in self.state:
            self.state["project_activities"] = []
        
        self.state["project_activities"].append(activity)
        
        # Keep only last 100 activities
        if len(self.state["project_activities"]) > 100:
            self.state["project_activities"] = self.state["project_activities"][-100:]

def main():
    """Main entry point"""
    agent = ProjectManagerAgent()
    agent.main()

if __name__ == "__main__":
    main()
