#!/bin/bash
# Load local environment variables
set -a
source .env.local
set +a

# Run scraper
npm run dev:scraper 