import os
import requests
from livekit.agents import llm
from typing import Annotated

# Use Docker internal network URL if available, else localhost
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000/api/meals")

class MealLogger(llm.FunctionContext):
    def __init__(self, user_id: str):
        super().__init__()
        self.headers = {"X-User-ID": user_id}

    @llm.ai_callable(description="Log a new meal.")
    def log_meal(self, food_id: str, quantity: float, unit: str):
        res = requests.post(BACKEND_URL, json={"foodIdOrName": food_id, "quantity": quantity, "unitName": unit}, headers=self.headers)
        if res.status_code == 201:
            return f"Success! The meal ID is {res.json()['id']}."
        return f"Failed: {res.json().get('error')}"

    @llm.ai_callable(description="Edit an existing meal log by its _id.")
    def edit_meal(self, meal_id: str, new_quantity: float, new_unit: str):
        res = requests.put(f"{BACKEND_URL}/{meal_id}", json={"quantity": new_quantity, "unitName": new_unit}, headers=self.headers)
        return "Edited successfully." if res.status_code == 200 else "Failed to edit."

    @llm.ai_callable(description="Delete a meal log by its _id.")
    def delete_meal(self, meal_id: str):
        res = requests.delete(f"{BACKEND_URL}/{meal_id}", headers=self.headers)
        return "Deleted successfully." if res.status_code == 200 else "Failed to delete."
        
    def get_current_meals(self) -> str:
        res = requests.get(BACKEND_URL, headers=self.headers)
        return str(res.json()) if res.status_code == 200 else "[]"