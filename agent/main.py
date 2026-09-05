import json
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    JobContext,
    TurnHandlingOptions,
    cli,
    inference,
)
from livekit.plugins import silero
from tools import MealLogger

load_dotenv()

# --- 1. Load Foods Database ---
try:
    foods_path = Path(__file__).resolve().parent.parent / "backend" / "foods.json"
    with foods_path.open() as f:
        food_db = json.load(f)
except FileNotFoundError:
    food_db = {"foods": []}

allowed_foods = [f"ID: {f['id']}, Name: {f['name']}, Units: {[u['name'] for u in f['units']]}" for f in food_db.get("foods", [])]
food_context = "\n".join(allowed_foods)

# --- 2. Define Custom Agent Class ---
class MealAssistant(Agent):
    def __init__(self, current_meals: str, tools: MealLogger) -> None:
        system_prompt = f"""
        You are a helpful voice assistant for logging meals. 
        1. You can ONLY log foods from this list:
        {food_context}
        2. To Edit/Delete, use the exact '_id' from the user's current meals:
        {current_meals}
        3. Use a tool for every log, edit, or delete. Never claim that a change succeeded unless the tool reports success.
        4. If a food, quantity, unit, or meal is ambiguous, ask a short clarifying question instead of guessing.
        5. After a successful change, briefly confirm what changed.
        """
        
        super().__init__(
            instructions=system_prompt,
            tools=[tools.log_meal, tools.edit_meal, tools.delete_meal],
        )

# --- 3. Setup Agent Server ---
server = AgentServer()

@server.rtc_session(agent_name="meal-agent")
async def meal_agent(ctx: JobContext):
    # Extract anonymous user_id
    user_id = "default-user" 
    if ctx.room.name and ctx.room.name.startswith("room-"):
        user_id = ctx.room.name.replace("room-", "")

    # Initialize tools with user context
    fnc_ctx = MealLogger(user_id=user_id)
    current_meals = fnc_ctx.get_current_meals()

    # --- 4. Create the Session ---
    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
        ),
        vad=silero.VAD.load(),
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
        ),
    )

    assistant = MealAssistant(current_meals=current_meals, tools=fnc_ctx)

    await session.start(
        room=ctx.room,
        agent=assistant,
    )

    # Instruct the agent to speak first
    await session.generate_reply(instructions="Say hi and ask what they had to eat today.")

if __name__ == "__main__":
    cli.run_app(server)