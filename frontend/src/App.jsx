import React, { useEffect, useState } from "react";
import { useMeals } from "./hooks/useMeals";
import MealList from "./components/MealList";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
} from "@livekit/components-react";

const API_URL = import.meta.env.VITE_API_URL;

function AgentStatus() {
  const { state, audioTrack } = useVoiceAssistant();
  const statusMap = {
    listening: "Listening...",
    speaking: "Speaking...",
    thinking: "Thinking...",
  };

  return (
    <div>
      <h3 style={{ color: "#374151" }}>{statusMap[state] || "Connected"}</h3>
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
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, [userId]);

  const { meals, isLoading } = useMeals(userId);

  return (
    <div className="container">
      <h1>🎙️ Voice Meal Logger</h1>

      <div className="agent-card">
        {!connected ? (
          <button className="btn-primary" onClick={() => setConnected(true)}>
            🎤 Start Voice Agent
          </button>
        ) : (
          <LiveKitRoom
            serverUrl={import.meta.env.VITE_LIVEKIT_URL}
            token={token}
            connect={true}
            audio={true}
            onDisconnected={() => setConnected(false)}
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
