import os
import asyncio
import requests
from livekit.agents import RunContext
from livekit.agents.llm import function_tool

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000/api/meals")

class MealLogger:
    def __init__(self, user_id: str):
        self.headers = {"X-User-ID": user_id}
        self.meals = []

    def _resolve_meal(self, meal_reference: str):
        reference = meal_reference.strip().lower()
        matches = [
            meal
            for meal in self.meals
            if reference in {
                str(meal.get("foodId", "")).lower(),
                str(meal.get("foodName", "")).lower(),
            }
        ]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            return "Multiple meals match that food. Ask the user which one they mean."
        return "No meal matches that food. Ask the user to clarify."

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
            return "Meal logged successfully."
        return f"Failed: {res.json().get('error', 'backend request failed')}"

    @function_tool
    async def edit_meal(
        self, context: RunContext, meal_reference: str, new_quantity: float, new_unit: str
    ):
        """Edit a meal by its food name. Never ask for or reveal database IDs."""
        meal = self._resolve_meal(meal_reference)
        if isinstance(meal, str):
            return meal
        res = await asyncio.to_thread(
            requests.put,
            f"{BACKEND_URL}/{meal['_id']}",
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
    async def delete_meal(self, context: RunContext, meal_reference: str):
        """Delete a meal by its food name. Never ask for or reveal database IDs."""
        meal = self._resolve_meal(meal_reference)
        if isinstance(meal, str):
            return meal
        res = await asyncio.to_thread(
            requests.delete,
            f"{BACKEND_URL}/{meal['_id']}",
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
            self.meals = []
            return "No meals are currently logged."

        self.meals = res.json()
        if not self.meals:
            return "No meals are currently logged."

        return "\n".join(
            f"- {meal['foodName']}: {meal['quantity']} {meal['unit']}"
            for meal in self.meals
        )