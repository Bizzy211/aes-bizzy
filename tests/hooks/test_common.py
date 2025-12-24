"""
Tests for hooks/utils/common.py

Tests the shared utility functions used across multiple hooks.
"""

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Import the module under test
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "hooks" / "utils"))
from common import (
    load_env,
    run_command,
    read_json,
    write_json,
    append_jsonl,
    read_jsonl,
    get_project_root,
)


class TestLoadEnv:
    """Tests for load_env function."""

    def test_returns_env_value_when_exists(self, mock_env):
        """Test that existing env var is returned."""
        mock_env(TEST_VAR="test_value")
        result = load_env("TEST_VAR")
        assert result == "test_value"

    def test_returns_default_when_missing(self, clean_env):
        """Test that default is returned for missing var."""
        result = load_env("NONEXISTENT_VAR", "default_value")
        assert result == "default_value"

    def test_returns_empty_string_as_default(self, clean_env):
        """Test that empty string is default when not specified."""
        result = load_env("NONEXISTENT_VAR")
        assert result == ""


class TestRunCommand:
    """Tests for run_command function."""

    def test_successful_command(self):
        """Test successful command execution."""
        with patch("subprocess.run") as mock_run:
            mock_result = MagicMock()
            mock_result.returncode = 0
            mock_result.stdout = "output"
            mock_result.stderr = ""
            mock_run.return_value = mock_result

            returncode, stdout, stderr = run_command(["echo", "hello"])

            assert returncode == 0
            assert stdout == "output"
            assert stderr == ""

    def test_failed_command(self):
        """Test failed command execution."""
        with patch("subprocess.run") as mock_run:
            mock_result = MagicMock()
            mock_result.returncode = 1
            mock_result.stdout = ""
            mock_result.stderr = "error"
            mock_run.return_value = mock_result

            returncode, stdout, stderr = run_command(["false"])

            assert returncode == 1
            assert stderr == "error"

    def test_timeout_handling(self):
        """Test timeout handling."""
        import subprocess

        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired("cmd", 30)):
            returncode, stdout, stderr = run_command(["sleep", "100"], timeout=1)

            assert returncode == -1
            assert "timed out" in stderr.lower()

    def test_command_not_found(self):
        """Test missing command handling."""
        with patch("subprocess.run", side_effect=FileNotFoundError):
            returncode, stdout, stderr = run_command(["nonexistent_command"])

            assert returncode == -1
            assert "not found" in stderr.lower()


class TestReadJson:
    """Tests for read_json function."""

    def test_reads_valid_json_file(self, temp_project_dir):
        """Test reading a valid JSON file."""
        test_data = {"key": "value", "number": 42}
        json_file = temp_project_dir / "test.json"
        json_file.write_text(json.dumps(test_data))

        result = read_json(str(json_file))

        assert result == test_data
        assert result["key"] == "value"
        assert result["number"] == 42

    def test_returns_none_for_missing_file(self):
        """Test that missing file returns None."""
        result = read_json("/nonexistent/path/file.json")
        assert result is None

    def test_returns_none_for_invalid_json(self, temp_project_dir):
        """Test that invalid JSON returns None."""
        invalid_file = temp_project_dir / "invalid.json"
        invalid_file.write_text("not valid json {")

        result = read_json(str(invalid_file))
        assert result is None


class TestWriteJson:
    """Tests for write_json function."""

    def test_writes_json_file(self, temp_project_dir):
        """Test writing a JSON file."""
        test_data = {"key": "value"}
        json_file = temp_project_dir / "output.json"

        success = write_json(str(json_file), test_data)

        assert success is True
        assert json_file.exists()

        # Verify content
        content = json.loads(json_file.read_text())
        assert content == test_data

    def test_creates_parent_directories(self, temp_project_dir):
        """Test that parent directories are created."""
        nested_file = temp_project_dir / "deep" / "nested" / "file.json"

        success = write_json(str(nested_file), {"test": True})

        assert success is True
        assert nested_file.exists()

    def test_uses_specified_indent(self, temp_project_dir):
        """Test that specified indent is used."""
        json_file = temp_project_dir / "indented.json"

        write_json(str(json_file), {"key": "value"}, indent=4)

        content = json_file.read_text()
        # With indent=4, there should be 4 spaces
        assert "    " in content


