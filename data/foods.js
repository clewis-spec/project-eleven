"use strict";

/**
 * Eleven food database
 *
 * Nutrition values are approximate and represent the serving described
 * in each food object. Values can vary by brand, preparation method,
 * trimming, cooking loss, and serving measurement.
 *
 * This database is intentionally stored as JavaScript rather than JSON
 * so the application can run directly on GitHub Pages without a server.
 */

window.ELEVEN_FOODS = [
  // =======================================================
  // PROTEINS
  // =======================================================

  {
    id: "chicken-breast",
    name: "Chicken Breast",
    shortName: "Chicken",
    icon: "🍗",
    category: "protein",
    servingDescription: "150 g cooked",
    servingGrams: 150,
    calories: 248,
    protein: 46.5,
    carbohydrates: 0,
    fat: 5.4,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "barbecue",
      "grilled",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["lean", "high-protein", "gluten-free"]
  },

  {
    id: "chicken-thigh",
    name: "Boneless Chicken Thigh",
    shortName: "Chicken Thigh",
    icon: "🍗",
    category: "protein",
    servingDescription: "150 g cooked",
    servingGrams: 150,
    calories: 314,
    protein: 39,
    carbohydrates: 0,
    fat: 16.5,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "barbecue",
      "slow-cooker"
    ],
    mealPrepFriendly: true,
    tags: ["high-protein", "gluten-free"]
  },

  {
    id: "turkey-breast",
    name: "Turkey Breast",
    shortName: "Turkey",
    icon: "🦃",
    category: "protein",
    servingDescription: "150 g cooked",
    servingGrams: 150,
    calories: 203,
    protein: 43.5,
    carbohydrates: 0,
    fat: 2.4,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "baked",
      "grilled",
      "pan-seared",
      "slow-cooker"
    ],
    mealPrepFriendly: true,
    tags: ["lean", "high-protein", "gluten-free"]
  },

  {
    id: "lean-ground-turkey",
    name: "Lean Ground Turkey",
    shortName: "Ground Turkey",
    icon: "🦃",
    category: "protein",
    servingDescription: "150 g cooked",
    servingGrams: 150,
    calories: 255,
    protein: 39,
    carbohydrates: 0,
    fat: 10.5,
    fibre: 0,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "pan-seared",
      "baked",
      "slow-cooker"
    ],
    mealPrepFriendly: true,
    tags: ["high-protein", "gluten-free"]
  },

  {
    id: "lean-ground-beef",
    name: "Lean Ground Beef",
    shortName: "Ground Beef",
    icon: "🥩",
    category: "protein",
    servingDescription: "150 g cooked",
    servingGrams: 150,
    calories: 323,
    protein: 39,
    carbohydrates: 0,
    fat: 18,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "pan-seared",
      "barbecue",
      "baked",
      "slow-cooker"
    ],
    mealPrepFriendly: true,
    tags: ["high-protein", "gluten-free", "iron-rich"]
  },

  {
    id: "sirloin-steak",
    name: "Sirloin Steak",
    shortName: "Steak",
    icon: "🥩",
    category: "protein",
    servingDescription: "170 g cooked",
    servingGrams: 170,
    calories: 374,
    protein: 49,
    carbohydrates: 0,
    fat: 19,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "barbecue",
      "broiled",
      "pan-seared"
    ],
    mealPrepFriendly: false,
    tags: ["high-protein", "gluten-free", "iron-rich"]
  },

  {
    id: "pork-tenderloin",
    name: "Pork Tenderloin",
    shortName: "Pork",
    icon: "🐖",
    category: "protein",
    servingDescription: "150 g cooked",
    servingGrams: 150,
    calories: 215,
    protein: 39,
    carbohydrates: 0,
    fat: 5.4,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "barbecue",
      "slow-cooker"
    ],
    mealPrepFriendly: true,
    tags: ["lean", "high-protein", "gluten-free"]
  },

  {
    id: "salmon",
    name: "Salmon",
    shortName: "Salmon",
    icon: "🐟",
    category: "protein",
    servingDescription: "150 g cooked",
    servingGrams: 150,
    calories: 309,
    protein: 33,
    carbohydrates: 0,
    fat: 18.5,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "barbecue",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["high-protein", "omega-3", "gluten-free"]
  },

  {
    id: "cod",
    name: "Cod",
    shortName: "Cod",
    icon: "🐟",
    category: "protein",
    servingDescription: "170 g cooked",
    servingGrams: 170,
    calories: 179,
    protein: 39,
    carbohydrates: 0,
    fat: 1.5,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["lean", "high-protein", "gluten-free"]
  },

  {
    id: "canned-tuna",
    name: "Canned Tuna",
    shortName: "Tuna",
    icon: "🐟",
    category: "protein",
    servingDescription: "1 can drained, 120 g",
    servingGrams: 120,
    calories: 139,
    protein: 31,
    carbohydrates: 0,
    fat: 1,
    fibre: 0,
    mealTypes: ["lunch", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["lean", "high-protein", "quick", "gluten-free"]
  },

  {
    id: "shrimp",
    name: "Shrimp",
    shortName: "Shrimp",
    icon: "🍤",
    category: "protein",
    servingDescription: "170 g cooked",
    servingGrams: 170,
    calories: 168,
    protein: 41,
    carbohydrates: 0.3,
    fat: 0.5,
    fibre: 0,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "barbecue",
      "boiled",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["lean", "high-protein", "quick", "gluten-free"]
  },

  {
    id: "whole-eggs",
    name: "Whole Eggs",
    shortName: "Eggs",
    icon: "🥚",
    category: "protein",
    servingDescription: "3 large eggs",
    servingGrams: 150,
    calories: 216,
    protein: 18.9,
    carbohydrates: 1.1,
    fat: 14.4,
    fibre: 0,
    mealTypes: ["breakfast", "lunch", "snack"],
    preparationMethods: [
      "boiled",
      "poached",
      "scrambled",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["high-protein", "breakfast", "gluten-free"]
  },

  {
    id: "egg-whites",
    name: "Egg Whites",
    shortName: "Egg Whites",
    icon: "🥚",
    category: "protein",
    servingDescription: "250 mL",
    servingGrams: 250,
    calories: 125,
    protein: 27,
    carbohydrates: 2,
    fat: 0,
    fibre: 0,
    mealTypes: ["breakfast", "lunch"],
    preparationMethods: [
      "scrambled",
      "pan-seared",
      "baked"
    ],
    mealPrepFriendly: true,
    tags: ["lean", "high-protein", "breakfast", "gluten-free"]
  },

  {
    id: "extra-firm-tofu",
    name: "Extra-Firm Tofu",
    shortName: "Tofu",
    icon: "🌱",
    category: "protein",
    servingDescription: "200 g",
    servingGrams: 200,
    calories: 288,
    protein: 34,
    carbohydrates: 7,
    fat: 17,
    fibre: 4,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["plant-based", "vegetarian", "high-protein"]
  },

  {
    id: "tempeh",
    name: "Tempeh",
    shortName: "Tempeh",
    icon: "🌱",
    category: "protein",
    servingDescription: "150 g",
    servingGrams: 150,
    calories: 290,
    protein: 30,
    carbohydrates: 12,
    fat: 16,
    fibre: 9,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["plant-based", "vegetarian", "high-protein", "high-fibre"]
  },

  // =======================================================
  // VEGETABLES
  // =======================================================

  {
    id: "broccoli",
    name: "Broccoli",
    shortName: "Broccoli",
    icon: "🥦",
    category: "vegetable",
    servingDescription: "1.5 cups cooked",
    servingGrams: 230,
    calories: 80,
    protein: 5.5,
    carbohydrates: 16,
    fat: 0.9,
    fibre: 7.5,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "roasted",
      "steamed"
    ],
    mealPrepFriendly: true,
    tags: ["high-fibre", "gluten-free"]
  },

  {
    id: "spinach",
    name: "Spinach",
    shortName: "Spinach",
    icon: "🥬",
    category: "vegetable",
    servingDescription: "2 cups raw",
    servingGrams: 60,
    calories: 14,
    protein: 1.7,
    carbohydrates: 2.2,
    fat: 0.2,
    fibre: 1.3,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "no-cook",
      "pan-seared",
      "steamed"
    ],
    mealPrepFriendly: true,
    tags: ["leafy-green", "low-calorie", "gluten-free"]
  },

  {
    id: "green-beans",
    name: "Green Beans",
    shortName: "Green Beans",
    icon: "🫛",
    category: "vegetable",
    servingDescription: "1.5 cups cooked",
    servingGrams: 190,
    calories: 67,
    protein: 3.6,
    carbohydrates: 15,
    fat: 0.5,
    fibre: 6,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "roasted",
      "steamed"
    ],
    mealPrepFriendly: true,
    tags: ["high-fibre", "gluten-free"]
  },

  {
    id: "asparagus",
    name: "Asparagus",
    shortName: "Asparagus",
    icon: "🌿",
    category: "vegetable",
    servingDescription: "10 spears cooked",
    servingGrams: 180,
    calories: 40,
    protein: 4.3,
    carbohydrates: 7.4,
    fat: 0.4,
    fibre: 3.6,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "barbecue",
      "roasted",
      "steamed"
    ],
    mealPrepFriendly: true,
    tags: ["low-calorie", "gluten-free"]
  },

  {
    id: "bell-peppers",
    name: "Bell Peppers",
    shortName: "Peppers",
    icon: "🫑",
    category: "vegetable",
    servingDescription: "1 large pepper",
    servingGrams: 165,
    calories: 51,
    protein: 1.6,
    carbohydrates: 12,
    fat: 0.5,
    fibre: 3.5,
    mealTypes: ["breakfast", "lunch", "dinner", "snack"],
    preparationMethods: [
      "barbecue",
      "no-cook",
      "pan-seared",
      "roasted"
    ],
    mealPrepFriendly: true,
    tags: ["vitamin-c", "gluten-free"]
  },

  {
    id: "cauliflower",
    name: "Cauliflower",
    shortName: "Cauliflower",
    icon: "🥦",
    category: "vegetable",
    servingDescription: "1.5 cups cooked",
    servingGrams: 190,
    calories: 53,
    protein: 3.8,
    carbohydrates: 10,
    fat: 0.6,
    fibre: 4.5,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "mashed",
      "roasted",
      "steamed"
    ],
    mealPrepFriendly: true,
    tags: ["lower-carb", "gluten-free"]
  },

  {
    id: "mushrooms",
    name: "Mushrooms",
    shortName: "Mushrooms",
    icon: "🍄",
    category: "vegetable",
    servingDescription: "1.5 cups cooked",
    servingGrams: 230,
    calories: 64,
    protein: 8,
    carbohydrates: 10,
    fat: 0.8,
    fibre: 3,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "barbecue",
      "pan-seared",
      "roasted"
    ],
    mealPrepFriendly: true,
    tags: ["low-calorie", "gluten-free"]
  },

  {
    id: "zucchini",
    name: "Zucchini",
    shortName: "Zucchini",
    icon: "🥒",
    category: "vegetable",
    servingDescription: "1.5 cups cooked",
    servingGrams: 270,
    calories: 46,
    protein: 3.2,
    carbohydrates: 8.4,
    fat: 0.8,
    fibre: 2.7,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "barbecue",
      "pan-seared",
      "roasted"
    ],
    mealPrepFriendly: true,
    tags: ["lower-carb", "gluten-free"]
  },

  {
    id: "cucumber",
    name: "Cucumber",
    shortName: "Cucumber",
    icon: "🥒",
    category: "vegetable",
    servingDescription: "1.5 cups sliced",
    servingGrams: 180,
    calories: 27,
    protein: 1.2,
    carbohydrates: 6.5,
    fat: 0.2,
    fibre: 0.9,
    mealTypes: ["lunch", "dinner", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["low-calorie", "hydrating", "gluten-free"]
  },

  {
    id: "tomatoes",
    name: "Tomatoes",
    shortName: "Tomatoes",
    icon: "🍅",
    category: "vegetable",
    servingDescription: "1.5 cups chopped",
    servingGrams: 270,
    calories: 49,
    protein: 2.4,
    carbohydrates: 10.5,
    fat: 0.5,
    fibre: 3.2,
    mealTypes: ["breakfast", "lunch", "dinner", "snack"],
    preparationMethods: [
      "no-cook",
      "roasted",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["low-calorie", "gluten-free"]
  },

  {
    id: "brussels-sprouts",
    name: "Brussels Sprouts",
    shortName: "Brussels Sprouts",
    icon: "🥬",
    category: "vegetable",
    servingDescription: "1.5 cups cooked",
    servingGrams: 230,
    calories: 82,
    protein: 5.7,
    carbohydrates: 16.5,
    fat: 1.1,
    fibre: 8,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "roasted"
    ],
    mealPrepFriendly: true,
    tags: ["high-fibre", "gluten-free"]
  },

  {
    id: "mixed-greens",
    name: "Mixed Greens",
    shortName: "Greens",
    icon: "🥗",
    category: "vegetable",
    servingDescription: "3 cups",
    servingGrams: 90,
    calories: 25,
    protein: 2,
    carbohydrates: 4,
    fat: 0.3,
    fibre: 2.5,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["leafy-green", "low-calorie", "gluten-free"]
  },

  // =======================================================
  // FRUITS
  // =======================================================

  {
    id: "apple",
    name: "Apple",
    shortName: "Apple",
    icon: "🍎",
    category: "fruit",
    servingDescription: "1 medium",
    servingGrams: 182,
    calories: 95,
    protein: 0.5,
    carbohydrates: 25,
    fat: 0.3,
    fibre: 4.4,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["portable", "high-fibre", "gluten-free"]
  },

  {
    id: "banana",
    name: "Banana",
    shortName: "Banana",
    icon: "🍌",
    category: "fruit",
    servingDescription: "1 medium",
    servingGrams: 118,
    calories: 105,
    protein: 1.3,
    carbohydrates: 27,
    fat: 0.4,
    fibre: 3.1,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["portable", "pre-workout", "gluten-free"]
  },

  {
    id: "blueberries",
    name: "Blueberries",
    shortName: "Blueberries",
    icon: "🫐",
    category: "fruit",
    servingDescription: "1 cup",
    servingGrams: 148,
    calories: 84,
    protein: 1.1,
    carbohydrates: 21.5,
    fat: 0.5,
    fibre: 3.6,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["berries", "antioxidants", "gluten-free"]
  },

  {
    id: "strawberries",
    name: "Strawberries",
    shortName: "Strawberries",
    icon: "🍓",
    category: "fruit",
    servingDescription: "1.5 cups sliced",
    servingGrams: 250,
    calories: 80,
    protein: 1.7,
    carbohydrates: 19,
    fat: 0.8,
    fibre: 5,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["berries", "high-fibre", "gluten-free"]
  },

  {
    id: "orange",
    name: "Orange",
    shortName: "Orange",
    icon: "🍊",
    category: "fruit",
    servingDescription: "1 large",
    servingGrams: 184,
    calories: 86,
    protein: 1.7,
    carbohydrates: 21.5,
    fat: 0.2,
    fibre: 4.4,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["vitamin-c", "portable", "gluten-free"]
  },

  {
    id: "grapes",
    name: "Grapes",
    shortName: "Grapes",
    icon: "🍇",
    category: "fruit",
    servingDescription: "1 cup",
    servingGrams: 151,
    calories: 104,
    protein: 1.1,
    carbohydrates: 27,
    fat: 0.2,
    fibre: 1.4,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["quick", "gluten-free"]
  },

  {
    id: "pineapple",
    name: "Pineapple",
    shortName: "Pineapple",
    icon: "🍍",
    category: "fruit",
    servingDescription: "1 cup chunks",
    servingGrams: 165,
    calories: 82,
    protein: 0.9,
    carbohydrates: 21.5,
    fat: 0.2,
    fibre: 2.3,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["tropical", "gluten-free"]
  },

  {
    id: "watermelon",
    name: "Watermelon",
    shortName: "Watermelon",
    icon: "🍉",
    category: "fruit",
    servingDescription: "2 cups diced",
    servingGrams: 304,
    calories: 91,
    protein: 1.8,
    carbohydrates: 23,
    fat: 0.5,
    fibre: 1.2,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["hydrating", "gluten-free"]
  },

  // =======================================================
  // CARBOHYDRATES
  // =======================================================

  {
    id: "rolled-oats",
    name: "Rolled Oats",
    shortName: "Oats",
    icon: "🥣",
    category: "carbohydrate",
    servingDescription: "60 g dry",
    servingGrams: 60,
    calories: 228,
    protein: 7.6,
    carbohydrates: 40.6,
    fat: 4.1,
    fibre: 6,
    mealTypes: ["breakfast"],
    preparationMethods: [
      "microwave",
      "stovetop",
      "overnight"
    ],
    mealPrepFriendly: true,
    tags: ["whole-grain", "high-fibre", "breakfast"]
  },

  {
    id: "jasmine-rice",
    name: "Jasmine Rice",
    shortName: "Jasmine Rice",
    icon: "🍚",
    category: "carbohydrate",
    servingDescription: "1 cup cooked",
    servingGrams: 158,
    calories: 205,
    protein: 4.3,
    carbohydrates: 44.5,
    fat: 0.4,
    fibre: 0.6,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "rice-cooker",
      "stovetop"
    ],
    mealPrepFriendly: true,
    tags: ["gluten-free", "meal-prep"]
  },

  {
    id: "brown-rice",
    name: "Brown Rice",
    shortName: "Brown Rice",
    icon: "🍚",
    category: "carbohydrate",
    servingDescription: "1 cup cooked",
    servingGrams: 195,
    calories: 216,
    protein: 5,
    carbohydrates: 45,
    fat: 1.8,
    fibre: 3.5,
    mealTypes: ["lunch", "dinner"],
    preparationMethods: [
      "rice-cooker",
      "stovetop"
    ],
    mealPrepFriendly: true,
    tags: ["whole-grain", "gluten-free", "meal-prep"]
  },

  {
    id: "quinoa",
    name: "Quinoa",
    shortName: "Quinoa",
    icon: "🌾",
    category: "carbohydrate",
    servingDescription: "1 cup cooked",
    servingGrams: 185,
    calories: 222,
    protein: 8.1,
    carbohydrates: 39.4,
    fat: 3.6,
    fibre: 5.2,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: ["stovetop"],
    mealPrepFriendly: true,
    tags: ["higher-protein", "high-fibre", "gluten-free"]
  },

  {
    id: "white-potato",
    name: "White Potato",
    shortName: "Potato",
    icon: "🥔",
    category: "carbohydrate",
    servingDescription: "300 g cooked",
    servingGrams: 300,
    calories: 261,
    protein: 5.7,
    carbohydrates: 60,
    fat: 0.3,
    fibre: 5.4,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "boiled",
      "mashed",
      "roasted"
    ],
    mealPrepFriendly: true,
    tags: ["gluten-free", "potassium"]
  },

  {
    id: "sweet-potato",
    name: "Sweet Potato",
    shortName: "Sweet Potato",
    icon: "🍠",
    category: "carbohydrate",
    servingDescription: "250 g cooked",
    servingGrams: 250,
    calories: 225,
    protein: 5,
    carbohydrates: 52.5,
    fat: 0.4,
    fibre: 8.3,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "air-fryer",
      "baked",
      "mashed",
      "roasted"
    ],
    mealPrepFriendly: true,
    tags: ["high-fibre", "gluten-free"]
  },

  {
    id: "whole-grain-bread",
    name: "Whole-Grain Bread",
    shortName: "Whole-Grain Bread",
    icon: "🍞",
    category: "carbohydrate",
    servingDescription: "2 slices",
    servingGrams: 80,
    calories: 200,
    protein: 9,
    carbohydrates: 34,
    fat: 3,
    fibre: 6,
    mealTypes: ["breakfast", "lunch", "snack"],
    preparationMethods: [
      "no-cook",
      "toasted"
    ],
    mealPrepFriendly: true,
    tags: ["whole-grain", "high-fibre", "quick"]
  },

  {
    id: "whole-wheat-wrap",
    name: "Whole-Wheat Wrap",
    shortName: "Wrap",
    icon: "🌯",
    category: "carbohydrate",
    servingDescription: "1 large wrap",
    servingGrams: 70,
    calories: 210,
    protein: 7,
    carbohydrates: 35,
    fat: 5,
    fibre: 5,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "no-cook",
      "pan-seared"
    ],
    mealPrepFriendly: true,
    tags: ["portable", "quick"]
  },

  // =======================================================
  // HEALTHY FATS
  // =======================================================

  {
    id: "avocado",
    name: "Avocado",
    shortName: "Avocado",
    icon: "🥑",
    category: "fat",
    servingDescription: "1/2 medium",
    servingGrams: 100,
    calories: 160,
    protein: 2,
    carbohydrates: 8.5,
    fat: 14.7,
    fibre: 6.7,
    mealTypes: ["breakfast", "lunch", "dinner", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: false,
    tags: ["high-fibre", "unsaturated-fat", "gluten-free"]
  },

  {
    id: "almonds",
    name: "Almonds",
    shortName: "Almonds",
    icon: "🥜",
    category: "fat",
    servingDescription: "28 g",
    servingGrams: 28,
    calories: 164,
    protein: 6,
    carbohydrates: 6.1,
    fat: 14.2,
    fibre: 3.5,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["portable", "unsaturated-fat", "gluten-free"]
  },

  {
    id: "walnuts",
    name: "Walnuts",
    shortName: "Walnuts",
    icon: "🥜",
    category: "fat",
    servingDescription: "28 g",
    servingGrams: 28,
    calories: 185,
    protein: 4.3,
    carbohydrates: 3.9,
    fat: 18.5,
    fibre: 1.9,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["omega-3", "unsaturated-fat", "gluten-free"]
  },

  {
    id: "natural-peanut-butter",
    name: "Natural Peanut Butter",
    shortName: "Peanut Butter",
    icon: "🥜",
    category: "fat",
    servingDescription: "2 tbsp",
    servingGrams: 32,
    calories: 190,
    protein: 8,
    carbohydrates: 7,
    fat: 16,
    fibre: 2,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["quick", "unsaturated-fat", "gluten-free"]
  },

  {
    id: "olive-oil",
    name: "Extra-Virgin Olive Oil",
    shortName: "Olive Oil",
    icon: "🫒",
    category: "fat",
    servingDescription: "1 tbsp",
    servingGrams: 14,
    calories: 119,
    protein: 0,
    carbohydrates: 0,
    fat: 13.5,
    fibre: 0,
    mealTypes: ["breakfast", "lunch", "dinner"],
    preparationMethods: [
      "dressing",
      "pan-seared",
      "roasted"
    ],
    mealPrepFriendly: true,
    tags: ["unsaturated-fat", "gluten-free"]
  },

  {
    id: "chia-seeds",
    name: "Chia Seeds",
    shortName: "Chia Seeds",
    icon: "🌱",
    category: "fat",
    servingDescription: "2 tbsp",
    servingGrams: 28,
    calories: 138,
    protein: 4.7,
    carbohydrates: 11.9,
    fat: 8.7,
    fibre: 9.8,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: [
      "no-cook",
      "overnight"
    ],
    mealPrepFriendly: true,
    tags: ["high-fibre", "omega-3", "gluten-free"]
  },

  // =======================================================
  // DAIRY AND ALTERNATIVES
  // =======================================================

  {
    id: "greek-yogurt",
    name: "Plain Greek Yogurt",
    shortName: "Greek Yogurt",
    icon: "🥣",
    category: "dairy",
    servingDescription: "250 g",
    servingGrams: 250,
    calories: 183,
    protein: 24,
    carbohydrates: 9,
    fat: 5,
    fibre: 0,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["high-protein", "quick", "gluten-free"]
  },

  {
    id: "cottage-cheese",
    name: "Cottage Cheese",
    shortName: "Cottage Cheese",
    icon: "🧀",
    category: "dairy",
    servingDescription: "1 cup",
    servingGrams: 226,
    calories: 206,
    protein: 28,
    carbohydrates: 8,
    fat: 7,
    fibre: 0,
    mealTypes: ["breakfast", "lunch", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["high-protein", "quick", "gluten-free"]
  },

  {
    id: "skim-milk",
    name: "Skim Milk",
    shortName: "Skim Milk",
    icon: "🥛",
    category: "dairy",
    servingDescription: "1 cup",
    servingGrams: 250,
    calories: 86,
    protein: 8.4,
    carbohydrates: 12,
    fat: 0.2,
    fibre: 0,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["quick", "gluten-free"]
  },

  {
    id: "unsweetened-almond-milk",
    name: "Unsweetened Almond Milk",
    shortName: "Almond Milk",
    icon: "🥛",
    category: "dairy",
    servingDescription: "1 cup",
    servingGrams: 250,
    calories: 35,
    protein: 1,
    carbohydrates: 1.5,
    fat: 2.5,
    fibre: 0.5,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["dairy-free", "lower-calorie", "gluten-free"]
  },

  {
    id: "whey-protein",
    name: "Whey Protein Powder",
    shortName: "Protein Powder",
    icon: "🥤",
    category: "dairy",
    servingDescription: "1 scoop",
    servingGrams: 32,
    calories: 125,
    protein: 25,
    carbohydrates: 3,
    fat: 2,
    fibre: 0,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["shaken", "blended"],
    mealPrepFriendly: true,
    tags: ["high-protein", "quick", "portable"]
  },

  {
    id: "plant-protein",
    name: "Plant Protein Powder",
    shortName: "Plant Protein",
    icon: "🥤",
    category: "dairy",
    servingDescription: "1 scoop",
    servingGrams: 35,
    calories: 140,
    protein: 24,
    carbohydrates: 5,
    fat: 3,
    fibre: 2,
    mealTypes: ["breakfast", "snack"],
    preparationMethods: ["shaken", "blended"],
    mealPrepFriendly: true,
    tags: ["plant-based", "dairy-free", "high-protein"]
  }
];

/**
 * Food-category display information.
 *
 * The interface will use this object to determine category names,
 * descriptions, and display order.
 */

window.ELEVEN_FOOD_CATEGORIES = [
  {
    id: "protein",
    name: "Proteins",
    description: "Primary protein sources for meals and snacks.",
    minimumRecommendedSelections: 4
  },
  {
    id: "vegetable",
    name: "Vegetables",
    description: "High-volume foods that contribute fibre and variety.",
    minimumRecommendedSelections: 5
  },
  {
    id: "fruit",
    name: "Fruits",
    description: "Convenient sources of carbohydrates, fibre, and flavour.",
    minimumRecommendedSelections: 3
  },
  {
    id: "carbohydrate",
    name: "Carbohydrates",
    description: "Measured portions used to support energy and meal variety.",
    minimumRecommendedSelections: 3
  },
  {
    id: "fat",
    name: "Healthy Fats",
    description: "Calorie-dense foods used in controlled portions.",
    minimumRecommendedSelections: 2
  },
  {
    id: "dairy",
    name: "Dairy and Alternatives",
    description: "Convenient protein sources and meal-building ingredients.",
    minimumRecommendedSelections: 2
  }
];

/**
 * Return one food by its unique ID.
 *
 * @param {string} foodId
 * @returns {object|null}
 */

window.getElevenFoodById = function getElevenFoodById(foodId) {
  return (
    window.ELEVEN_FOODS.find((food) => food.id === foodId) || null
  );
};

/**
 * Return every food belonging to a category.
 *
 * @param {string} categoryId
 * @returns {object[]}
 */

window.getElevenFoodsByCategory = function getElevenFoodsByCategory(
  categoryId
) {
  return window.ELEVEN_FOODS.filter(
    (food) => food.category === categoryId
  );
};

/**
 * Return foods suitable for a particular meal type.
 *
 * @param {"breakfast"|"lunch"|"dinner"|"snack"} mealType
 * @returns {object[]}
 */

window.getElevenFoodsByMealType = function getElevenFoodsByMealType(
  mealType
) {
  return window.ELEVEN_FOODS.filter((food) =>
    food.mealTypes.includes(mealType)
  );
};

/**
 * Create a shallow copy of a food object.
 *
 * This prevents meal-generation code from accidentally changing the
 * master food database when adding quantities or calculated portions.
 *
 * @param {string} foodId
 * @returns {object|null}
 */

window.cloneElevenFood = function cloneElevenFood(foodId) {
  const food = window.getElevenFoodById(foodId);

  return food ? { ...food } : null;
};
