# Devlog

Devlog is a full-stack developer publishing platform. Authors can create an account, write Markdown stories, save private drafts, publish articles with technology tags, and share a public profile. Readers can browse the community feed, search stories, and filter by topic.

## Stack

- React 19, Vite, React Router, and Lucide
- Node.js, Express 5, and Mongoose
- MongoDB, JWT, and bcryptjs
- React Markdown and Prism syntax highlighting

## Requirements

- Node.js 22+
- MongoDB running locally or a MongoDB connection string

## Run locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a unique `JWT_SECRET` (at least 32 characters).
3. Start the API and Vite development server: `npm run dev`
4. Open the URL printed by Vite (normally `http://localhost:5173`).

The Vite development server proxies `/api` requests to the Express port configured by `PORT` (default `5000`). For production, build the frontend with `npm run build` and run the API with `npm start`. Set `VITE_API_URL` at build time to the API base URL, including `/api` (for example, `https://api.example.com/api`), and set `CLIENT_ORIGIN` on the API to the frontend's origin. If the frontend and API share an origin, leave `VITE_API_URL` unset and configure the web server to forward `/api` requests to Express.

### Deploy to Vercel

Set the Vercel project root directory to `Project1`. The Vercel functions under `api/` serve the Express API and connect to MongoDB, so the frontend and API deploy together and the default `/api` URL works without `VITE_API_URL`. Add `MONGODB_URI` for a publicly reachable MongoDB database (not `localhost` or `127.0.0.1`) and `JWT_SECRET` (a unique random value of at least 32 characters) under the Vercel project's environment variables, then redeploy. Ensure your database allows connections from Vercel. Do not use the local `.env` values in production.

## API

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create an account |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT |
| `GET` | `/api/auth/me` | Authenticated | Load the current account |
| `GET` | `/api/blogs?q=&tag=&page=&limit=` | Public | Search and paginate published stories |
| `GET` | `/api/blogs/:slug` | Public / owner | Read a published story or your own draft |
| `GET` | `/api/blogs/mine` | Authenticated | List your stories and drafts |
| `POST` | `/api/blogs` | Authenticated | Create a draft or published story |
| `PATCH` | `/api/blogs/:id` | Owner | Update a story |
| `DELETE` | `/api/blogs/:id` | Owner | Delete a story |
| `GET` | `/api/users/:username` | Public | Read an author profile and published stories |
| `PATCH` | `/api/users/me` | Authenticated | Update your profile name and bio |

Authenticated API requests use `Authorization: Bearer <token>`. API errors return a JSON `message`; the client displays them alongside the relevant form or page.

If a host returns a non-JSON 404 instead of forwarding an API request, the client reports the missing endpoint and `VITE_API_URL` configuration.

## Quality checks

- `npm run lint`
- `npm run build`
- `npm audit`
