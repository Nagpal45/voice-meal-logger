# Voice Meal Logger

A small end-to-end voice meal logging app. A user speaks to a LiveKit Agent, the agent validates foods against `backend/foods.json`, and the MERN backend persists meal logs in MongoDB. The React page updates through Server-Sent Events.

## Requirements

- Docker Desktop or Docker Engine with Compose
- A LiveKit Cloud project
- LiveKit API key and API secret

The agent uses LiveKit Inference for speech-to-text, language-model, and text-to-speech access. No OpenAI billing key is required for the current implementation.

## Configuration

Create `.env` in the repository root:

```env
PORT=5000
MONGO_URI=mongodb://mongo:27017/voice-meals
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

`VITE_LIVEKIT_URL` and `VITE_API_URL` are supplied by `docker-compose.yaml`. Do not commit `.env` or real credentials.

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:5173. The backend is available at http://localhost:5000.

To stop the stack:

```bash
docker compose down
```

MongoDB data is stored in the `mongo-data` Docker volume and survives container restarts.

## Run locally without Docker for the app services

Start MongoDB separately, then use three terminals:

```bash
npm --prefix backend install
node backend/server.js
```

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

```bash
python3 -m pip install -r agent/requirements.txt
python3 agent/main.py dev
```

The local agent expects `BACKEND_URL=http://localhost:5000/api/meals`. The Docker Compose configuration supplies the internal equivalent automatically.

## Deploy publicly for free

Use Vercel for the React frontend, a Render **Free Web Service** for the Express API, MongoDB Atlas for persistence, and LiveKit Cloud for realtime rooms, LiveKit Inference, and the agent worker.

### 1. Prepare services

Create accounts/projects on:

- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [LiveKit Cloud](https://cloud.livekit.io/)
- [Vercel](https://vercel.com/)
- [Render](https://render.com/)

In MongoDB Atlas, create a database user, allow the deployment service to connect, and copy the connection string. In LiveKit Cloud, copy the project URL, API key, and API secret.

Rotate any credentials that were previously stored in a local `.env` before using the deployment.

### 2. Deploy the backend on Render

Create a **Web Service** from the GitHub repository with these settings:

```text
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: node server.js
```

Add these Render environment variables:

```text
PORT=10000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/voice-meals
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

Render provides a public URL such as `https://voice-meal-api.onrender.com`. Keep this URL for the Vercel setup. The backend must be reachable over HTTPS because browsers restrict microphone and SSE usage on insecure public origins.

### 3. Deploy the agent to LiveKit Cloud

Install the LiveKit CLI:

```bash
curl -sSL https://get.livekit.io/cli | bash
```

Authenticate and select your LiveKit project:

```bash
lk cloud auth
```

From the repository root, deploy the agent using the LiveKit agent deployment flow:

```bash
lk agent create
```

When prompted, use `meal-agent` as the agent name. Configure the deployment to use the repository root as its build context and `agent/Dockerfile` as its Dockerfile. This is important because the Dockerfile copies both the agent source and `backend/foods.json`.

Add these LiveKit Cloud agent secrets/environment variables:

```text
BACKEND_URL=https://voice-meal-api.onrender.com/api/meals
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

The LiveKit agent deployment logs must show `registered worker` with `agent_name` set to `meal-agent`. LiveKit Cloud provides the worker runtime; the exact free-plan usage limits are shown in the LiveKit project dashboard.

### 4. Deploy the frontend on Vercel

Import the repository into Vercel and set:

```text
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Add these Vercel environment variables for Production, Preview, and Development:

```text
VITE_API_URL=https://voice-meal-api.onrender.com
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

Redeploy after adding or changing `VITE_*` variables because Vite embeds them during the build. Never put LiveKit API secrets or MongoDB credentials in Vercel variables prefixed with `VITE_`; those variables are sent to the browser.

### 5. Test the public deployment

Open the Vercel URL over HTTPS, allow microphone access, and start the voice agent. In the LiveKit agent logs, confirm a job appears after the browser requests a token:

```text
received job request
agent_name: meal-agent
```

Test the backend token route:

```bash
curl -H "X-User-ID: deploy-test" \
	https://voice-meal-api.onrender.com/api/livekit-token
```

The response must contain a non-empty JWT string. Keep the Render agent logs open while testing log, edit, and delete requests.

## Architecture

- `frontend`: React/Vite client. It requests a user-scoped LiveKit token, joins the room, publishes microphone audio, renders agent audio, and refreshes meals through SSE.
- `backend`: Express API and LiveKit token service. It creates the user room and explicitly dispatches `meal-agent`, validates food/unit/quantity input, calculates macros, and persists documents with Mongoose.
- `agent`: Python LiveKit Agents 1.x worker. It uses LiveKit Inference for STT, LLM, TTS, and turn detection. Its three function tools call the backend for log, edit, and delete operations.
- `mongo`: Persistent MongoDB service.

The room name is `room-<user-id>`. The user ID is an anonymous UUID stored in browser local storage and is passed to the backend through `X-User-ID`.

## Supported behavior

- Log foods present in `foods.json`, using only their listed household units.
- Edit quantity and unit using the exact meal ID supplied in the agent context.
- Delete a meal using the exact meal ID supplied in the agent context.
- Reject unknown foods, unknown units, zero/negative quantities, and malformed requests.

## Testing and debugging

Useful checks:

```bash
node --check backend/server.js
python3 -m py_compile agent/main.py agent/tools.py
npm --prefix frontend run build
docker compose config --quiet
docker compose logs -f agent
```

When the browser connects, the agent log should show `received job request`. If it does not, inspect the token endpoint and LiveKit dispatch configuration. Microphone or room errors are shown in the frontend card.

## Known limitations

- The anonymous browser UUID is not authentication; a production app would add real user authentication and authorization.
- The current agent context is loaded when a session starts. For a long-running session, a more advanced implementation could refresh meal context after every mutation.
- There are no automated browser tests yet. The API and build paths have been manually validated, and the Docker services are exercised through their health/log output.
- LiveKit Inference availability and quotas are controlled by the LiveKit project. The app cannot compensate for a disabled or exhausted project allowance.
