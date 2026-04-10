# Contributing to x-poster

Thanks for your interest! Here's how to contribute.

## Development Setup

```bash
git clone https://github.com/CjRamirez333/x-poster.git
cd x-poster
bun install
cd frontend && npm install
```

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run type checking: `bun run typecheck`
4. Build the frontend: `cd frontend && npm run build`
5. Test the full stack: `bun run dev` and open http://localhost:3001
6. Commit with a clear message

## Code Style

- TypeScript strict mode — no `any`, no `@ts-ignore`
- React functional components with hooks
- Tailwind v4 for styling — no external UI libraries
- No external OAuth dependencies — auth is implemented from scratch
- Keep the server lean — no frameworks (Express, Hono, etc.)

## Pull Request Guidelines

- One feature or fix per PR
- Include a clear description of what changed and why
- Make sure `bun run typecheck` passes
- If you add a new API endpoint, update the README endpoint table
- If you add a new frontend component, follow the existing pattern

## Reporting Issues

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Bun version (`bun --version`)

## Feature Requests

Open a GitHub issue with the `feature` label. Describe the use case, not just the solution.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.