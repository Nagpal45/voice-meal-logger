import json
import asyncio
import urllib.request
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero
from tools import MealLogger

# Fetch foods.json remotely or locally to inject into Prompt
try:
    with open("../backend/foods.json", "r") as f:
        food_db = json.load(f)
except FileNotFoundError:
    # Fallback for Docker environment
    url = "https://raw.githubusercontent.com/voice-meal-logger/backend/foods.json"
    food_db = {"foods": []} # In production, map a volume or copy foods.json into the agent docker folder.

allowed_foods = [f"ID: {f['id']}, Name: {f['name']}, Units: {[u['name'] for u in f['units']]}" for f in food_db.get("foods", [])]
food_context = "\n".join(allowed_foods)

async def entrypoint(ctx: JobContext):
    # Extract anonymous user_id from token
    user_id = "default-user" 
    if ctx.room.name and ctx.room.name.startswith("room-"):
        user_id = ctx.room.name.replace("room-", "")

    fnc_ctx = MealLogger(user_id=user_id)
    current_meals = fnc_ctx.get_current_meals()

    system_prompt = f"""
    You are a voice assistant for logging meals. 
    1. You can ONLY log foods from this list:
    {food_context}
    2. To Edit/Delete, use the exact '_id' from the user's current meals:
    {current_meals}
    """

    agent = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=openai.STT(),
        llm=openai.LLM(),
        tts=openai.TTS(),
        fnc_ctx=fnc_ctx,
        chat_ctx=llm.ChatContext().append(role="system", text=system_prompt)
    )

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    agent.start(ctx.room)
    await agent.say("Hi! What did you have to eat?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))