# Changelog

## 0.1.8 (2025-12-03)

### ✨ Features

- **vex:** export sym alias for symbol validator ([8c1b0e7](https://github.com/SylphxAI/vex/commit/8c1b0e780810e39f083145e39a52d79e6bd2937d))

### 🐛 Bug Fixes

- **types:** add explicit type annotations for DTS generation ([f30b0bf](https://github.com/SylphxAI/vex/commit/f30b0bff6d981c3151f0674369bf4fd59e6491d9))
- **vex:** fix async type errors for strict TypeScript mode ([893d79a](https://github.com/SylphxAI/vex/commit/893d79a0dd2186e96fdf75387ea89b9618d071bd))
- **vex:** resolve TypeScript strict mode and biome lint errors ([fd7721b](https://github.com/SylphxAI/vex/commit/fd7721b1f92f48c0cfc2a749d47fcd0e42d89614))
- **vex:** use ValidationError consistently and add missing metadata ([e81aa2b](https://github.com/SylphxAI/vex/commit/e81aa2b512ea3c35aab1f16f598506d1a4ef4242))

### ⚡️ Performance

- **vex:** optimize time parsing by avoiding .map(Number) ([7e082f6](https://github.com/SylphxAI/vex/commit/7e082f62dcd3004bc03a59e39104e29b1df3014a))
- **vex:** add monomorphic path for map validation ([c973bed](https://github.com/SylphxAI/vex/commit/c973bed6e303c2abf5d75c398794cb0393bdaed7))
- **vex:** add monomorphic path for set validation ([cc269b0](https://github.com/SylphxAI/vex/commit/cc269b06a29b20cff7072c606f12ad6cde498064))
- **vex:** add monomorphic path for array validation ([9e19743](https://github.com/SylphxAI/vex/commit/9e197430ad159c8aa22d5aa3a56d6375f250fd21))
- **vex:** remove optional chaining in pipe hot loop ([64550e9](https://github.com/SylphxAI/vex/commit/64550e92b1bc2c86a8fea141561fa4b04fdcf699))
- **vex:** cache digit regex in IPv4 validator ([b376669](https://github.com/SylphxAI/vex/commit/b37666992de42574da6506dcf408bb1149d20571))
- **vex:** cache TextEncoder instance in bytes validators ([551d5df](https://github.com/SylphxAI/vex/commit/551d5df58273ee39bcd8871ad0f85b282e1a9e64))
- **vex:** add monomorphic path for tuple validation ([6d71caa](https://github.com/SylphxAI/vex/commit/6d71caa2363a1a2546f55a6729db8db81d84b321))
- **vex:** replace object spread with Object.assign in intersect ([2fb1a95](https://github.com/SylphxAI/vex/commit/2fb1a954c42aaaa31919cb5c8ccbc518b2253f0e))
- **vex:** eliminate array spread in text validators ([9d5f786](https://github.com/SylphxAI/vex/commit/9d5f78699f33225a64e36454cf741083602b1486))
- **vex:** cache hash validator regex patterns ([28591e3](https://github.com/SylphxAI/vex/commit/28591e3629e5c637c51733d85374ee7ca1a7cc22))
- **vex:** implement lazy metadata merging in pipe ([8935454](https://github.com/SylphxAI/vex/commit/8935454b3c0863c7b9227bf671f122f2b2293e31))
- **vex:** optimize object validation with monomorphic path ([2c98888](https://github.com/SylphxAI/vex/commit/2c98888024ddf747788feadf20ed9334f6f24de6))
- **vex:** add getErrorMsg helper to reduce code duplication ([1f3e54d](https://github.com/SylphxAI/vex/commit/1f3e54d11e525eacac62b3fc98f2a9d402633c21))
- **vex:** cache Intl.Segmenter instances for text validators ([36da554](https://github.com/SylphxAI/vex/commit/36da5548eef7e4ecd89397eb87db57d9c32658b0))

### ♻️ Refactoring

- **vex:** extract separateMetaActions to core ([887acaa](https://github.com/SylphxAI/vex/commit/887acaab3f0050f9f74afc9aa0847b0e6a29cf6a))
- **vex:** use getErrorMsg helper across schemas and composition ([251eb05](https://github.com/SylphxAI/vex/commit/251eb05434e3840512f4d5951aa6570ccfc6f8ae))

### 📚 Documentation

- update benchmark results in READMEs ([be420e7](https://github.com/SylphxAI/vex/commit/be420e7b9798b8aba2a37981da2216cb95770119))
- **vex:** deprecate nonEmpty alias in favor of nonempty ([071511d](https://github.com/SylphxAI/vex/commit/071511ddde5c00e4c1aae2ac2da629c7470499f0))

### ✅ Tests

- **vex:** expand benchmark suite with comprehensive feature coverage ([afd4f5b](https://github.com/SylphxAI/vex/commit/afd4f5bbcf06dfed23e4d9519f32393037567df7))
- **vex:** additional edge case tests for near-100% coverage ([efb6d32](https://github.com/SylphxAI/vex/commit/efb6d321e5414c0ba79eba4242486815877c158a))
- **vex:** comprehensive tests for 100% coverage ([bd2f3bb](https://github.com/SylphxAI/vex/commit/bd2f3bb6f89de8576289f7efe066940c35dfd9a9))

### 📦 Build

- **vex:** migrate from bun build + tsc to bunup ([89ec89a](https://github.com/SylphxAI/vex/commit/89ec89af8031601d6e55f515b5c61fb3299622a5))

### 🔧 Chores

- **vex:** update dependencies and auto-format imports ([c17518b](https://github.com/SylphxAI/vex/commit/c17518bc84e2997fa34e14e9f701aca3f3d727a0))

## 0.1.7 (2025-12-03)

### ✨ Features

- **vex:** export sym alias for symbol validator ([8c1b0e7](https://github.com/SylphxAI/vex/commit/8c1b0e780810e39f083145e39a52d79e6bd2937d))

### 🐛 Bug Fixes

- **vex:** fix async type errors for strict TypeScript mode ([893d79a](https://github.com/SylphxAI/vex/commit/893d79a0dd2186e96fdf75387ea89b9618d071bd))
- **vex:** resolve TypeScript strict mode and biome lint errors ([fd7721b](https://github.com/SylphxAI/vex/commit/fd7721b1f92f48c0cfc2a749d47fcd0e42d89614))
- **vex:** use ValidationError consistently and add missing metadata ([e81aa2b](https://github.com/SylphxAI/vex/commit/e81aa2b512ea3c35aab1f16f598506d1a4ef4242))

### ⚡️ Performance

- **vex:** optimize time parsing by avoiding .map(Number) ([7e082f6](https://github.com/SylphxAI/vex/commit/7e082f62dcd3004bc03a59e39104e29b1df3014a))
- **vex:** add monomorphic path for map validation ([c973bed](https://github.com/SylphxAI/vex/commit/c973bed6e303c2abf5d75c398794cb0393bdaed7))
- **vex:** add monomorphic path for set validation ([cc269b0](https://github.com/SylphxAI/vex/commit/cc269b06a29b20cff7072c606f12ad6cde498064))
- **vex:** add monomorphic path for array validation ([9e19743](https://github.com/SylphxAI/vex/commit/9e197430ad159c8aa22d5aa3a56d6375f250fd21))
- **vex:** remove optional chaining in pipe hot loop ([64550e9](https://github.com/SylphxAI/vex/commit/64550e92b1bc2c86a8fea141561fa4b04fdcf699))
- **vex:** cache digit regex in IPv4 validator ([b376669](https://github.com/SylphxAI/vex/commit/b37666992de42574da6506dcf408bb1149d20571))
- **vex:** cache TextEncoder instance in bytes validators ([551d5df](https://github.com/SylphxAI/vex/commit/551d5df58273ee39bcd8871ad0f85b282e1a9e64))
- **vex:** add monomorphic path for tuple validation ([6d71caa](https://github.com/SylphxAI/vex/commit/6d71caa2363a1a2546f55a6729db8db81d84b321))
- **vex:** replace object spread with Object.assign in intersect ([2fb1a95](https://github.com/SylphxAI/vex/commit/2fb1a954c42aaaa31919cb5c8ccbc518b2253f0e))
- **vex:** eliminate array spread in text validators ([9d5f786](https://github.com/SylphxAI/vex/commit/9d5f78699f33225a64e36454cf741083602b1486))
- **vex:** cache hash validator regex patterns ([28591e3](https://github.com/SylphxAI/vex/commit/28591e3629e5c637c51733d85374ee7ca1a7cc22))
- **vex:** implement lazy metadata merging in pipe ([8935454](https://github.com/SylphxAI/vex/commit/8935454b3c0863c7b9227bf671f122f2b2293e31))
- **vex:** optimize object validation with monomorphic path ([2c98888](https://github.com/SylphxAI/vex/commit/2c98888024ddf747788feadf20ed9334f6f24de6))
- **vex:** add getErrorMsg helper to reduce code duplication ([1f3e54d](https://github.com/SylphxAI/vex/commit/1f3e54d11e525eacac62b3fc98f2a9d402633c21))
- **vex:** cache Intl.Segmenter instances for text validators ([36da554](https://github.com/SylphxAI/vex/commit/36da5548eef7e4ecd89397eb87db57d9c32658b0))

### ♻️ Refactoring

- **vex:** extract separateMetaActions to core ([887acaa](https://github.com/SylphxAI/vex/commit/887acaab3f0050f9f74afc9aa0847b0e6a29cf6a))
- **vex:** use getErrorMsg helper across schemas and composition ([251eb05](https://github.com/SylphxAI/vex/commit/251eb05434e3840512f4d5951aa6570ccfc6f8ae))

### 📚 Documentation

- update benchmark results in READMEs ([be420e7](https://github.com/SylphxAI/vex/commit/be420e7b9798b8aba2a37981da2216cb95770119))
- **vex:** deprecate nonEmpty alias in favor of nonempty ([071511d](https://github.com/SylphxAI/vex/commit/071511ddde5c00e4c1aae2ac2da629c7470499f0))

### ✅ Tests

- **vex:** expand benchmark suite with comprehensive feature coverage ([afd4f5b](https://github.com/SylphxAI/vex/commit/afd4f5bbcf06dfed23e4d9519f32393037567df7))
- **vex:** additional edge case tests for near-100% coverage ([efb6d32](https://github.com/SylphxAI/vex/commit/efb6d321e5414c0ba79eba4242486815877c158a))
- **vex:** comprehensive tests for 100% coverage ([bd2f3bb](https://github.com/SylphxAI/vex/commit/bd2f3bb6f89de8576289f7efe066940c35dfd9a9))

### 📦 Build

- **vex:** migrate from bun build + tsc to bunup ([89ec89a](https://github.com/SylphxAI/vex/commit/89ec89af8031601d6e55f515b5c61fb3299622a5))

### 🔧 Chores

- **vex:** update dependencies and auto-format imports ([c17518b](https://github.com/SylphxAI/vex/commit/c17518bc84e2997fa34e14e9f701aca3f3d727a0))

## 0.1.6 (2025-12-01)

### ✨ Features

- **vex:** MetaAction pattern for consistent metadata API ([362f633](https://github.com/SylphxAI/vex/commit/362f633830a0947fca6157fd46ae7aac581d93fd))

## 0.1.5 (2025-12-01)

### ♻️ Refactoring

- **vex:** unified metadata system ([88d6fe0](https://github.com/SylphxAI/vex/commit/88d6fe0f2a21174541b6bee56d70e6fb771bc8f2))

### ✅ Tests

- **vex:** comprehensive metadata/description tests ([a1fa15e](https://github.com/SylphxAI/vex/commit/a1fa15ea97c4e17c08b6eea25c0ca7801a2ed1dd))

## 0.1.4 (2025-12-01)

### 🐛 Bug Fixes

- add prepack script to build before publish ([9770166](https://github.com/SylphxAI/vex/commit/9770166201f49275ddd834b467c712c4ea59adda))
- consolidate biome config at root level ([b5ec7fd](https://github.com/SylphxAI/vex/commit/b5ec7fda2f7e77555007017e61b371e7684f02d1))
- configure biome to allow non-null assertions and control chars in regex ([553ee31](https://github.com/SylphxAI/vex/commit/553ee31dbe6a3f9f29a59ea7a2db535bd65fa81c))
- remove biome.json (use @sylphx/biome-config) ([bed54e9](https://github.com/SylphxAI/vex/commit/bed54e95ef1335f8d77efbaaa3f4b60bda2a1491))

## 0.1.3 (2025-12-01)

### ✨ Features

- **vex:** factory pattern API for validators ([08e7f73](https://github.com/SylphxAI/vex/commit/08e7f73176cfb0df7606452a65ed739255f5f4a9))

### 📚 Documentation

- **vex:** add JSON Schema conversion documentation ([6c7b336](https://github.com/SylphxAI/vex/commit/6c7b336b6401bfd15b57fdd2149c6e56cfc297be))
- **vex:** comprehensive README rewrite with clear usage examples ([91192ff](https://github.com/SylphxAI/vex/commit/91192ffc7c367996c20f474a88539b7d3eb21338))

## 0.1.2 (2025-11-30)

### ✨ Features

- **vex:** complete Valibot parity with JIT optimizations (#4) ([0effd01](https://github.com/SylphxAI/vex/commit/0effd012d257908ae43fbb3a1d6ae7300dd67fa4))

### 🐛 Bug Fixes

- **vex:** TypeScript errors and lint issues ([54665bb](https://github.com/SylphxAI/vex/commit/54665bba76bdfe77e776cfbef73e2caeee34d4f1))

### ♻️ Refactoring

- **vex:** modular architecture with colocated tests ([86d251a](https://github.com/SylphxAI/vex/commit/86d251a8220b1806f47d78187f3311b9c37dd936))

### 📚 Documentation

- **vex:** update README with accurate benchmark numbers ([abb7e64](https://github.com/SylphxAI/vex/commit/abb7e6411fc7b94043bc5a029f5eea28525109bd))

### 🔧 Chores

- **vex:** cleanup unused code ([dc9995a](https://github.com/SylphxAI/vex/commit/dc9995a98069aef650521deecd35e5b23c88fe6c))

## 0.1.1 (2025-11-30)

### ✨ Features

- add Standard Schema v1 support ([1c95364](https://github.com/SylphxAI/vex/commit/1c95364e3d0699be361419504555d537a31aa473))

## 0.1.0 (2025-11-30)

### ♻️ Refactoring

- consolidate to @sylphx/vex with accurate benchmarks ([5d96162](https://github.com/SylphxAI/vex/commit/5d96162804f8d6663133cc5731c0a2c5767f08a7))

### 🔧 Chores

- setup @sylphx/doctor tooling ([92e6327](https://github.com/SylphxAI/vex/commit/92e6327f08dc6ff8c4a8650257602c076123f72d))
