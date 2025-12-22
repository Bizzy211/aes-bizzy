#!/usr/bin/env python3
"""
Performance Engineer Agent - Multi-Agent Development Team
Specializes in Performance optimization, resource usage, bottleneck identification, scalability.
"""
import sys
import os
from pathlib import Path

# Add the src directory to the path so we can import our base agent
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from agents.base_agent import BaseAgent
from communication.agent_communication import AgentMessageProcessor
from typing import Dict, List, Any
import re

class PerformanceengineerAgent(BaseAgent):
    """
    Performance Engineer Agent - The Performance optimization specialist.
    
    Responsibilities:
    - Performance optimization, resource usage, bottleneck identification, scalability
    - Coordinate with relevant team members
    - Provide specialized expertise and recommendations
    """
    
    def __init__(self):
        super().__init__(
            agent_name="performance-engineer",
            agent_type="specialist",
            specialization="Performance optimization, resource usage, bottleneck identification, scalability"
        )
        
        # Performance Engineer specific state
        self.state.setdefault("reviews", [])
        self.state.setdefault("recommendations", [])
        self.state.setdefault("metrics", {})
        
        # Initialize message processor
        self.message_processor = AgentMessageProcessor("performance-engineer")
    
    def get_agent_personality(self) -> Dict[str, str]:
        """Performance Engineer personality traits"""
        return {
            "voice_type": "optimization_focused_technical",
            "communication_style": "technical_expert",
            "speaking_pace": "measured",
            "personality_traits": ['performance-focused', 'analytical', 'optimization-minded', 'metrics-driven', 'efficiency-oriented'],
            "catchphrases": ["Let's optimize this", "What's the bottleneck?", 'Check the metrics', 'Performance matters']
        }
    
    def process_hook_input(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Process hook input and provide performance engineer expertise"""
        
        # Process any pending messages from other agents first
        self.process_team_messages()
        
        # Handle file operations
        if tool_name in ["Write", "Edit", "MultiEdit"]:
            return self.handle_file_operations(tool_name, tool_input)
        
        # Handle bash commands
        elif tool_name == "Bash":
            return self.handle_bash_commands(tool_input)
        
        # General guidance
        else:
            return self.handle_general_guidance(tool_name, tool_input)
    
    def process_team_messages(self):
        """Process messages from other team members"""
        processed_messages = self.message_processor.process_pending_messages()
        
        for msg_data in processed_messages:
            message = msg_data["original_message"]
            
            # Handle specific message types
            if message["type"] == "file_change_notification":
                self.handle_file_change_from_team(message["data"])
            elif message["type"] == "review_request":
                self.handle_review_request(message["data"])
    
    def handle_file_operations(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file write/edit operations"""
        
        file_path = tool_input.get("file_path", "") or tool_input.get("path", "")
        content = tool_input.get("content", "") or tool_input.get("new_string", "")
        
        if not file_path:
            return {"message": "", "block": False}
        
        # Check if this is relevant to our specialization
        if not self.is_relevant_file(file_path):
            return {"message": "", "block": False}
        
        # Analyze the code/content
        issues = self.analyze_content(file_path, content, tool_name)
        
        if issues:
            # Categorize issues by severity
            critical_issues = [i for i in issues if i["severity"] == "critical"]
            warnings = [i for i in issues if i["severity"] == "warning"]
            suggestions = [i for i in issues if i["severity"] == "suggestion"]
            
            message_parts = [f"📈 Performance Engineer: Reviewing {Path(file_path).name}"]
            
            # Handle critical issues (block operation)
            if critical_issues:
                message_parts.append("🚨 Critical Issues Found:")
                for issue in critical_issues[:3]:
                    message_parts.append(f"   • {issue['message']}")
                
                # Notify project manager about critical issues
                self.send_message(
                    "project-manager",
                    "critical_issue_found",
                    {
                        "file_path": file_path,
                        "issues": critical_issues,
                        "agent": "performance-engineer"
                    },
                    priority="high"
                )
                
                return {
                    "message": "\n".join(message_parts),
                    "block": True
                }
            
            # Handle warnings and suggestions
            if warnings:
                message_parts.append("⚠️ Warnings:")
                for warning in warnings[:2]:
                    message_parts.append(f"   • {warning['message']}")
            
            if suggestions:
                message_parts.append("💡 Suggestions:")
                for suggestion in suggestions[:2]:
                    message_parts.append(f"   • {suggestion['message']}")
            
            return {
                "message": "\n".join(message_parts),
                "block": False
            }
        
        # No issues found - provide positive feedback
        return {
            "message": f"📈 Performance Engineer: {Path(file_path).name} looks good from performance engineer perspective!",
            "block": False
        }
    
    def handle_bash_commands(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle bash commands relevant to performance engineer"""
        
        command = tool_input.get("command", "")
        
        # Add command-specific logic here based on agent specialization
        suggestions = self.get_command_suggestions(command)
        
        if suggestions:
            message_parts = [f"📈 Performance Engineer: Command analysis"]
            message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_general_guidance(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Provide general performance engineer guidance"""
        return {"message": "", "block": False}
    
    def is_relevant_file(self, file_path: str) -> bool:
        """Check if file is relevant to performance engineer specialization"""
        file_path_lower = file_path.lower()
        
        # Check extensions
        relevant_extensions = ['.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go']
        if any(file_path_lower.endswith(ext) for ext in relevant_extensions):
            return True
        
        # Check directories
        relevant_dirs = ['src/', 'lib/', 'api/']
        if any(dir_name in file_path_lower for dir_name in relevant_dirs):
            return True
        
        return False
    
    def analyze_content(self, file_path: str, content: str, tool_name: str) -> List[Dict[str, Any]]:
        """Analyze content for performance engineer specific issues"""
        
        issues = []
        
        if not content:
            return issues
        
        # Add specific analysis logic based on agent specialization
        # This is a template - each agent would have specialized analysis
        
        return issues
    
    def get_command_suggestions(self, command: str) -> List[str]:
        """Get command suggestions specific to performance engineer"""
        
        suggestions = []
        
        # Add command-specific suggestions based on agent specialization
        # This is a template - each agent would have specialized suggestions
        
        return suggestions
    
    def handle_file_change_from_team(self, data: Dict[str, Any]):
        """Handle file change notification from project manager"""
        file_path = data.get("file_path", "")
        
        if self.is_relevant_file(file_path):
            # Send acknowledgment back to project manager
            self.send_message(
                "project-manager",
                "performance_engineer_review_complete",
                {
                    "file_path": file_path,
                    "status": "reviewed",
                    "agent": "performance-engineer"
                }
            )
    
    def handle_review_request(self, data: Dict[str, Any]):
        """Handle review request from other agents"""
        file_path = data.get("file_path", "")
        review_type = data.get("review_type", "general")
        
        # Provide specialized review
        recommendations = self.generate_recommendations(file_path, review_type)
        
        self.send_message(
            data.get("from", "project-manager"),
            "review_response",
            {
                "file_path": file_path,
                "review_type": review_type,
                "recommendations": recommendations,
                "agent": "performance-engineer"
            }
        )
    
    def generate_recommendations(self, file_path: str, review_type: str) -> List[str]:
        """Generate recommendations specific to performance engineer"""
        
        recommendations = []
        
        # Add specialized recommendations based on agent type
        # This is a template - each agent would have specialized recommendations
        
        return recommendations

def main():
    """Main entry point"""
    agent = PerformanceengineerAgent()
    agent.main()

if __name__ == "__main__":
    main()
