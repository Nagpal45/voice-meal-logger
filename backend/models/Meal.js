const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  foodId: { type: String, required: true },
  foodName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  macros: {
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true }
  },
  loggedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meal', mealSchema);