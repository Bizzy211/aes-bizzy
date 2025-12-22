#!/usr/bin/env python3
"""
Backend Developer Agent - Multi-Agent Development Team
Specializes in API design, database optimization, server architecture, and backend best practices.
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

class BackendDeveloperAgent(BaseAgent):
    """
    Backend Developer Agent - The server-side specialist.
    
    Responsibilities:
    - Review API design and implementation
    - Optimize database queries and schema
    - Ensure scalability and performance
    - Validate security patterns
    - Coordinate with Frontend and Data Engineers
    """
    
    def __init__(self):
        super().__init__(
            agent_name="backend-developer",
            agent_type="developer",
            specialization="API design, database optimization, server architecture, scalability"
        )
        
        # Backend Developer specific state
        self.state.setdefault("api_endpoints", {})
        self.state.setdefault("database_schemas", {})
        self.state.setdefault("performance_metrics", {})
        self.state.setdefault("security_reviews", [])
        
        # Initialize message processor
        self.message_processor = AgentMessageProcessor("backend-developer")
    
    def get_agent_personality(self) -> Dict[str, str]:
        """Backend Developer personality traits"""
        return {
            "voice_type": "deep_analytical_male",
            "communication_style": "technical_precise",
            "speaking_pace": "measured",
            "personality_traits": [
                "analytical", "security-focused", "performance-oriented", 
                "scalability-minded", "methodical"
            ],
            "catchphrases": [
                "Let's optimize this query",
                "Have we considered scalability?",
                "What about error handling?",
                "This needs proper validation"
            ]
        }
    
    def process_hook_input(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Process hook input and provide backend expertise"""
        
        # Process any pending messages from other agents first
        self.process_team_messages()
        
        # Handle file operations
        if tool_name in ["Write", "Edit", "MultiEdit"]:
            return self.handle_file_operations(tool_name, tool_input)
        
        # Handle bash commands (database, server commands)
        elif tool_name == "Bash":
            return self.handle_bash_commands(tool_input)
        
        # General backend guidance
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
            elif message["type"] == "api_change_request":
                self.handle_api_change_request(message["data"])
            elif message["type"] == "database_query_review":
                self.handle_database_query_review(message["data"])
    
    def handle_file_operations(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file write/edit operations"""
        
        file_path = tool_input.get("file_path", "") or tool_input.get("path", "")
        content = tool_input.get("content", "") or tool_input.get("new_string", "")
        
        if not file_path:
            return {"message": "", "block": False}
        
        # Check if this is a backend file
        if not self.is_backend_file(file_path):
            return {"message": "", "block": False}
        
        # Analyze the backend code
        issues = self.analyze_backend_code(file_path, content, tool_name)
        
        if issues:
            # Categorize issues by severity
            critical_issues = [i for i in issues if i["severity"] == "critical"]
            warnings = [i for i in issues if i["severity"] == "warning"]
            suggestions = [i for i in issues if i["severity"] == "suggestion"]
            
            message_parts = [f"🔧 Backend Developer: Reviewing {Path(file_path).name}"]
            
            # Handle critical issues (block operation)
            if critical_issues:
                message_parts.append("🚨 Critical Issues Found:")
                for issue in critical_issues[:3]:  # Show max 3 critical issues
                    message_parts.append(f"   • {issue['message']}")
                
                # Notify project manager and security engineer
                self.send_message(
                    "project-manager",
                    "critical_backend_issue",
                    {
                        "file_path": file_path,
                        "issues": critical_issues,
                        "agent": "backend-developer"
                    },
                    priority="high"
                )
                
                if any("security" in issue["type"] for issue in critical_issues):
                    self.send_message(
                        "security-engineer",
                        "security_review_needed",
                        {
                            "file_path": file_path,
                            "security_issues": [i for i in critical_issues if "security" in i["type"]]
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
            
            # Coordinate with data engineer for database issues
            if any("database" in issue["type"] for issue in issues):
                self.send_message(
                    "data-engineer",
                    "database_optimization_review",
                    {
                        "file_path": file_path,
                        "database_issues": [i for i in issues if "database" in i["type"]]
                    }
                )
            
            return {
                "message": "\n".join(message_parts),
                "block": False
            }
        
        # No issues found - provide positive feedback
        return {
            "message": f"🔧 Backend Developer: {Path(file_path).name} looks solid! Good backend architecture.",
            "block": False
        }
    
    def handle_bash_commands(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle bash commands related to backend development"""
        
        command = tool_input.get("command", "")
        
        # Database commands
        if any(cmd in command for cmd in ["psql", "mysql", "mongo", "redis", "sqlite"]):
            return self.handle_database_commands(command)
        
        # Server/deployment commands
        elif any(cmd in command for cmd in ["docker", "kubernetes", "nginx", "apache", "gunicorn", "uvicorn"]):
            return self.handle_server_commands(command)
        
        # Package management
        elif any(cmd in command for cmd in ["pip install", "npm install", "composer install"]):
            return self.handle_package_commands(command)
        
        return {"message": "", "block": False}
    
    def handle_database_commands(self, command: str) -> Dict[str, Any]:
        """Handle database-related commands"""
        
        suggestions = []
        warnings = []
        
        # Migration warnings
        if any(keyword in command for keyword in ["drop", "delete", "truncate"]):
            warnings.append("Destructive database operation detected - ensure you have backups!")
        
        # Performance suggestions
        if "select" in command.lower() and "where" not in command.lower():
            suggestions.append("Consider adding WHERE clause to limit query scope")
        
        # Index suggestions
        if "create table" in command.lower():
            suggestions.append("Don't forget to add appropriate indexes for query performance")
        
        if suggestions or warnings:
            message_parts = ["🔧 Backend Developer: Database command analysis"]
            
            if warnings:
                message_parts.extend([f"⚠️ {w}" for w in warnings])
            
            if suggestions:
                message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_server_commands(self, command: str) -> Dict[str, Any]:
        """Handle server/deployment commands"""
        
        suggestions = []
        
        if "docker run" in command and "-d" not in command:
            suggestions.append("Consider running Docker containers in detached mode (-d)")
        
        if "nginx" in command:
            suggestions.append("Ensure SSL/TLS configuration for production deployments")
        
        if suggestions:
            message_parts = ["🔧 Backend Developer: Server command analysis"]
            message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_package_commands(self, command: str) -> Dict[str, Any]:
        """Handle package installation commands"""
        
        suggestions = []
        
        # Security package recommendations
        security_packages = {
            "bcrypt": "Good choice for password hashing",
            "helmet": "Excellent for Express.js security headers",
            "cors": "Remember to configure CORS properly for production"
        }
        
        for package, suggestion in security_packages.items():
            if package in command:
                suggestions.append(suggestion)
        
        if suggestions:
            message_parts = ["🔧 Backend Developer: Package analysis"]
            message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_general_guidance(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Provide general backend guidance"""
        return {"message": "", "block": False}
    
    def is_backend_file(self, file_path: str) -> bool:
        """Check if file is a backend file"""
        backend_extensions = [
            ".py", ".java", ".go", ".rs", ".cs", ".php", ".rb", ".kt", ".scala"
        ]
        
        file_path_lower = file_path.lower()
        
        # Check extension
        if any(file_path_lower.endswith(ext) for ext in backend_extensions):
            return True
        
        # Check if it's in backend directories
        backend_dirs = ["api/", "server/", "backend/", "services/", "models/", "controllers/", "routes/"]
        if any(dir in file_path_lower for dir in backend_dirs):
            return True
        
        # Check for specific backend files
        backend_files = ["requirements.txt", "package.json", "go.mod", "cargo.toml", "composer.json"]
        if any(file in file_path_lower for file in backend_files):
            return True
        
        return False
    
    def analyze_backend_code(self, file_path: str, content: str, tool_name: str) -> List[Dict[str, Any]]:
        """Analyze backend code for issues and improvements"""
        
        issues = []
        
        if not content:
            return issues
        
        # Python specific checks
        if file_path.endswith('.py'):
            issues.extend(self.analyze_python_code(content, file_path))
        
        # JavaScript/Node.js specific checks
        elif file_path.endswith('.js') and any(keyword in content for keyword in ['express', 'fastify', 'koa']):
            issues.extend(self.analyze_nodejs_code(content, file_path))
        
        # General backend checks
        issues.extend(self.analyze_general_backend_patterns(content, file_path))
        
        # Security checks
        issues.extend(self.analyze_security_patterns(content, file_path))
        
        # Database checks
        issues.extend(self.analyze_database_patterns(content, file_path))
        
        return issues
    
    def analyze_python_code(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze Python backend code"""
        issues = []
        
        # Check for SQL injection vulnerabilities
        if re.search(r'execute\s*\(\s*["\'].*%.*["\']', content):
            issues.append({
                "type": "security_sql_injection",
                "severity": "critical",
                "message": "Potential SQL injection vulnerability - use parameterized queries"
            })
        
        # Check for missing error handling
        if 'requests.' in content and 'except' not in content:
            issues.append({
                "type": "error_handling",
                "severity": "warning",
                "message": "HTTP requests should include proper error handling"
            })
        
        # Check for hardcoded secrets
        if re.search(r'(password|secret|key)\s*=\s*["\'][^"\']+["\']', content, re.IGNORECASE):
            issues.append({
                "type": "security_hardcoded_secrets",
                "severity": "critical",
                "message": "Hardcoded secrets detected - use environment variables"
            })
        
        return issues
    
    def analyze_nodejs_code(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze Node.js backend code"""
        issues = []
        
        # Check for missing helmet (security headers)
        if 'express()' in content and 'helmet' not in content:
            issues.append({
                "type": "security_headers",
                "severity": "warning",
                "message": "Consider using helmet for security headers"
            })
        
        # Check for missing CORS configuration
        if 'express()' in content and 'cors' not in content:
            issues.append({
                "type": "cors_configuration",
                "severity": "suggestion",
                "message": "Consider configuring CORS for cross-origin requests"
            })
        
        return issues
    
    def analyze_general_backend_patterns(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze general backend patterns"""
        issues = []
        
        # Check for missing input validation
        if any(keyword in content for keyword in ['request.', 'req.']) and 'validate' not in content.lower():
            issues.append({
                "type": "input_validation",
                "severity": "warning",
                "message": "Consider adding input validation for request data"
            })
        
        # Check for missing rate limiting
        if 'api' in file_path.lower() and 'rate' not in content.lower():
            issues.append({
                "type": "rate_limiting",
                "severity": "suggestion",
                "message": "Consider implementing rate limiting for API endpoints"
            })
        
        return issues
    
    def analyze_security_patterns(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze security patterns"""
        issues = []
        
        # Check for authentication
        if any(keyword in content for keyword in ['login', 'auth', 'token']) and 'bcrypt' not in content:
            issues.append({
                "type": "security_authentication",
                "severity": "warning",
                "message": "Ensure proper password hashing (consider bcrypt)"
            })
        
        return issues
    
    def analyze_database_patterns(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Analyze database patterns"""
        issues = []
        
        # Check for N+1 query problems
        if 'for' in content and any(db_op in content for db_op in ['query', 'find', 'get']):
            issues.append({
                "type": "database_n_plus_one",
                "severity": "warning",
                "message": "Potential N+1 query problem - consider using joins or batch queries"
            })
        
        return issues
    
    def handle_file_change_from_team(self, data: Dict[str, Any]):
        """Handle file change notification from project manager"""
        file_path = data.get("file_path", "")
        
        if self.is_backend_file(file_path):
            # Send acknowledgment back to project manager
            self.send_message(
                "project-manager",
                "backend_review_complete",
                {
                    "file_path": file_path,
                    "status": "reviewed",
                    "agent": "backend-developer"
                }
            )
    
    def handle_api_change_request(self, data: Dict[str, Any]):
        """Handle API change request from frontend developer"""
        api_change = data.get("api_change", {})
        
        # Analyze the requested API change
        response = {
            "status": "approved",
            "suggestions": [],
            "concerns": []
        }
        
        # Send response back
        self.send_message(
            data.get("from", "frontend-developer"),
            "api_change_response",
            response
        )
    
    def handle_database_query_review(self, data: Dict[str, Any]):
        """Handle database query review request"""
        query = data.get("query", "")
        
        # Analyze query for performance and security
        suggestions = []
        
        if "select *" in query.lower():
            suggestions.append("Avoid SELECT * - specify needed columns")
        
        if "where" not in query.lower() and "select" in query.lower():
            suggestions.append("Consider adding WHERE clause to limit results")
        
        # Send response
        self.send_message(
            data.get("from", "data-engineer"),
            "query_review_response",
            {"suggestions": suggestions}
        )

def main():
    """Main entry point"""
    agent = BackendDeveloperAgent()
    agent.main()

if __name__ == "__main__":
    main()
