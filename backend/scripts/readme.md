# Local development
   
## Start API and DB in Docker
```npm run dev:api:local```

Run scraper locally (not in Docker)
```./scripts/run-scraper.sh```

Access local endpoints:
- API: http://localhost:3001
- DB: localhost:5432
- Prisma Studio: ```npm run db:studio```

# Create/apply migrations locally
npm run db:migrate

# Reset local database
npm run db:reset

# Stop and remove containers
npm run docker:down