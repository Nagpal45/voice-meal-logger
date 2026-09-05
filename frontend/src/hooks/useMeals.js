import { useState, useEffect, useCallback } from 'react';

export function useMeals(userId) {
  const [meals, setMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/meals', {
        headers: { 'X-User-ID': userId }
      });
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
    const eventSource = new EventSource(`http://localhost:5000/api/events?userId=${userId}`);
    
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