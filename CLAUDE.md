# Important Notes for Claude Code

## Code Generation Guidelines

### Comments
- **DO NOT add unnecessary comments** when generating code
- Only add comments when they are **super important** for understanding complex logic, non-obvious behavior, or critical implementation details
- Prefer self-documenting code with clear variable and function names over explanatory comments
- Avoid redundant comments that merely restate what the code does

### Code Style
- Follow the existing codebase patterns and conventions
- Keep code clean and readable through proper naming and structure
- Let the code speak for itself whenever possible

### Utility Libraries
- Use lodash functions (such as `sort`, `take`, `mapValues`, etc.) for utility operations like sorting, slicing, and mapping when appropriate
