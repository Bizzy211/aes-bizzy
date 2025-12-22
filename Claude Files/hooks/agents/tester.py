#!/usr/bin/env python3
"""
Tester Agent - Multi-Agent Development Team
Specializes in quality assurance, test coverage, edge case validation, and testing best practices.
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

class TesterAgent(BaseAgent):
    """
    Tester Agent - The quality assurance specialist.
    
    Responsibilities:
    - Review test coverage and quality
    - Suggest edge cases and test scenarios
    - Validate testing best practices
    - Coordinate with all developers for comprehensive testing
    - Ensure proper test automation
    """
    
    def __init__(self):
        super().__init__(
            agent_name="tester",
            agent_type="quality_assurance",
            specialization="Test coverage, edge case validation, QA automation, testing best practices"
        )
        
        # Tester specific state
        self.state.setdefault("test_coverage", {})
        self.state.setdefault("test_scenarios", [])
        self.state.setdefault("edge_cases", [])
        self.state.setdefault("quality_metrics", {})
        
        # Initialize message processor
        self.message_processor = AgentMessageProcessor("tester")
    
    def get_agent_personality(self) -> Dict[str, str]:
        """Tester personality traits"""
        return {
            "voice_type": "methodical_precise_female",
            "communication_style": "detail_oriented_systematic",
            "speaking_pace": "careful",
            "personality_traits": [
                "meticulous", "thorough", "edge-case-focused", 
                "quality-driven", "systematic"
            ],
            "catchphrases": [
                "What about edge cases?",
                "Have we tested this scenario?",
                "Let's improve test coverage",
                "This needs more validation"
            ]
        }
    
    def process_hook_input(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Process hook input and provide testing expertise"""
        
        # Process any pending messages from other agents first
        self.process_team_messages()
        
        # Handle file operations
        if tool_name in ["Write", "Edit", "MultiEdit"]:
            return self.handle_file_operations(tool_name, tool_input)
        
        # Handle bash commands (test runners, CI/CD)
        elif tool_name == "Bash":
            return self.handle_bash_commands(tool_input)
        
        # Pre-commit validation
        elif tool_name == "pre_commit":
            return self.handle_pre_commit_validation(tool_input)
        
        # General testing guidance
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
            elif message["type"] == "test_request":
                self.handle_test_request(message["data"])
            elif message["type"] == "coverage_analysis":
                self.handle_coverage_analysis(message["data"])
    
    def handle_file_operations(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle file write/edit operations"""
        
        file_path = tool_input.get("file_path", "") or tool_input.get("path", "")
        content = tool_input.get("content", "") or tool_input.get("new_string", "")
        
        if not file_path:
            return {"message": "", "block": False}
        
        # Check if this is a test file or code that needs testing
        if self.is_test_file(file_path):
            return self.handle_test_file_operations(file_path, content, tool_name)
        elif self.is_testable_code(file_path):
            return self.handle_testable_code_operations(file_path, content, tool_name)
        
        return {"message": "", "block": False}
    
    def handle_test_file_operations(self, file_path: str, content: str, tool_name: str) -> Dict[str, Any]:
        """Handle operations on test files"""
        
        issues = self.analyze_test_code(file_path, content, tool_name)
        
        if issues:
            # Categorize issues by severity
            critical_issues = [i for i in issues if i["severity"] == "critical"]
            warnings = [i for i in issues if i["severity"] == "warning"]
            suggestions = [i for i in issues if i["severity"] == "suggestion"]
            
            message_parts = [f"🧪 Tester: Reviewing {Path(file_path).name}"]
            
            # Handle critical issues (block operation)
            if critical_issues:
                message_parts.append("🚨 Critical Test Issues:")
                for issue in critical_issues[:3]:
                    message_parts.append(f"   • {issue['message']}")
                
                return {
                    "message": "\n".join(message_parts),
                    "block": True
                }
            
            # Handle warnings and suggestions
            if warnings:
                message_parts.append("⚠️ Test Warnings:")
                for warning in warnings[:2]:
                    message_parts.append(f"   • {warning['message']}")
            
            if suggestions:
                message_parts.append("💡 Test Suggestions:")
                for suggestion in suggestions[:2]:
                    message_parts.append(f"   • {suggestion['message']}")
            
            return {
                "message": "\n".join(message_parts),
                "block": False
            }
        
        return {
            "message": f"🧪 Tester: {Path(file_path).name} test structure looks good!",
            "block": False
        }
    
    def handle_testable_code_operations(self, file_path: str, content: str, tool_name: str) -> Dict[str, Any]:
        """Handle operations on code that should be tested"""
        
        test_suggestions = self.analyze_testability(file_path, content)
        
        if test_suggestions:
            message_parts = [f"🧪 Tester: Analyzing testability of {Path(file_path).name}"]
            
            # Check if corresponding test file exists
            test_file_path = self.get_corresponding_test_file(file_path)
            if not Path(test_file_path).exists():
                message_parts.append("⚠️ No corresponding test file found")
                message_parts.append(f"   💡 Consider creating: {test_file_path}")
            
            # Add test suggestions
            if test_suggestions:
                message_parts.append("🎯 Suggested test scenarios:")
                for suggestion in test_suggestions[:3]:
                    message_parts.append(f"   • {suggestion}")
            
            # Notify project manager about testing needs
            self.send_message(
                "project-manager",
                "testing_recommendations",
                {
                    "file_path": file_path,
                    "test_file_path": test_file_path,
                    "suggestions": test_suggestions,
                    "agent": "tester"
                }
            )
            
            return {
                "message": "\n".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_bash_commands(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle bash commands related to testing"""
        
        command = tool_input.get("command", "")
        
        # Test runners
        if any(cmd in command for cmd in ["pytest", "jest", "mocha", "phpunit", "rspec", "go test"]):
            return self.handle_test_runner_commands(command)
        
        # Coverage tools
        elif any(cmd in command for cmd in ["coverage", "nyc", "istanbul"]):
            return self.handle_coverage_commands(command)
        
        # CI/CD related
        elif any(cmd in command for cmd in ["github", "gitlab", "jenkins", "travis"]):
            return self.handle_ci_commands(command)
        
        return {"message": "", "block": False}
    
    def handle_test_runner_commands(self, command: str) -> Dict[str, Any]:
        """Handle test runner commands"""
        
        suggestions = []
        warnings = []
        
        # Coverage suggestions
        if "pytest" in command and "--cov" not in command:
            suggestions.append("Consider adding --cov flag for coverage reporting")
        
        if "jest" in command and "--coverage" not in command:
            suggestions.append("Consider adding --coverage flag for coverage analysis")
        
        # Parallel execution suggestions
        if any(runner in command for runner in ["pytest", "jest"]) and "-j" not in command and "--parallel" not in command:
            suggestions.append("Consider parallel test execution for faster runs")
        
        # Watch mode suggestions
        if "jest" in command and "--watch" not in command and "ci" not in command.lower():
            suggestions.append("Consider --watch mode for development")
        
        if suggestions or warnings:
            message_parts = ["🧪 Tester: Test runner analysis"]
            
            if warnings:
                message_parts.extend([f"⚠️ {w}" for w in warnings])
            
            if suggestions:
                message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_coverage_commands(self, command: str) -> Dict[str, Any]:
        """Handle coverage analysis commands"""
        
        suggestions = []
        
        if "coverage" in command and "html" not in command:
            suggestions.append("Consider generating HTML coverage reports for better visualization")
        
        if suggestions:
            message_parts = ["🧪 Tester: Coverage analysis"]
            message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_ci_commands(self, command: str) -> Dict[str, Any]:
        """Handle CI/CD commands"""
        
        suggestions = []
        
        if "test" in command:
            suggestions.append("Ensure tests run in CI environment with proper test data")
        
        if suggestions:
            message_parts = ["🧪 Tester: CI/CD analysis"]
            message_parts.extend([f"💡 {s}" for s in suggestions])
            
            return {
                "message": "\n   ".join(message_parts),
                "block": False
            }
        
        return {"message": "", "block": False}
    
    def handle_pre_commit_validation(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Handle pre-commit validation"""
        
        # Check if tests should be run before commit
        suggestions = []
        
        # Always suggest running tests before commit
        suggestions.append("Run test suite before committing")
        suggestions.append("Verify test coverage hasn't decreased")
        
        message_parts = ["🧪 Tester: Pre-commit validation"]
        message_parts.extend([f"✅ {s}" for s in suggestions])
        
        return {
            "message": "\n   ".join(message_parts),
            "block": False
        }
    
    def handle_general_guidance(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Provide general testing guidance"""
        return {"message": "", "block": False}
    
    def is_test_file(self, file_path: str) -> bool:
        """Check if file is a test file"""
        file_path_lower = file_path.lower()
        
        # Common test file patterns
        test_patterns = [
            "test_", "_test.", ".test.", ".spec.", "_spec.",
            "/tests/", "/test/", "__tests__/", "/spec/"
        ]
        
        return any(pattern in file_path_lower for pattern in test_patterns)
    
    def is_testable_code(self, file_path: str) -> bool:
        """Check if file contains code that should be tested"""
        testable_extensions = [
            ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", 
            ".rs", ".cs", ".php", ".rb", ".kt", ".scala"
        ]
        
        file_path_lower = file_path.lower()
        
        # Skip test files themselves
        if self.is_test_file(file_path):
            return False
        
        # Check if it's a code file
        if any(file_path_lower.endswith(ext) for ext in testable_extensions):
            return True
        
        return False
    
    def get_corresponding_test_file(self, file_path: str) -> str:
        """Get the corresponding test file path for a source file"""
        
        path_obj = Path(file_path)
        
        # Common test file naming conventions
        if file_path.endswith('.py'):
            return str(path_obj.parent / f"test_{path_obj.name}")
        elif file_path.endswith(('.js', '.jsx', '.ts', '.tsx')):
            return str(path_obj.parent / f"{path_obj.stem}.test{path_obj.suffix}")
        elif file_path.endswith('.java'):
            return str(path_obj.parent / f"{path_obj.stem}Test{path_obj.suffix}")
        else:
            return str(path_obj.parent / f"{path_obj.stem}_test{path_obj.suffix}")
    
    def analyze_test_code(self, file_path: str, content: str, tool_name: str) -> List[Dict[str, Any]]:
        """Analyze test code for issues and improvements"""
        
        issues = []
        
        if not content:
            return issues
        
        # Check for test structure
        if not any(keyword in content for keyword in ['test', 'it(', 'describe(', 'def test_']):
            issues.append({
                "type": "test_structure",
                "severity": "critical",
                "message": "No test functions found - ensure proper test structure"
            })
        
        # Check for assertions
        if not any(assertion in content for assertion in ['assert', 'expect', 'should', 'assertEqual']):
            issues.append({
                "type": "missing_assertions",
                "severity": "critical",
                "message": "No assertions found - tests should include assertions"
            })
        
        # Check for test data setup
        if 'test' in content and not any(setup in content for setup in ['setUp', 'beforeEach', 'fixture']):
            issues.append({
                "type": "test_setup",
                "severity": "suggestion",
                "message": "Consider adding test setup/teardown for consistent test data"
            })
        
        # Check for edge case testing
        edge_case_keywords = ['null', 'undefined', 'empty', 'zero', 'negative', 'boundary']
        if not any(keyword in content.lower() for keyword in edge_case_keywords):
            issues.append({
                "type": "edge_cases",
                "severity": "warning",
                "message": "Consider adding edge case tests (null, empty, boundary values)"
            })
        
        # Check for test isolation
        if 'global' in content or 'shared' in content:
            issues.append({
                "type": "test_isolation",
                "severity": "warning",
                "message": "Ensure tests are isolated and don't depend on shared state"
            })
        
        return issues
    
    def analyze_testability(self, file_path: str, content: str) -> List[str]:
        """Analyze code for testability and suggest test scenarios"""
        
        suggestions = []
        
        if not content:
            return suggestions
        
        # Function/method detection
        functions = re.findall(r'def\s+(\w+)', content)  # Python
        functions.extend(re.findall(r'function\s+(\w+)', content))  # JavaScript
        functions.extend(re.findall(r'(\w+)\s*\([^)]*\)\s*{', content))  # General function pattern
        
        if functions:
            suggestions.append(f"Test main functions: {', '.join(functions[:3])}")
        
        # Error handling detection
        if any(keyword in content for keyword in ['try', 'catch', 'except', 'throw', 'raise']):
            suggestions.append("Test error handling and exception scenarios")
        
        # Conditional logic detection
        if any(keyword in content for keyword in ['if', 'else', 'switch', 'case']):
            suggestions.append("Test all conditional branches and edge cases")
        
        # Loop detection
        if any(keyword in content for keyword in ['for', 'while', 'forEach', 'map']):
            suggestions.append("Test loop behavior with empty, single, and multiple items")
        
        # API/HTTP detection
        if any(keyword in content for keyword in ['request', 'response', 'fetch', 'axios', 'http']):
            suggestions.append("Test API calls with mocked responses and error scenarios")
        
        # Database detection
        if any(keyword in content for keyword in ['query', 'select', 'insert', 'update', 'delete']):
            suggestions.append("Test database operations with test data and rollback")
        
        # Async detection
        if any(keyword in content for keyword in ['async', 'await', 'Promise', 'then']):
            suggestions.append("Test asynchronous operations and timeout scenarios")
        
        # Input validation detection
        if any(keyword in content for keyword in ['validate', 'sanitize', 'parse']):
            suggestions.append("Test input validation with valid and invalid data")
        
        return suggestions
    
    def handle_file_change_from_team(self, data: Dict[str, Any]):
        """Handle file change notification from project manager"""
        file_path = data.get("file_path", "")
        
        if self.is_testable_code(file_path):
            # Analyze if tests are needed
            test_file_path = self.get_corresponding_test_file(file_path)
            
            # Send testing recommendations
            self.send_message(
                "project-manager",
                "test_coverage_analysis",
                {
                    "file_path": file_path,
                    "test_file_exists": Path(test_file_path).exists(),
                    "recommendations": ["Ensure adequate test coverage for changes"],
                    "agent": "tester"
                }
            )
    
    def handle_test_request(self, data: Dict[str, Any]):
        """Handle test request from other agents"""
        file_path = data.get("file_path", "")
        test_type = data.get("test_type", "unit")
        
        # Provide test recommendations
        recommendations = self.generate_test_recommendations(file_path, test_type)
        
        self.send_message(
            data.get("from", "project-manager"),
            "test_recommendations_response",
            {
                "file_path": file_path,
                "test_type": test_type,
                "recommendations": recommendations
            }
        )
    
    def handle_coverage_analysis(self, data: Dict[str, Any]):
        """Handle coverage analysis request"""
        coverage_data = data.get("coverage", {})
        
        # Analyze coverage and provide suggestions
        suggestions = []
        
        coverage_percentage = coverage_data.get("percentage", 0)
        if coverage_percentage < 80:
            suggestions.append("Coverage below 80% - consider adding more tests")
        
        uncovered_lines = coverage_data.get("uncovered_lines", [])
        if uncovered_lines:
            suggestions.append(f"Focus on uncovered lines: {uncovered_lines[:5]}")
        
        self.send_message(
            data.get("from", "project-manager"),
            "coverage_analysis_response",
            {"suggestions": suggestions}
        )
    
    def generate_test_recommendations(self, file_path: str, test_type: str) -> List[str]:
        """Generate test recommendations for a file"""
        
        recommendations = []
        
        if test_type == "unit":
            recommendations.extend([
                "Test individual functions in isolation",
                "Mock external dependencies",
                "Test edge cases and boundary conditions"
            ])
        elif test_type == "integration":
            recommendations.extend([
                "Test component interactions",
                "Test data flow between modules",
                "Test external service integrations"
            ])
        elif test_type == "e2e":
            recommendations.extend([
                "Test complete user workflows",
                "Test critical business paths",
                "Test cross-browser compatibility"
            ])
        
        return recommendations

def main():
    """Main entry point"""
    agent = TesterAgent()
    agent.main()

if __name__ == "__main__":
    main()
