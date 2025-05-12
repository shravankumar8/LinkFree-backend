# LinkFree Backend

The backend API for the LinkFree project, powering user authentication and profile management.

## Tech Stack
- Node.js
- Express
- Prisma
- PostgreSQL

## Setup
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in the values (see [Environment Variables](#environment-variables))
3. Run database migrations: `npx prisma migrate dev`
4. Start the server: `npm start`