class TestAppendJsonl:
    """Tests for append_jsonl function."""

    def test_appends_to_new_file(self, temp_project_dir):
        """Test appending to a new JSONL file."""
        jsonl_file = temp_project_dir / "test.jsonl"
        data = {"id": 1, "name": "test"}

        success = append_jsonl(str(jsonl_file), data)

        assert success is True
        assert jsonl_file.exists()

        lines = jsonl_file.read_text().strip().split("\n")
        assert len(lines) == 1
        assert json.loads(lines[0]) == data

    def test_appends_multiple_entries(self, temp_project_dir):
        """Test appending multiple entries."""
        jsonl_file = temp_project_dir / "multi.jsonl"

        append_jsonl(str(jsonl_file), {"id": 1})
        append_jsonl(str(jsonl_file), {"id": 2})
        append_jsonl(str(jsonl_file), {"id": 3})

        lines = jsonl_file.read_text().strip().split("\n")
        assert len(lines) == 3

    def test_creates_parent_directories(self, temp_project_dir):
        """Test that parent directories are created."""
        nested_file = temp_project_dir / "logs" / "entries.jsonl"

        success = append_jsonl(str(nested_file), {"event": "test"})

        assert success is True
        assert nested_file.exists()


class TestReadJsonl:
    """Tests for read_jsonl function."""

    def test_reads_jsonl_file(self, temp_project_dir):
        """Test reading a JSONL file."""
        jsonl_file = temp_project_dir / "data.jsonl"
        entries = [{"id": 1}, {"id": 2}, {"id": 3}]

        with open(jsonl_file, "w") as f:
            for entry in entries:
                f.write(json.dumps(entry) + "\n")

        result = read_jsonl(str(jsonl_file))

        assert len(result) == 3
        assert result[0]["id"] == 1
        assert result[2]["id"] == 3

    def test_respects_limit(self, temp_project_dir):
        """Test that limit parameter is respected."""
        jsonl_file = temp_project_dir / "many.jsonl"

        with open(jsonl_file, "w") as f:
            for i in range(10):
                f.write(json.dumps({"id": i}) + "\n")

        result = read_jsonl(str(jsonl_file), limit=5)

        assert len(result) == 5

    def test_skips_invalid_lines(self, temp_project_dir):
        """Test that invalid JSON lines are skipped."""
        jsonl_file = temp_project_dir / "mixed.jsonl"

        with open(jsonl_file, "w") as f:
            f.write('{"id": 1}\n')
            f.write("invalid json\n")
            f.write('{"id": 2}\n')

        result = read_jsonl(str(jsonl_file))

        assert len(result) == 2
        assert result[0]["id"] == 1
        assert result[1]["id"] == 2

    def test_returns_empty_for_missing_file(self):
        """Test that missing file returns empty list."""
        result = read_jsonl("/nonexistent/file.jsonl")
        assert result == []


class TestGetProjectRoot:
    """Tests for get_project_root function."""

    def test_finds_git_root(self, temp_project_dir):
        """Test finding project root by .git directory."""
        result = get_project_root()
        assert result is not None
        assert Path(result) == temp_project_dir

    def test_finds_beads_root(self, temp_project_dir):
        """Test finding project root by .beads directory."""
        # Remove .git, keep .beads
        (temp_project_dir / ".git").rmdir()

        result = get_project_root()
        assert result is not None
        assert Path(result) == temp_project_dir

    def test_finds_root_from_subdirectory(self, temp_project_dir, monkeypatch):
        """Test that project root is found from a subdirectory."""
        # Create a nested subdirectory
        subdir = temp_project_dir / "src" / "lib"
        subdir.mkdir(parents=True)

        # Change to subdirectory
        monkeypatch.chdir(subdir)

        result = get_project_root()
        # Should find the temp_project_dir which has .git
        assert result is not None
        assert Path(result) == temp_project_dir
