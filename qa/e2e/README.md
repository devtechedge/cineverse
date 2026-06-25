# E2E tests (Playwright)

```bash
cd frontend
npm install
npx playwright install
BASE_URL=http://localhost:3000 npx playwright test --config=../qa/e2e/playwright.config.ts
```

Add a `fixtures/sample.mp4` (≤5 MB) at `qa/e2e/fixtures/sample.mp4` before running the upload flow.
