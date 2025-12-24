"""
Pytest Configuration and Fixtures for Hook Testing

Provides shared fixtures for testing Python hooks with mocked
subprocess calls, file system isolation, and Beads CLI simulation.
"""

import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

# Add hooks directory to path for imports
HOOKS_DIR = Path(__file__).parent.parent.parent / "hooks"
sys.path.insert(0, str(HOOKS_DIR))


# =============================================================================
# Directory Fixtures
# =============================================================================

@pytest.fixture
def temp_project_dir() -> Generator[Path, None, None]:
    """Create an isolated temporary project directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_dir = Path(tmpdir)

        # Create minimal project structure
        (project_dir / ".git").mkdir()
        (project_dir / ".beads").mkdir()

        # Save original cwd and change to temp dir
        original_cwd = os.getcwd()
        os.chdir(project_dir)

        yield project_dir

        # Restore original cwd
        os.chdir(original_cwd)


@pytest.fixture
def beads_context_dir(temp_project_dir: Path) -> Path:
    """Create a .beads directory with sample context."""
    beads_dir = temp_project_dir / ".beads"
    beads_dir.mkdir(exist_ok=True)

    # Create sample tasks.jsonl
    tasks_file = beads_dir / "tasks.jsonl"
    sample_tasks = [
        {"id": "1", "title": "Test task 1", "status": "in-progress", "assigned": "pm-lead"},
        {"id": "2", "title": "Test task 2", "status": "pending", "assigned": "frontend-dev"},
        {"id": "3", "title": "Test task 3", "status": "done", "assigned": "backend-dev"},
    ]
    with open(tasks_file, "w") as f:
        for task in sample_tasks:
            f.write(json.dumps(task) + "\n")

    # Create sample session.json
    session_file = beads_dir / "session.json"
    session_data = {
        "started_at": "2024-12-24T10:00:00Z",
        "agent": "pm-lead",
        "context": {"project": "test-project"}
    }
    with open(session_file, "w") as f:
        json.dump(session_data, f)

    return beads_dir


# =============================================================================
# Mock Fixtures for Subprocess/CLI
# =============================================================================

@pytest.fixture
def mock_beads_cli():
    """Mock the Beads CLI (bd command) subprocess calls."""
    def create_mock_response(command_responses: dict):
        """
        Create a mock that returns specific responses for bd commands.

        Args:
            command_responses: Dict mapping command args to response data
                Example: {("ready", "--json"): {"tasks": [...]}}
        """
        def mock_run(cmd, *args, **kwargs):
            mock_result = MagicMock()

            # Extract bd subcommand from command list
            if cmd[0] == "bd" and len(cmd) > 1:
                # Create a tuple of the bd subcommand args for lookup
                bd_args = tuple(cmd[1:])

                # Look for matching response
                for key, response in command_responses.items():
                    if all(k in bd_args for k in (key if isinstance(key, tuple) else (key,))):
                        mock_result.returncode = 0
                        mock_result.stdout = json.dumps(response)
                        mock_result.stderr = ""
                        return mock_result

            # Default: command not found or no match
            mock_result.returncode = 1
            mock_result.stdout = ""
            mock_result.stderr = "Command not found"
            return mock_result

        return mock_run

    return create_mock_response


@pytest.fixture
def mock_subprocess_success():
    """Mock subprocess.run to always succeed with empty output."""
    with patch("subprocess.run") as mock:
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "{}"
        mock_result.stderr = ""
        mock.return_value = mock_result
        yield mock


@pytest.fixture
def mock_subprocess_failure():
    """Mock subprocess.run to always fail."""
    with patch("subprocess.run") as mock:
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = ""
        mock_result.stderr = "Command failed"
        mock.return_value = mock_result
        yield mock


# =============================================================================
# Sample Data Fixtures
# =============================================================================

@pytest.fixture
def sample_tasks() -> list:
    """Return a list of sample task dictionaries."""
    return [
        {
            "id": "1",
            "title": "Implement user authentication",
            "status": "in-progress",
            "priority": "high",
            "assigned": "backend-dev",
            "tags": ["security", "api"]
        },
        {
            "id": "2",
            "title": "Create dashboard UI",
            "status": "pending",
            "priority": "medium",
            "assigned": "frontend-dev",
            "tags": ["ui", "react"]
        },
        {
            "id": "3",
            "title": "Write API documentation",
            "status": "pending",
            "priority": "low",
            "assigned": "docs-engineer",
            "tags": ["docs"]
        }
    ]


@pytest.fixture
def sample_beads_ready_response(sample_tasks) -> dict:
    """Return a sample bd ready --json response."""
    return {
        "tasks": sample_tasks[:2],  # Only in-progress and first pending
        "session": {
            "started": "2024-12-24T10:00:00Z",
            "agent": "pm-lead"
        }
    }


@pytest.fixture
def sample_beads_stale_response() -> dict:
    """Return a sample bd stale --json response."""
    return {
        "tasks": [
            {
                "id": "old-1",
                "title": "Forgotten task",
                "status": "pending",
                "last_updated": "2024-12-20T10:00:00Z",
                "days_stale": 4
            }
        ]
    }


# =============================================================================
# Hook Event Fixtures
# =============================================================================

@pytest.fixture
def hook_event_context() -> dict:
    """Return a sample Claude Code hook event context."""
    return {
        "event": "PreToolUse",
        "tool_name": "Bash",
        "tool_input": {
            "command": "git status"
        },
        "session_id": "test-session-123",
        "timestamp": "2024-12-24T10:00:00Z"
    }


@pytest.fixture
def stdin_json_input():
    """Fixture to mock stdin JSON input for hooks."""
    def _create_input(data: dict):
        return json.dumps(data)
    return _create_input


# =============================================================================
# Environment Fixtures
# =============================================================================

@pytest.fixture
def clean_env():
    """Provide a clean environment, removing hook-related vars."""
    env_backup = os.environ.copy()

    # Remove any hook-specific environment variables
    for key in list(os.environ.keys()):
        if key.startswith(("BEADS_", "HEIMDALL_", "CLAUDE_")):
            del os.environ[key]

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(env_backup)


@pytest.fixture
def mock_env():
    """Provide a fixture to set environment variables temporarily."""
    original_env = os.environ.copy()

    def _set_env(**kwargs):
        for key, value in kwargs.items():
            os.environ[key] = value

    yield _set_env

    # Restore
    os.environ.clear()
    os.environ.update(original_env)
