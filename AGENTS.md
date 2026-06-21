# Repository Instructions

Start with `PROJECT.md` and `.doctrine/project.json` before changing this
repository. They define the project goal, lifecycle, boundaries, public
surfaces, delivery model, and adoption gaps.

Use `SylphxAI/doctrine` for enterprise standards. Keep Vex consumer-neutral:
product-specific validation policy belongs in consuming applications or
documented adapters, not hidden package behavior.

For control-plane-only changes, validate with:

```bash
python3 /Users/kyle/.doctrine/scripts/project-control-plane-audit.py --local . --fail-on-drift --json
git diff --check
```

For package or website changes, also run the relevant Bun workspace commands,
CI-equivalent checks, and benchmark evidence for any changed performance claim.
