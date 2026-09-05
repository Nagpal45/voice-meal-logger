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
