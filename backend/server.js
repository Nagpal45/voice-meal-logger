const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const { AccessToken } = require('livekit-server-sdk');

const Meal = require('./models/Meal');
const foodsData = JSON.parse(fs.readFileSync('./foods.json', 'utf8'));

const app = express();
app.use(cors());
app.use(express.json());

// --- SSE Setup ---
const clients = new Map();
app.get('/api/events', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  clients.set(userId, res);
  req.on('close', () => clients.delete(userId));
});

const notifyUser = (userId) => {
  const client = clients.get(userId);
  if (client) client.write('data: update\n\n');
};

// --- Middleware ---
const requireUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(400).json({ error: 'X-User-ID required' });
  req.userId = userId;
  next();
};

// --- Macro Calculation Math ---
const calculateMacros = (foodIdOrName, quantity, unitName) => {
  const food = foodsData.foods.find(f => 
    f.id === foodIdOrName.toLowerCase() || 
    f.name.toLowerCase() === foodIdOrName.toLowerCase() ||
    f.aliases.some(alias => alias.toLowerCase() === foodIdOrName.toLowerCase())
  );
  if (!food) return null;

  const unit = food.units.find(u => u.name === unitName.toLowerCase());
  if (!unit) return null;

  const totalGrams = quantity * unit.grams;
  const multiplier = totalGrams / 100;

  return {
    foodId: food.id,
    foodName: food.name,
    unit: unit.name,
    macros: {
      calories: Math.round(food.macrosPer100g.calories * multiplier),
      protein: Math.round(food.macrosPer100g.protein * multiplier * 10) / 10,
      carbs: Math.round(food.macrosPer100g.carbs * multiplier * 10) / 10,
      fat: Math.round(food.macrosPer100g.fat * multiplier * 10) / 10
    }
  };
};

// --- Routes ---
app.get('/api/livekit-token', requireUser, (req, res) => {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: `user-${req.userId}`,
  });
  at.addGrant({ roomJoin: true, room: `room-${req.userId}`, canPublish: true, canSubscribe: true });
  res.json({ token: at.toJwt() });
});

app.get('/api/meals', requireUser, async (req, res) => {
  const meals = await Meal.find({ userId: req.userId }).sort({ loggedAt: -1 });
  res.json(meals);
});

app.post('/api/meals', requireUser, async (req, res) => {
  const { foodIdOrName, quantity, unitName } = req.body;
  const foodData = calculateMacros(foodIdOrName, quantity, unitName);
  
  if (!foodData) return res.status(400).json({ error: 'Invalid food or unit according to foods.json' });

  const meal = new Meal({ userId: req.userId, quantity, ...foodData });
  await meal.save();
  notifyUser(req.userId);
  res.status(201).json({ success: true, id: meal._id });
});

app.put('/api/meals/:id', requireUser, async (req, res) => {
  const { quantity, unitName } = req.body;
  const meal = await Meal.findOne({ _id: req.params.id, userId: req.userId });
  if (!meal) return res.status(404).json({ error: 'Meal not found' });

  const foodData = calculateMacros(meal.foodId, quantity, unitName || meal.unit);
  meal.quantity = quantity;
  if (unitName) meal.unit = foodData.unit;
  meal.macros = foodData.macros;
  
  await meal.save();
  notifyUser(req.userId);
  res.json({ success: true });
});

app.delete('/api/meals/:id', requireUser, async (req, res) => {
  await Meal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  notifyUser(req.userId);
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Backend running on port ${PORT}`)));