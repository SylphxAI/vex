# vex

`vex` is an active foundation repository for the `@sylphx/vex` schema
validation library family. It owns the core validation package, JSON Schema
conversion package, docs website, benchmark claims, CI workflow, and central
release workflow wiring for Vex consumers.

## Lifecycle And Layer

- Lifecycle: `active`
- Layer: `foundation`

## Goals

- Provide a fast, typed, functional schema validation library through documented
  package exports.
- Keep core validation, JSON Schema conversion, docs, tests, benchmarks, and
  release wiring coherent as one library family.
- Publish only consumer-neutral validation APIs and reproducible performance
  claims.

## Non-Goals

- Own one product's form policy, API validation policy, data model, or error-copy
  strategy.
- Own JSON Schema standards beyond the documented conversion behavior exported
  by this repository.
- Publish enterprise doctrine, org rulesets, or shared CI/release policy.

## Boundaries

This repository owns the Vex package family, docs website, and benchmark
evidence. Consumers must depend on documented package exports and public docs,
not internal source paths or private benchmark assumptions. Product-specific
schema decisions belong in consuming applications.

## Public Surfaces

- `README.md` documents the library family.
- `packages/vex/package.json` defines the core package export.
- `packages/vex-json-schema/package.json` defines JSON Schema conversion
  exports.
- `packages/*/README.md` document package-level usage.
- `website/` and `sylphx.json` define the docs site surface.
- `.github/workflows/ci.yml` defines pull-request and merge-group CI.
- `.github/workflows/release.yml` delegates main-branch releases to the central
  reusable release workflow.
- `.doctrine/project.json` is the machine-readable project manifest.

## Delivery

Pull requests and merge groups run lint, typecheck, tests, and build through the
repo CI workflow. Main-branch releases delegate to the central reusable release
workflow. Published package changes require package/readback or consumer smoke
proof in addition to CI because source revert alone does not undo a release.

The authoritative control-plane record is `.doctrine/project.json`.
