# Command: /prime_tts

Load context for a new agent session with TTS announcement using ElevenLabs MCP.

## Description

Extended version of `/prime` that:
- Loads all session context (same as /prime)
- Announces session status via text-to-speech
- Provides audio feedback for hands-free operation

## Steps

1. **Run Standard Prime**
   Execute all steps from `/prime`:
   - Check Beads status
   - Load ready tasks
   - Read project documentation
   - Load agent index
   - Analyze codebase structure

2. **Generate Summary Text**
   Create concise audio summary:
   ```
   "Session primed for [Project Name].
   [N] agents available.
   [M] tasks ready.
   Recommended: [Task description]."
   ```

3. **Generate TTS Audio**
   Use ElevenLabs MCP:
   ```javascript
   mcp__ElevenLabs__text_to_speech({
     text: summaryText,
     voice_name: "Adam",  // or configured voice
     model_id: "eleven_multilingual_v2"
   })
   ```

4. **Play Audio**
   Play the generated audio:
   ```javascript
   mcp__ElevenLabs__play_audio({
     input_file_path: generatedAudioPath
   })
   ```

5. **Display Visual Summary**
   Also show standard `/prime` output for reference.

## Beads Integration

Same as `/prime`:
- Check session status with `bd status`
- Load ready tasks with `bd ready`
- Include task info in TTS announcement

## Voice Configuration

Available voices for TTS:
- **Adam** - Default male voice
- **Rachel** - Female voice
- **Sam** - Alternative male
- **Elli** - Alternative female

Configure in environment or command:
```bash
ELEVENLABS_VOICE=Adam /prime_tts
```

## Example Output

```
🔊 Generating audio summary...

[Audio plays: "Session primed for A.E.S Bizzy Multi-Agent System.
10 agents available. 3 tasks ready.
Recommended: Create 6 essential commands."]

📋 Session Primed

Project: A.E.S - Bizzy Multi-Agent System
Purpose: Claude Code orchestration with specialized agents

📁 Structure:
  - claude-subagents/agents/ (10 agents)
  - claude-subagents/hooks/ (26 hooks)
  - claude-subagents/skills/ (9 skills)

🤖 Available Agents:
  Core: pm-lead, agent-router, agent-creator
  Specialists: backend-dev, frontend-dev, debugger...

📌 Ready Tasks (3):
  - Task 49: Create 6 essential commands
  - Task 50: Implement agent router

💡 Recommended: Start with Task 49
```

## Requirements

- ElevenLabs API key configured
- MCP ElevenLabs server running
- Audio output available

## Fallback

If TTS is unavailable:
1. Log warning: "TTS unavailable, falling back to visual only"
2. Run standard `/prime` command
3. Skip audio generation

## Usage

```bash
/prime_tts
```

## Related Commands

- `/prime` - Visual-only session priming
- `/question` - Information queries

---

*A.E.S - Bizzy Command - Session Initialization with TTS*
