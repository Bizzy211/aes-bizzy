"""
Tests for hooks/essential/session_start.py

Tests the session start hook that loads Beads context at session initialization.
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Import the module under test
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "hooks" / "essential"))
from session_start import (
    run_beads_command,
    load_beads_context,
    format_task_summary,
    main,
)


class TestRunBeadsCommand:
    """Tests for run_beads_command function."""

    def test_successful_command_returns_parsed_json(self, mock_beads_cli):
        """Test that successful bd command returns parsed JSON."""
        expected_response = {"tasks": [{"id": "1", "title": "Test"}]}
        mock_run = mock_beads_cli({("ready", "--json"): expected_response})

        with patch("subprocess.run", mock_run):
            result = run_beads_command(["ready", "--json"])

        assert result == expected_response
        assert result["tasks"][0]["id"] == "1"

    def test_failed_command_returns_none(self, mock_subprocess_failure):
        """Test that failed bd command returns None."""
        result = run_beads_command(["invalid", "command"])
        assert result is None

    def test_timeout_returns_none(self):
        """Test that timeout returns None."""
        import subprocess

        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired("bd", 30)):
            result = run_beads_command(["ready", "--json"])
            assert result is None

    def test_file_not_found_returns_none(self):
        """Test that missing bd command returns None."""
        with patch("subprocess.run", side_effect=FileNotFoundError):
            result = run_beads_command(["ready", "--json"])
            assert result is None

    def test_invalid_json_returns_none(self):
        """Test that invalid JSON response returns None."""
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "not valid json {"

        with patch("subprocess.run", return_value=mock_result):
            result = run_beads_command(["ready", "--json"])
            assert result is None


class TestLoadBeadsContext:
    """Tests for load_beads_context function."""

    def test_loads_ready_tasks(self, mock_beads_cli, sample_beads_ready_response):
        """Test that ready tasks are loaded correctly."""
        mock_run = mock_beads_cli({
            ("ready", "--json"): sample_beads_ready_response,
            ("stale",): {"tasks": []}
        })

        with patch("subprocess.run", mock_run):
            context = load_beads_context()

        assert len(context["ready_tasks"]) == 2
        assert context["session_restored"] is True

    def test_loads_stale_tasks(self, mock_beads_cli, sample_beads_stale_response):
        """Test that stale tasks are loaded correctly."""
        mock_run = mock_beads_cli({
            ("ready", "--json"): {"tasks": []},
            ("stale",): sample_beads_stale_response
        })

        with patch("subprocess.run", mock_run):
            context = load_beads_context()

        assert len(context["stale_tasks"]) == 1
        assert context["stale_tasks"][0]["days_stale"] == 4
        assert context["session_restored"] is True

    def test_empty_context_when_no_tasks(self, mock_beads_cli):
        """Test that empty context is returned when no tasks."""
        mock_run = mock_beads_cli({
            ("ready", "--json"): {"tasks": []},
            ("stale",): {"tasks": []}
        })

        with patch("subprocess.run", mock_run):
            context = load_beads_context()

        assert context["ready_tasks"] == []
        assert context["stale_tasks"] == []
        assert context["session_restored"] is False

    def test_handles_command_failures_gracefully(self, mock_subprocess_failure):
        """Test that command failures don't raise exceptions."""
        context = load_beads_context()

        assert context["ready_tasks"] == []
        assert context["stale_tasks"] == []
        assert context["session_restored"] is False


class TestFormatTaskSummary:
    """Tests for format_task_summary function."""

    def test_empty_list_returns_none_message(self):
        """Test that empty task list returns 'None' message."""
        result = format_task_summary([])
        assert result == "  None"

    def test_formats_single_task(self, sample_tasks):
        """Test that single task is formatted correctly."""
        result = format_task_summary([sample_tasks[0]])

        assert "[1]" in result
        assert "Implement user authentication" in result
        assert "in-progress" in result
        assert "backend-dev" in result

    def test_limits_to_five_tasks(self, sample_tasks):
        """Test that output is limited to 5 tasks with 'more' indicator."""
        # Create 7 tasks
        many_tasks = sample_tasks * 3  # 9 tasks

        result = format_task_summary(many_tasks)
        lines = result.strip().split("\n")

        # Should have 5 task lines + 1 "more" line
        assert len(lines) == 6
        assert "and" in lines[-1] and "more" in lines[-1]

    def test_handles_missing_fields(self):
        """Test that missing task fields use defaults."""
        incomplete_task = {"id": "x"}
        result = format_task_summary([incomplete_task])

        assert "[x]" in result
        assert "Untitled" in result
        assert "unknown" in result
        assert "unassigned" in result


class TestMain:
    """Tests for main function execution."""

    def test_exits_silently_without_beads_dir(self, temp_project_dir):
        """Test that hook exits silently if no .beads directory."""
        # Remove .beads dir
        beads_dir = temp_project_dir / ".beads"
        if beads_dir.exists():
            beads_dir.rmdir()

        with pytest.raises(SystemExit) as exc_info:
            main()

        assert exc_info.value.code == 0

    def test_prints_context_when_tasks_exist(
        self, temp_project_dir, mock_beads_cli, sample_beads_ready_response, capsys
    ):
        """Test that context is printed when tasks exist."""
        # Ensure .beads exists
        (temp_project_dir / ".beads").mkdir(exist_ok=True)

        mock_run = mock_beads_cli({
            ("ready", "--json"): sample_beads_ready_response,
            ("stale",): {"tasks": []}
        })

        with patch("subprocess.run", mock_run):
            with pytest.raises(SystemExit) as exc_info:
                main()

        assert exc_info.value.code == 0

        captured = capsys.readouterr()
        assert "BEADS SESSION CONTEXT RESTORED" in captured.out
        assert "Ready Tasks" in captured.out

    def test_exits_zero_on_success(self, temp_project_dir, mock_subprocess_success):
        """Test that hook always exits with code 0."""
        with pytest.raises(SystemExit) as exc_info:
            main()

        assert exc_info.value.code == 0


class TestIntegration:
    """Integration tests requiring real Beads CLI (skipped by default)."""

    @pytest.mark.integration
    @pytest.mark.skip(reason="Requires real Beads CLI installation")
    def test_real_beads_ready_command(self):
        """Test with real bd ready command."""
        result = run_beads_command(["ready", "--json"])
        # Would need Beads CLI installed to actually run
        assert result is None or isinstance(result, dict)
