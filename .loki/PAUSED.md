# Loki Mode - Paused

Execution is currently paused. Options:

1. **Resume**: Press Enter in terminal or `rm .loki/PAUSE`
2. **Add Instructions**: `echo "Focus on fixing the login bug" > .loki/HUMAN_INPUT.md`
3. **Stop**: `touch .loki/STOP`

Current state is saved. You can inspect:
- `.loki/CONTINUITY.md` - Progress and context
- `.loki/STATUS.txt` - Current status
- `.loki/logs/` - Session logs
