import React, { useEffect, useState } from "react";
import { useMeals } from "./hooks/useMeals";
import MealList from "./components/MealList";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
} from "@livekit/components-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AgentStatus() {
  const { agent, state, audioTrack } = useVoiceAssistant();
  const statusMap = {
    listening: "Listening...",
    speaking: "Speaking...",
    thinking: "Thinking...",
  };

  return (
    <div>
      <h3 style={{ color: "#374151" }}>
        {agent ? statusMap[state] || "Connected to assistant" : "Waiting for assistant..."}
      </h3>
      <div
        style={{
          height: "40px",
          background: "#f3f4f6",
          borderRadius: "8px",
          margin: "10px auto",
          width: "80%",
        }}
      >
        {audioTrack && (
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barColor="#3b82f6"
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let id = localStorage.getItem("userId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("userId", id);
    }
    setUserId(id);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_URL}/api/livekit-token`, { headers: { "X-User-ID": userId } })
      .then((res) => {
        if (!res.ok) throw new Error(`Token request failed (${res.status})`);
        return res.json();
      })
      .then((data) => setToken(data.token))
      .catch((requestError) => setError(requestError.message));
  }, [userId]);

  const { meals, isLoading } = useMeals(userId);

  return (
    <div className="container">
      <h1>🎙️ Voice Meal Logger</h1>

      <div className="agent-card">
        {error && <p role="alert">{error}</p>}
        {!connected ? (
          <button
            className="btn-primary"
            onClick={() => setConnected(true)}
            disabled={!token}
          >
            {token ? "🎤 Start Voice Agent" : "Preparing voice agent..."}
          </button>
        ) : (
          <LiveKitRoom
            serverUrl={import.meta.env.VITE_LIVEKIT_URL}
            token={token}
            connect={connected && Boolean(token)}
            audio={true}
            onConnected={() => setError("")}
            onDisconnected={() => setConnected(false)}
            onError={(roomError) => setError(`LiveKit connection failed: ${roomError.message}`)}
            onMediaDeviceFailure={() =>
              setError("Microphone access failed. Allow microphone access and try again.")
            }
          >
            <RoomAudioRenderer />
            <AgentStatus />
            <button className="btn-danger" onClick={() => setConnected(false)}>
              Disconnect
            </button>
          </LiveKitRoom>
        )}
      </div>

      <h2 style={{ marginTop: "30px", color: "#111827" }}>Today's Meals</h2>
      <MealList meals={meals} isLoading={isLoading} />
    </div>
  );
}
