# Auth JWT Backend

## Setup
npm install
cp .env.example .env
# Fill in .env values
npm run dev

## API Routes
POST /api/v1/register
POST /api/v1/verify/:token
POST /api/v1/login
POST /api/v1/verify
GET  /api/v1/me
POST /api/v1/refresh
POST /api/v1/logout
POST /api/v1/refresh-csrf