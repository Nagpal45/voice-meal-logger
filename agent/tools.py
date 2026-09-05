import os
import asyncio
import requests
from livekit.agents import RunContext
from livekit.agents.llm import function_tool

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000/api/meals")

class MealLogger:
    def __init__(self, user_id: str):
        self.headers = {"X-User-ID": user_id}

    @function_tool
    async def log_meal(self, context: RunContext, food_id: str, quantity: float, unit: str):
        """Log a meal using a food and unit from the allowed foods list."""
        res = await asyncio.to_thread(
            requests.post,
            BACKEND_URL,
            json={"foodIdOrName": food_id, "quantity": quantity, "unitName": unit},
            headers=self.headers,
            timeout=10,
        )
        if res.status_code == 201:
            # Tell the LLM the new ID so it remembers it, but forbid it from speaking it
            new_id = res.json()['id']
            return f"Success! The meal ID is {new_id}. NEVER read this ID to the user."
        return f"Failed: {res.json().get('error', 'backend request failed')}"

    @function_tool
    async def edit_meal(
        self, context: RunContext, meal_id: str, new_quantity: float, new_unit: str
    ):
        """Edit an existing meal by its exact meal ID."""
        res = await asyncio.to_thread(
            requests.put,
            f"{BACKEND_URL}/{meal_id}",
            json={"quantity": new_quantity, "unitName": new_unit},
            headers=self.headers,
            timeout=10,
        )
        return (
            "Edited successfully."
            if res.status_code == 200
            else f"Failed to edit: {res.json().get('error', 'backend request failed')}"
        )

    @function_tool
    async def delete_meal(self, context: RunContext, meal_id: str):
        """Delete a meal by its exact meal ID."""
        res = await asyncio.to_thread(
            requests.delete,
            f"{BACKEND_URL}/{meal_id}",
            headers=self.headers,
            timeout=10,
        )
        return (
            "Deleted successfully."
            if res.status_code == 200
            else f"Failed to delete: {res.json().get('error', 'backend request failed')}"
        )
        
    async def get_current_meals(self) -> str:
        res = await asyncio.to_thread(
            requests.get,
            BACKEND_URL,
            headers=self.headers,
            timeout=10,
        )
        if res.status_code != 200:
            return "No meals are currently logged."
            
        meals = res.json()
        if not meals:
            return "No meals are currently logged."
            
        # Format cleanly so the LLM understands exactly which ID belongs to which food
        formatted_meals = "\n".join([f"- [ID: {m['_id']}] {m['foodName']}: {m['quantity']} {m['unit']}" for m in meals])
        return formatted_meals