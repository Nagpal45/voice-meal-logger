import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useMeals(userId) {
  const [meals, setMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/meals`, {
        headers: { 'X-User-ID': userId }
      });
      if (!res.ok) throw new Error(`Meal request failed (${res.status})`);
      const data = await res.json();
      setMeals(data);
    } catch (error) {
      console.error("Failed to fetch meals", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchMeals(); // Initial load

    // Listen for Server-Sent Events
    const eventSource = new EventSource(`${API_URL}/api/events?userId=${encodeURIComponent(userId)}`);
    
    eventSource.onmessage = () => {
      console.log("Backend triggered an update. Refreshing meals...");
      fetchMeals();
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [userId, fetchMeals]);

  return { meals, isLoading };
}