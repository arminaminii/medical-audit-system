# Task 3 - API Developer Work Record

## Task: Create API routes for centers search and audit submission

### Files Created

1. **`/home/z/my-project/src/app/api/centers/route.ts`** — GET handler for searching/filtering/paginating medical centers
   - Keyword search (`q`) across `name`, `displayName`, `address` using Prisma `contains`
   - Exact filters: `province`, `city`, `type`, `isOnline`
   - Pagination with `page` (default 1) and `limit` (default 20, max 100)
   - Returns `{ data, total, page, limit, totalPages }`
   - Parallel count + find queries for performance

2. **`/home/z/my-project/src/app/api/centers/filters/route.ts`** — GET handler for distinct filter values
   - Returns `{ provinces: string[], cities: string[], types: string[] }`
   - Uses `distinct` + `select` queries in parallel
   - Results sorted alphabetically

3. **`/home/z/my-project/src/app/api/audits/route.ts`** — POST handler for creating audits
   - Validates `centerId` exists in DB (404 if not)
   - Validates `visitDate` is present and matches YYYY-MM-DD format
   - Validates `formData` is valid JSON containing all required sections
   - Returns `{ success, id, message }` with 201 status on success
   - Comprehensive error handling with Persian error messages