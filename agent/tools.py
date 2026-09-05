import os
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
        res = requests.post(
            BACKEND_URL,
            json={"foodIdOrName": food_id, "quantity": quantity, "unitName": unit},
            headers=self.headers,
            timeout=10,
        )
        if res.status_code == 201:
            return f"Success! The meal ID is {res.json()['id']}."
        return f"Failed: {res.json().get('error', 'backend request failed')}"

    @function_tool
    async def edit_meal(
        self, context: RunContext, meal_id: str, new_quantity: float, new_unit: str
    ):
        """Edit an existing meal by its exact meal ID."""
        res = requests.put(
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
        res = requests.delete(
            f"{BACKEND_URL}/{meal_id}", headers=self.headers, timeout=10
        )
        return (
            "Deleted successfully."
            if res.status_code == 200
            else f"Failed to delete: {res.json().get('error', 'backend request failed')}"
        )
        
    def get_current_meals(self) -> str:
        res = requests.get(BACKEND_URL, headers=self.headers)
        return str(res.json()) if res.status_code == 200 else "[]"