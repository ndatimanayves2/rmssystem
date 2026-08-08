# Deployment & Git Push — Task Plan

## Objective
Make the deployment work well with Docker, then push all changes to frontend and backend on `origin/main`.

## Steps
- [x] 1. Create `backend/.env.example` committed template
- [x] 2. Create `ai-module/.env.example` committed template
- [x] 3. Create root `.gitignore` to exclude local artifacts
- [x] 4. Validate production builds (frontend/backend/ai-module)
- [ ] 5. Run full `docker compose up --build -d` to test deployment
- [ ] 6. Verify services are healthy (backend /health, frontend, ai-module)
- [ ] 7. Stage, commit & push all changes to `origin/main`
