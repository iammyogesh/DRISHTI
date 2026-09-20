---
name: OpenAPI integer compatibility
description: OpenAPI integer schemas can generate zod.int(), which is incompatible with this workspace's installed Zod runtime.
---

When adding numeric fields to the shared OpenAPI contract, prefer number unless integer-specific validation is required and the Zod generator/runtime versions have been aligned.

**Why:** The current generated Zod package uses Zod 3 while the generator emits the newer zod.int() helper for OpenAPI integer fields, causing the library typecheck to fail after codegen.

**How to apply:** After every OpenAPI change, run codegen and the library typecheck; if zod.int() appears, use number in the contract or deliberately upgrade and verify the Zod toolchain.