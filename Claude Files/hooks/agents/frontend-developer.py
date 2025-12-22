#!/usr/bin/env python3
"""
Frontend Developer Agent - Multi-Agent Development Team
Specializes in React/Vue/JS development, component architecture, and frontend best practices.
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

class FrontendDeveloperAgent(BaseAgent):
    """
    Frontend Developer Agent - The frontend specialist.
    
    Responsibilities:
    - Review React/Vue/JS code for best practices
    - Suggest component architecture improvements
    - Validate frontend performance patterns
    - Ensure accessibility and responsive design
    - Coordinate with UI Developer and Backend Developer
    """
    
    def __init__(self):
        super().__init__(
            agent_name="frontend-developer",
            agent_type="developer",
            specialization="React/Vue/JS development, component architecture, frontend performance"
        )
        
        # Frontend Developer specific state
        self.state.setdefault("component_patterns", {})
        self.state.setdefault("performance_metrics", {})
        self.state.setdefault("code_reviews", [])
        self.state.setdefault("architecture_suggestions", [])
        
        # Initialize message processor
        self.message_processor = AgentMessageProcessor("frontend-developer")
    
    def get_agent_personality(self) -> Dict[str, str]:
        """Frontend Developer personality traits"""
        return {
            "voice_type": "energetic_young_male",
            "communication_style": "technical_enthusiastic",
            "speaking_pace": "quick",
            "personality_traits": [
                "innovative", "detail-oriented", "performance-focused", 
                "user-centric", "collaborative"
            ],
            "catchphrases": [
                "Let's optimize this component",
                "Have we considered the user experience?",
                "This could be more performant",
                "What about mobile responsiveness?"
            ]
        }
    
    def process_hook_input(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Process hook input and provide frontend expertise"""
        
        # Process any pending messages from other agents first
        self.process_team_messages()
        
        # Handle file operations
        if tool_name in ["Write", "Edit", "MultiEdit"]:
            return self.handle_file_operations(tool_name, tool_input)
        
        # Handle bash commands (npm, yarn, build tools)
        elif tool_name == "Bash":
            return self.handle_bash_commands(tool_input)
        
        # General frontend guidance
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
            elif message["type"] == "task_assignment":
                self.handle_task_from_team(message["data"])
            elif message["type"] == "meeting_invitation":
                self.handle_meeting_invitation_from_team(message["data"])
    
    def handle_file_operations(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file write/edit operations"""
        
        file_path = tool_input.get("file_path", "") or tool_input.get("path", "")
        content = tool_input.get("content", "") or tool_input.get("new_string", "")
        
        if not file_path:
            return {"message": "", "block": False}
        
        # Check if this is a frontend file
        if not self.is_frontend_file(file_path):
            return {"message": "", "block": False}
        
        # Analyze the frontend code
        issues = self.analyze_frontend_code(file_path, content, tool_name)
        
        if issues:
            # Categorize issues by severity
            critical_issues = [i for i in issues if i["severity"] == "critical"]
            warnings = [i for i in issues if i["severity"] == "warning"]
            suggestions = [i for i in issues if i["severity"] == "suggestion"]
            
            message_parts = [f"⚛️ Frontend Developer: Reviewing {Path(file_path).name}"]
            
            # Handle critical issues (block operation)
            if critical_issues:
                message_parts.append("🚨 Critical Issues Found:")
                for issue in critical_issues[:3]:  # Show max 3 critical issues
                    message_parts.append(f"   • {issue['message']}")
                
                # Notify project manager about critical issues
                self.send_message(
                    "project-manager",
                    "critical_issue_found",
                    {
                        "file_path": file_path,
                        "issues": critical_issues,
                        "agent": "frontend-developer"
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
            
            # Coordinate with UI Developer for styling issues
            if any("style" in issue["type"] for issue in issues):
                self.send_message(
                    "ui-developer",
                    "styling_coordination",
                    {
                        "file_path": file_path,
                        "styling_issues": [i for i in issues if "style" in i["type"]]
                    }
                )
            
            return {
                "message": "\n".join(message_parts),
                "block": False
            }
        
        # No issues found - provide positive feedback
        return {
            "message": f"⚛️ Frontend Developer: {Path(file_path).name} looks good! Clean frontend code.",
            "block": False
        }
    
    def handle_bash_commands(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle bash commands related to frontend development"""
        
        command = tool_input.get("command", "")
        
        # Frontend build/dev commands
        if any(cmd in command for cmd in ["npm", "yarn", "pnpm", "webpack", "vite", "parcel"]):
            return self.handle_frontend_commands(command)
        
        return {"message": "", "block": False}
    
    def handle_frontend_commands(self, command: str) -> Dict[str, Any]:
        """Handle frontend-specific commands"""
        
        suggestions = []
        warnings = []
        
        # Package installation suggestions
        if "install" in command or "add" in command:
            suggestions.extend(self.get_package_suggestions(command))
        
        # Build optimization suggestions
        if "build" in command:
            suggestions.extend(self.get_build_suggestions())
        
        # Development server suggestions
        if any(cmd in command for cmd in ["dev", "start", "serve"]):
            suggestions.extend(self.get_dev_server_suggestions())
        
        if suggestions or warnings:
            message_parts = ["⚛️ Frontend Developer: Command analysis"]
            
            if warnings:
                message_parts.extend([f"⚠️ {w}" for w in warnings])
            
            if suggestions:
                message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_general_guidance(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Provide general frontend guidance"""
        return {"message": "", "block": False}
    
    def is_frontend_file(self, file_path: str) -> bool:
        """Check if file is a frontend file"""
        frontend_extensions = [
            ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte",
            ".mjs", ".cjs", ".es6", ".es"
        ]
        
        file_path_lower = file_path.lower()
        
        # Check extension
        if any(file_path_lower.endswith(ext) for ext in frontend_extensions):
            return True
        
        # Check if it's in frontend directories
        frontend_dirs = ["src/", "components/", "pages/", "views/", "hooks/", "utils/", "lib/"]
        if any(dir in file_path_lower for dir in frontend_dirs):
            return True
        
        return False
    
    def analyze_frontend_code(self, file_path: str, content: str, tool_name: str) -> List[Dict[str, Any]]:
        """Analyze frontend code for issues and improvements"""
        
        issues = []
        
        if not content:
            return issues
        
        # React/JSX specific checks
        if file_path.endswith(('.jsx', '.tsx')) or 'react' in content.lower():
            issues.extend(self.analyze_react_code(content, file_path))
        
        # Vue specific checks
        if file_path.endswith('.vue') or 'vue' in content.lower():
            issues.extend(self.analyze_vue_code(content, file_path))
        
        # General JavaScript checks
        issues.extend(self.analyze_javascript_code(content, file_path))
        
        # Performance checks
        issues.extend(self.analyze_performance_patterns(content, file_path))
        
        # Accessibility checks
        issues.extend(self.analyze_accessibility(content, file_path))
        
        return issues
    
    def analyze_react_code(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze React-specific code patterns"""
        issues = []
        
        # Check for missing React import (React 17+ doesn't need it, but good to check)
        if 'jsx' in content.lower() and 'import react' not in content.lower():
            if not any(pattern in content for pattern in ['/** @jsx', '/* @jsx']):
                issues.append({
                    "type": "react_import",
                    "severity": "warning",
                    "message": "Consider explicit React import for clarity"
                })
        
        # Check for inline styles (should use CSS modules or styled-components)
        if re.search(r'style\s*=\s*\{\{', content):
            issues.append({
                "type": "inline_styles",
                "severity": "warning",
                "message": "Consider using CSS modules or styled-components instead of inline styles"
            })
        
        # Check for missing key prop in lists
        if re.search(r'\.map\s*\([^)]*\)\s*=>\s*<', content) and 'key=' not in content:
            issues.append({
                "type": "missing_key",
                "severity": "critical",
                "message": "Missing 'key' prop in list items - this will cause React warnings"
            })
        
        # Check for useState without proper naming
        useState_matches = re.findall(r'useState\s*\([^)]*\)', content)
        for match in useState_matches:
            if not re.search(r'\[.*,\s*set[A-Z]', content):
                issues.append({
                    "type": "useState_naming",
                    "severity": "suggestion",
                    "message": "Consider using conventional useState naming: [value, setValue]"
                })
                break
        
        # Check for useEffect without dependency array
        if 'useEffect' in content and not re.search(r'useEffect\s*\([^,]+,\s*\[', content):
            issues.append({
                "type": "useEffect_deps",
                "severity": "warning",
                "message": "useEffect should include dependency array to prevent infinite re-renders"
            })
        
        return issues
    
    def analyze_vue_code(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze Vue-specific code patterns"""
        issues = []
        
        # Check for missing key in v-for
        if 'v-for' in content and ':key' not in content and 'key=' not in content:
            issues.append({
                "type": "vue_missing_key",
                "severity": "critical",
                "message": "Missing ':key' attribute in v-for directive"
            })
        
        # Check for direct DOM manipulation (should use refs)
        if any(pattern in content for pattern in ['document.getElementById', 'document.querySelector', 'document.getElementsBy']):
            issues.append({
                "type": "vue_dom_manipulation",
                "severity": "warning",
                "message": "Avoid direct DOM manipulation in Vue - use refs instead"
            })
        
        return issues
    
    def analyze_javascript_code(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze general JavaScript code patterns"""
        issues = []
        
        # Check for console.log statements (should be removed in production)
        console_logs = len(re.findall(r'console\.log\s*\(', content))
        if console_logs > 0:
            issues.append({
                "type": "console_logs",
                "severity": "warning",
                "message": f"Found {console_logs} console.log statement(s) - remove before production"
            })
        
        # Check for var usage (should use let/const)
        if re.search(r'\bvar\s+', content):
            issues.append({
                "type": "var_usage",
                "severity": "suggestion",
                "message": "Consider using 'let' or 'const' instead of 'var'"
            })
        
        # Check for == instead of === (loose equality)
        loose_equality = len(re.findall(r'[^=!]==[^=]', content))
        if loose_equality > 0:
            issues.append({
                "type": "loose_equality",
                "severity": "suggestion",
                "message": f"Found {loose_equality} loose equality operator(s) - consider using '===' for strict comparison"
            })
        
        # Check for missing error handling in async functions
        if 'async' in content and 'await' in content and 'try' not in content:
            issues.append({
                "type": "missing_error_handling",
                "severity": "warning",
                "message": "Async functions should include error handling with try/catch"
            })
        
        return issues
    
    def analyze_performance_patterns(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze performance-related patterns"""
        issues = []
        
        # Check for large bundle imports
        if re.search(r'import\s+\*\s+as\s+\w+\s+from\s+[\'"]lodash[\'"]', content):
            issues.append({
                "type": "large_import",
                "severity": "warning",
                "message": "Importing entire lodash library - consider importing specific functions"
            })
        
        # Check for missing React.memo or useMemo for expensive operations
        if 'expensive' in content.lower() or 'heavy' in content.lower():
            if 'React.memo' not in content and 'useMemo' not in content:
                issues.append({
                    "type": "missing_memoization",
                    "severity": "suggestion",
                    "message": "Consider using React.memo or useMemo for expensive operations"
                })
        
        return issues
    
    def analyze_accessibility(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze accessibility patterns"""
        issues = []
        
        # Check for missing alt text on images
        if '<img' in content and 'alt=' not in content:
            issues.append({
                "type": "missing_alt_text",
                "severity": "warning",
                "message": "Images should include alt text for accessibility"
            })
        
        # Check for missing aria-label on interactive elements without text
        if any(element in content for element in ['<button>', '<input', '<select']):
            if 'aria-label' not in content and 'aria-labelledby' not in content:
                issues.append({
                    "type": "missing_aria_label",
                    "severity": "suggestion",
                    "message": "Consider adding aria-label for better accessibility"
                })
        
        return issues
    
    def get_package_suggestions(self, command: str) -> List[str]:
        """Get package installation suggestions"""
        suggestions = []
        
        # Common package recommendations
        package_recommendations = {
            "axios": "Consider using the built-in fetch API for simpler HTTP requests",
            "moment": "Consider using date-fns or dayjs for smaller bundle size",
            "lodash": "Consider importing specific functions to reduce bundle size"
        }
        
        for package, suggestion in package_recommendations.items():
            if package in command:
                suggestions.append(suggestion)
        
        return suggestions
    
    def get_build_suggestions(self) -> List[str]:
        """Get build optimization suggestions"""
        return [
            "Ensure code splitting is enabled for optimal bundle sizes",
            "Consider enabling tree shaking to remove unused code",
            "Check if source maps are disabled for production builds"
        ]
    
    def get_dev_server_suggestions(self) -> List[str]:
        """Get development server suggestions"""
        return [
            "Enable hot module replacement for faster development",
            "Consider using HTTPS in development if working with secure APIs"
        ]
    
    def handle_file_change_from_team(self, data: Dict[str, Any]):
        """Handle file change notification from project manager"""
        file_path = data.get("file_path", "")
        
        if self.is_frontend_file(file_path):
            # Send acknowledgment back to project manager
            self.send_message(
                "project-manager",
                "frontend_review_complete",
                {
                    "file_path": file_path,
                    "status": "reviewed",
                    "agent": "frontend-developer"
                }
            )
    
    def handle_task_from_team(self, data: Dict[str, Any]):
        """Handle task assignment from team members"""
        task_description = data.get("description", "")
        
        # Log the task
        self.state["active_tasks"].append({
            "task_id": data.get("task_id"),
            "description": task_description,
            "assigned_at": data.get("created_at"),
            "status": "in_progress"
        })
    
    def handle_meeting_invitation_from_team(self, data: Dict[str, Any]):
        """Handle meeting invitation from team members"""
        topic = data.get("topic", "")
        
        # Auto-accept meetings related to frontend development
        frontend_keywords = ["component", "frontend", "ui", "react", "vue", "javascript"]
        
        if any(keyword in topic.lower() for keyword in frontend_keywords):
            # Send acceptance
            self.send_message(
                data.get("organizer", "project-manager"),
                "meeting_accepted",
                {
                    "meeting_id": data.get("meeting_id"),
                    "agent": "frontend-developer",
                    "response": "accepted"
                }
            )

def main():
    """Main entry point"""
    agent = FrontendDeveloperAgent()
    agent.main()

if __name__ == "__main__":
    main()
