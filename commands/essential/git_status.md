# Command: /git_status

Understand the current state of the git repository with comprehensive branch and status information.

## Description

Provides a complete overview of the git repository state including:
- Current branch and tracking status
- Uncommitted changes (staged and unstaged)
- Recent commit history
- Stash list
- Remote status

## Steps

1. **Check Branch Status**
   ```bash
   git branch -vv
   ```
   Show current branch with tracking info.

2. **Get Repository Status**
   ```bash
   git status --short --branch
   ```
   Show working tree status in compact format.

3. **Show Staged Changes**
   ```bash
   git diff --cached --stat
   ```
   Display files staged for commit.

4. **Show Unstaged Changes**
   ```bash
   git diff --stat
   ```
   Display modified but unstaged files.

5. **Recent Commits**
   ```bash
   git log --oneline -5
   ```
   Show last 5 commits.

6. **Check Stash**
   ```bash
   git stash list
   ```
   List any stashed changes.

7. **Remote Status**
   ```bash
   git remote -v
   ```
   Show configured remotes.

8. **Ahead/Behind Status**
   ```bash
   git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null
   ```
   Show commits ahead/behind upstream.

## Beads Integration

After running git status, optionally log to current task:

```bash
# Log significant status to Beads
bd update TASK_ID --add-note "Git: 3 files modified, 2 staged, on branch feature/auth"
```

## Example Output

```
🌿 Git Repository Status

Branch: feature/auth-system
Tracking: origin/feature/auth-system
Status: 2 commits ahead, 0 behind

📝 Changes:
  Staged (2):
    M src/auth/login.ts
    A src/auth/jwt.ts

  Modified (1):
    M src/config.ts

📜 Recent Commits:
  abc1234 Add JWT token generation
  def5678 Implement login endpoint
  ghi9012 Set up auth middleware
  jkl3456 Create auth module structure
  mno7890 Initial project setup

📦 Stash: (empty)

🔗 Remotes:
  origin: git@github.com:user/repo.git
```

## Usage

```bash
/git_status
```

## Related Commands

- `/commit` - Create a new commit
- `/prime` - Load full session context

---

*A.E.S - Bizzy Command - Git Repository Status*
