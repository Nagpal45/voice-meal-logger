import React from "react";

export default function MealList({ meals, isLoading }) {
  if (isLoading) return <p style={{ textAlign: "center" }}>Loading meals...</p>;
  if (meals.length === 0)
    return (
      <p style={{ textAlign: "center", color: "#6b7280" }}>
        No meals logged today.
      </p>
    );

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.macros.calories,
      protein: acc.protein + meal.macros.protein,
      carbs: acc.carbs + meal.macros.carbs,
      fat: acc.fat + meal.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Food</th>
            <th>Qty</th>
            <th>Cal</th>
            <th>Pro (g)</th>
            <th>Carbs (g)</th>
            <th>Fat (g)</th>
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => (
            <tr key={meal._id}>
              <td style={{ textTransform: "capitalize" }}>{meal.foodName}</td>
              <td>
                {meal.quantity} {meal.unit}
              </td>
              <td>{meal.macros.calories}</td>
              <td>{meal.macros.protein}</td>
              <td>{meal.macros.carbs}</td>
              <td>{meal.macros.fat}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan="2">TOTAL</td>
            <td>{totals.calories}</td>
            <td>{totals.protein.toFixed(1)}</td>
            <td>{totals.carbs.toFixed(1)}</td>
            <td>{totals.fat.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
