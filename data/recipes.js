"use strict";

/**
 * Eleven recipe template database
 *
 * Recipes reference foods by their unique food IDs from data/foods.js.
 * Each ingredient may be:
 *
 * - fixed: always included
 * - selectable: chosen from one of the listed food categories
 *
 * The meal generator will eventually use these templates to create
 * personalized meals from the user's selected foods.
 */

window.ELEVEN_RECIPES = [
  // =======================================================
  // BREAKFASTS
  // =======================================================

  {
    id: "protein-oatmeal-bowl",
    name: "Protein Oatmeal Bowl",
    description:
      "Warm oats with protein powder, fruit, and a measured healthy fat.",
    icon: "🥣",
    mealType: "breakfast",
    preparationTimeMinutes: 10,
    cookingMethods: ["microwave", "stovetop"],
    mealPrepFriendly: true,
    tags: ["high-protein", "high-fibre", "quick"],
    ingredients: [
      {
        role: "base",
        type: "fixed",
        foodId: "rolled-oats",
        quantity: 1
      },
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: ["whey-protein", "plant-protein"],
        quantity: 1
      },
      {
        role: "fruit",
        type: "choice",
        allowedCategories: ["fruit"],
        quantity: 1
      },
      {
        role: "fat",
        type: "choice",
        allowedFoodIds: [
          "natural-peanut-butter",
          "chia-seeds",
          "almonds",
          "walnuts"
        ],
        quantity: 0.5
      }
    ],
    instructions: [
      "Cook the oats according to the package directions.",
      "Stir in the protein powder after cooking.",
      "Top with fruit and the selected healthy fat."
    ]
  },

  {
    id: "greek-yogurt-bowl",
    name: "Greek Yogurt Breakfast Bowl",
    description:
      "Greek yogurt with fruit, chia seeds, and optional nuts.",
    icon: "🥣",
    mealType: "breakfast",
    preparationTimeMinutes: 5,
    cookingMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["high-protein", "quick", "no-cook"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "greek-yogurt",
        quantity: 1
      },
      {
        role: "fruit",
        type: "choice",
        allowedCategories: ["fruit"],
        quantity: 1
      },
      {
        role: "fibre",
        type: "fixed",
        foodId: "chia-seeds",
        quantity: 0.5
      },
      {
        role: "fat",
        type: "choice",
        allowedFoodIds: ["almonds", "walnuts"],
        quantity: 0.5,
        optional: true
      }
    ],
    instructions: [
      "Add Greek yogurt to a bowl.",
      "Top with fruit and chia seeds.",
      "Add nuts if included in the generated meal."
    ]
  },

  {
    id: "cottage-cheese-fruit-bowl",
    name: "Cottage Cheese and Fruit Bowl",
    description:
      "A high-protein cottage cheese bowl with fresh fruit and nuts.",
    icon: "🧀",
    mealType: "breakfast",
    preparationTimeMinutes: 5,
    cookingMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["high-protein", "quick", "no-cook"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "cottage-cheese",
        quantity: 1
      },
      {
        role: "fruit",
        type: "choice",
        allowedCategories: ["fruit"],
        quantity: 1
      },
      {
        role: "fat",
        type: "choice",
        allowedFoodIds: ["almonds", "walnuts"],
        quantity: 0.5,
        optional: true
      }
    ],
    instructions: [
      "Add cottage cheese to a bowl.",
      "Top with the selected fruit.",
      "Add nuts if included."
    ]
  },

  {
    id: "egg-vegetable-scramble",
    name: "Egg and Vegetable Scramble",
    description:
      "Whole eggs or egg whites scrambled with selected vegetables.",
    icon: "🍳",
    mealType: "breakfast",
    preparationTimeMinutes: 15,
    cookingMethods: ["pan-seared"],
    mealPrepFriendly: true,
    tags: ["high-protein", "lower-carb", "gluten-free"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: ["whole-eggs", "egg-whites"],
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "spinach",
          "bell-peppers",
          "mushrooms",
          "tomatoes",
          "asparagus"
        ],
        quantity: 1
      },
      {
        role: "cooking-fat",
        type: "fixed",
        foodId: "olive-oil",
        quantity: 0.25
      }
    ],
    instructions: [
      "Heat olive oil in a non-stick pan.",
      "Cook the vegetables until softened.",
      "Add the eggs and scramble until cooked through."
    ]
  },

  {
    id: "egg-toast-breakfast",
    name: "Eggs and Whole-Grain Toast",
    description:
      "Eggs served with whole-grain toast and optional avocado.",
    icon: "🍳",
    mealType: "breakfast",
    preparationTimeMinutes: 12,
    cookingMethods: ["boiled", "poached", "scrambled", "toasted"],
    mealPrepFriendly: true,
    tags: ["balanced", "high-protein"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: ["whole-eggs", "egg-whites"],
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "fixed",
        foodId: "whole-grain-bread",
        quantity: 1
      },
      {
        role: "fat",
        type: "fixed",
        foodId: "avocado",
        quantity: 0.5,
        optional: true
      }
    ],
    instructions: [
      "Prepare the eggs using your preferred method.",
      "Toast the bread.",
      "Serve with avocado if included."
    ]
  },

  {
    id: "breakfast-wrap",
    name: "Protein Breakfast Wrap",
    description:
      "Eggs, vegetables, and optional lean ground turkey in a whole-wheat wrap.",
    icon: "🌯",
    mealType: "breakfast",
    preparationTimeMinutes: 18,
    cookingMethods: ["pan-seared"],
    mealPrepFriendly: true,
    tags: ["portable", "high-protein", "meal-prep"],
    ingredients: [
      {
        role: "wrap",
        type: "fixed",
        foodId: "whole-wheat-wrap",
        quantity: 1
      },
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "whole-eggs",
          "egg-whites",
          "lean-ground-turkey"
        ],
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "spinach",
          "bell-peppers",
          "mushrooms",
          "tomatoes"
        ],
        quantity: 0.75
      }
    ],
    instructions: [
      "Cook the selected protein and vegetables in a skillet.",
      "Warm the wrap.",
      "Fill, fold, and serve."
    ]
  },

  {
    id: "protein-smoothie",
    name: "Protein Fruit Smoothie",
    description:
      "A quick blended breakfast or snack with protein, milk, and fruit.",
    icon: "🥤",
    mealType: "breakfast",
    preparationTimeMinutes: 5,
    cookingMethods: ["blended"],
    mealPrepFriendly: false,
    tags: ["high-protein", "quick", "portable"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: ["whey-protein", "plant-protein"],
        quantity: 1
      },
      {
        role: "liquid",
        type: "choice",
        allowedFoodIds: ["skim-milk", "unsweetened-almond-milk"],
        quantity: 1
      },
      {
        role: "fruit",
        type: "choice",
        allowedCategories: ["fruit"],
        quantity: 1
      },
      {
        role: "fat",
        type: "choice",
        allowedFoodIds: [
          "natural-peanut-butter",
          "chia-seeds"
        ],
        quantity: 0.5,
        optional: true
      }
    ],
    instructions: [
      "Add all ingredients to a blender.",
      "Blend until smooth.",
      "Add water or ice to adjust consistency."
    ]
  },

  // =======================================================
  // LUNCHES
  // =======================================================

  {
    id: "protein-rice-bowl",
    name: "Protein and Rice Bowl",
    description:
      "A balanced bowl with lean protein, rice, vegetables, and olive oil.",
    icon: "🍚",
    mealType: "lunch",
    preparationTimeMinutes: 25,
    cookingMethods: ["grilled", "pan-seared", "rice-cooker"],
    mealPrepFriendly: true,
    tags: ["high-protein", "balanced", "meal-prep"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "chicken-breast",
          "turkey-breast",
          "lean-ground-turkey",
          "lean-ground-beef",
          "shrimp",
          "extra-firm-tofu",
          "tempeh"
        ],
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedFoodIds: [
          "jasmine-rice",
          "brown-rice",
          "quinoa"
        ],
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedCategories: ["vegetable"],
        quantity: 1
      },
      {
        role: "fat",
        type: "fixed",
        foodId: "olive-oil",
        quantity: 0.5
      }
    ],
    instructions: [
      "Prepare the protein using your preferred method.",
      "Cook the selected grain.",
      "Cook or prepare the vegetables.",
      "Assemble in a bowl and finish with olive oil."
    ]
  },

  {
    id: "protein-potato-bowl",
    name: "Protein and Potato Bowl",
    description:
      "Lean protein with roasted potato and a generous vegetable serving.",
    icon: "🥔",
    mealType: "lunch",
    preparationTimeMinutes: 30,
    cookingMethods: ["air-fryer", "baked", "grilled", "roasted"],
    mealPrepFriendly: true,
    tags: ["high-protein", "gluten-free", "meal-prep"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "chicken-breast",
          "chicken-thigh",
          "turkey-breast",
          "lean-ground-beef",
          "pork-tenderloin",
          "cod",
          "salmon"
        ],
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedFoodIds: ["white-potato", "sweet-potato"],
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedCategories: ["vegetable"],
        quantity: 1
      }
    ],
    instructions: [
      "Cook the protein.",
      "Roast or air-fry the selected potato.",
      "Prepare the vegetables.",
      "Serve together in a bowl or on a plate."
    ]
  },

  {
    id: "protein-wrap",
    name: "Lean Protein Wrap",
    description:
      "A whole-wheat wrap filled with lean protein and fresh vegetables.",
    icon: "🌯",
    mealType: "lunch",
    preparationTimeMinutes: 15,
    cookingMethods: ["no-cook", "pan-seared"],
    mealPrepFriendly: true,
    tags: ["portable", "quick", "high-protein"],
    ingredients: [
      {
        role: "wrap",
        type: "fixed",
        foodId: "whole-wheat-wrap",
        quantity: 1
      },
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "chicken-breast",
          "turkey-breast",
          "canned-tuna",
          "shrimp",
          "extra-firm-tofu"
        ],
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "mixed-greens",
          "spinach",
          "cucumber",
          "tomatoes",
          "bell-peppers"
        ],
        quantity: 0.75
      },
      {
        role: "fat",
        type: "choice",
        allowedFoodIds: ["avocado", "olive-oil"],
        quantity: 0.5,
        optional: true
      }
    ],
    instructions: [
      "Prepare the protein if needed.",
      "Add the protein and vegetables to the wrap.",
      "Add avocado or olive oil if included.",
      "Roll tightly and serve."
    ]
  },

  {
    id: "large-protein-salad",
    name: "Large Protein Salad",
    description:
      "A filling salad with lean protein, greens, vegetables, and olive oil.",
    icon: "🥗",
    mealType: "lunch",
    preparationTimeMinutes: 15,
    cookingMethods: ["no-cook", "grilled"],
    mealPrepFriendly: true,
    tags: ["high-protein", "high-volume", "lower-carb"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "chicken-breast",
          "turkey-breast",
          "canned-tuna",
          "shrimp",
          "salmon",
          "extra-firm-tofu",
          "tempeh"
        ],
        quantity: 1
      },
      {
        role: "greens",
        type: "fixed",
        foodId: "mixed-greens",
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "cucumber",
          "tomatoes",
          "bell-peppers",
          "spinach"
        ],
        quantity: 1
      },
      {
        role: "fat",
        type: "choice",
        allowedFoodIds: ["olive-oil", "avocado"],
        quantity: 0.75
      }
    ],
    instructions: [
      "Add greens and vegetables to a large bowl.",
      "Top with the prepared protein.",
      "Finish with olive oil or avocado."
    ]
  },

  {
    id: "tuna-toast-plate",
    name: "Tuna and Whole-Grain Toast Plate",
    description:
      "A quick tuna lunch with whole-grain toast and fresh vegetables.",
    icon: "🐟",
    mealType: "lunch",
    preparationTimeMinutes: 10,
    cookingMethods: ["no-cook", "toasted"],
    mealPrepFriendly: true,
    tags: ["quick", "high-protein"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "canned-tuna",
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "fixed",
        foodId: "whole-grain-bread",
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "cucumber",
          "tomatoes",
          "bell-peppers",
          "mixed-greens"
        ],
        quantity: 1
      },
      {
        role: "fat",
        type: "fixed",
        foodId: "avocado",
        quantity: 0.5,
        optional: true
      }
    ],
    instructions: [
      "Toast the bread if desired.",
      "Serve with tuna and the selected vegetables.",
      "Add avocado if included."
    ]
  },

  // =======================================================
  // DINNERS
  // =======================================================

  {
    id: "grilled-protein-dinner",
    name: "Grilled Protein Dinner",
    description:
      "A simple grilled protein with vegetables and a measured carbohydrate.",
    icon: "🍽️",
    mealType: "dinner",
    preparationTimeMinutes: 30,
    cookingMethods: ["barbecue", "grilled", "roasted"],
    mealPrepFriendly: true,
    tags: ["high-protein", "balanced"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "chicken-breast",
          "chicken-thigh",
          "turkey-breast",
          "sirloin-steak",
          "pork-tenderloin",
          "salmon",
          "cod",
          "shrimp",
          "extra-firm-tofu",
          "tempeh"
        ],
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedCategories: ["vegetable"],
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedCategories: ["carbohydrate"],
        quantity: 0.75
      }
    ],
    instructions: [
      "Grill or cook the selected protein.",
      "Prepare the vegetables.",
      "Cook the selected carbohydrate.",
      "Serve together."
    ]
  },

  {
    id: "sheet-pan-dinner",
    name: "Sheet-Pan Protein and Vegetables",
    description:
      "Protein, vegetables, and potato roasted together for easy preparation.",
    icon: "🍽️",
    mealType: "dinner",
    preparationTimeMinutes: 40,
    cookingMethods: ["baked", "roasted"],
    mealPrepFriendly: true,
    tags: ["meal-prep", "simple", "gluten-free"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "chicken-breast",
          "chicken-thigh",
          "turkey-breast",
          "pork-tenderloin",
          "salmon",
          "cod",
          "extra-firm-tofu"
        ],
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedFoodIds: ["white-potato", "sweet-potato"],
        quantity: 0.75
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "broccoli",
          "green-beans",
          "asparagus",
          "bell-peppers",
          "cauliflower",
          "zucchini",
          "brussels-sprouts"
        ],
        quantity: 1
      },
      {
        role: "cooking-fat",
        type: "fixed",
        foodId: "olive-oil",
        quantity: 0.5
      }
    ],
    instructions: [
      "Heat the oven to 425°F.",
      "Arrange the protein, potato, and vegetables on a sheet pan.",
      "Drizzle with olive oil and season.",
      "Roast until the protein and vegetables are fully cooked."
    ]
  },

  {
    id: "stir-fry-bowl",
    name: "Protein Vegetable Stir-Fry",
    description:
      "Protein and vegetables served over rice or quinoa.",
    icon: "🥢",
    mealType: "dinner",
    preparationTimeMinutes: 25,
    cookingMethods: ["pan-seared", "stovetop"],
    mealPrepFriendly: true,
    tags: ["high-protein", "meal-prep"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "chicken-breast",
          "lean-ground-turkey",
          "lean-ground-beef",
          "shrimp",
          "extra-firm-tofu",
          "tempeh"
        ],
        quantity: 1
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "broccoli",
          "bell-peppers",
          "mushrooms",
          "zucchini",
          "green-beans"
        ],
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedFoodIds: [
          "jasmine-rice",
          "brown-rice",
          "quinoa"
        ],
        quantity: 0.75
      },
      {
        role: "cooking-fat",
        type: "fixed",
        foodId: "olive-oil",
        quantity: 0.5
      }
    ],
    instructions: [
      "Cook the grain separately.",
      "Heat olive oil in a large skillet.",
      "Cook the protein and vegetables.",
      "Serve over the grain."
    ]
  },

  {
    id: "steak-potato-dinner",
    name: "Steak, Potato, and Vegetables",
    description:
      "A classic steak dinner with potato and a high-volume vegetable.",
    icon: "🥩",
    mealType: "dinner",
    preparationTimeMinutes: 35,
    cookingMethods: ["barbecue", "pan-seared", "roasted"],
    mealPrepFriendly: false,
    tags: ["high-protein", "iron-rich"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "sirloin-steak",
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedFoodIds: ["white-potato", "sweet-potato"],
        quantity: 0.75
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "broccoli",
          "green-beans",
          "asparagus",
          "brussels-sprouts"
        ],
        quantity: 1
      }
    ],
    instructions: [
      "Cook the steak to the desired doneness.",
      "Prepare the selected potato.",
      "Cook the vegetables and serve."
    ]
  },

  {
    id: "salmon-grain-dinner",
    name: "Salmon Grain Bowl",
    description:
      "Salmon with rice or quinoa and vegetables.",
    icon: "🐟",
    mealType: "dinner",
    preparationTimeMinutes: 30,
    cookingMethods: ["air-fryer", "baked", "pan-seared"],
    mealPrepFriendly: true,
    tags: ["omega-3", "high-protein", "balanced"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "salmon",
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedFoodIds: [
          "jasmine-rice",
          "brown-rice",
          "quinoa"
        ],
        quantity: 0.75
      },
      {
        role: "vegetable",
        type: "choice",
        allowedCategories: ["vegetable"],
        quantity: 1
      }
    ],
    instructions: [
      "Cook the salmon.",
      "Prepare the selected grain.",
      "Cook the vegetables.",
      "Assemble and serve."
    ]
  },

  {
    id: "lean-burger-bowl",
    name: "Lean Burger Bowl",
    description:
      "Ground beef or turkey with potato, vegetables, and optional avocado.",
    icon: "🥩",
    mealType: "dinner",
    preparationTimeMinutes: 25,
    cookingMethods: ["barbecue", "pan-seared"],
    mealPrepFriendly: true,
    tags: ["high-protein", "gluten-free", "meal-prep"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: [
          "lean-ground-beef",
          "lean-ground-turkey"
        ],
        quantity: 1
      },
      {
        role: "carbohydrate",
        type: "choice",
        allowedFoodIds: ["white-potato", "sweet-potato"],
        quantity: 0.75
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "mixed-greens",
          "tomatoes",
          "cucumber",
          "bell-peppers"
        ],
        quantity: 1
      },
      {
        role: "fat",
        type: "fixed",
        foodId: "avocado",
        quantity: 0.5,
        optional: true
      }
    ],
    instructions: [
      "Cook the ground meat as patties or crumbles.",
      "Prepare the selected potato.",
      "Add vegetables to a bowl.",
      "Top with the meat and optional avocado."
    ]
  },

  // =======================================================
  // SNACKS
  // =======================================================

  {
    id: "protein-shake-snack",
    name: "Protein Shake",
    description:
      "A simple protein shake with milk or almond milk.",
    icon: "🥤",
    mealType: "snack",
    preparationTimeMinutes: 3,
    cookingMethods: ["shaken", "blended"],
    mealPrepFriendly: false,
    tags: ["high-protein", "quick", "portable"],
    ingredients: [
      {
        role: "protein",
        type: "choice",
        allowedFoodIds: ["whey-protein", "plant-protein"],
        quantity: 1
      },
      {
        role: "liquid",
        type: "choice",
        allowedFoodIds: ["skim-milk", "unsweetened-almond-milk"],
        quantity: 1
      }
    ],
    instructions: [
      "Combine the protein powder and liquid.",
      "Shake or blend until smooth."
    ]
  },

  {
    id: "yogurt-fruit-snack",
    name: "Greek Yogurt and Fruit",
    description:
      "Greek yogurt paired with a selected fruit.",
    icon: "🥣",
    mealType: "snack",
    preparationTimeMinutes: 3,
    cookingMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["high-protein", "quick"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "greek-yogurt",
        quantity: 0.75
      },
      {
        role: "fruit",
        type: "choice",
        allowedCategories: ["fruit"],
        quantity: 0.75
      }
    ],
    instructions: [
      "Add Greek yogurt to a bowl.",
      "Top with fruit."
    ]
  },

  {
    id: "cottage-cheese-snack",
    name: "Cottage Cheese Snack",
    description:
      "Cottage cheese with fruit or fresh vegetables.",
    icon: "🧀",
    mealType: "snack",
    preparationTimeMinutes: 3,
    cookingMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["high-protein", "quick"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "cottage-cheese",
        quantity: 0.75
      },
      {
        role: "side",
        type: "choice",
        allowedFoodIds: [
          "apple",
          "blueberries",
          "strawberries",
          "cucumber",
          "bell-peppers",
          "tomatoes"
        ],
        quantity: 0.75
      }
    ],
    instructions: [
      "Serve cottage cheese with the selected fruit or vegetable."
    ]
  },

  {
    id: "fruit-and-nuts-snack",
    name: "Fruit and Nuts",
    description:
      "A portable fruit serving paired with measured nuts.",
    icon: "🍎",
    mealType: "snack",
    preparationTimeMinutes: 2,
    cookingMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["portable", "quick", "high-fibre"],
    ingredients: [
      {
        role: "fruit",
        type: "choice",
        allowedCategories: ["fruit"],
        quantity: 1
      },
      {
        role: "fat",
        type: "choice",
        allowedFoodIds: ["almonds", "walnuts"],
        quantity: 0.75
      }
    ],
    instructions: [
      "Portion the fruit and nuts.",
      "Serve together."
    ]
  },

  {
    id: "apple-peanut-butter-snack",
    name: "Apple and Peanut Butter",
    description:
      "A sliced apple with natural peanut butter.",
    icon: "🍎",
    mealType: "snack",
    preparationTimeMinutes: 3,
    cookingMethods: ["no-cook"],
    mealPrepFriendly: true,
    tags: ["portable", "quick", "high-fibre"],
    ingredients: [
      {
        role: "fruit",
        type: "fixed",
        foodId: "apple",
        quantity: 1
      },
      {
        role: "fat",
        type: "fixed",
        foodId: "natural-peanut-butter",
        quantity: 0.75
      }
    ],
    instructions: [
      "Slice the apple.",
      "Serve with peanut butter."
    ]
  },

  {
    id: "eggs-and-vegetables-snack",
    name: "Eggs and Fresh Vegetables",
    description:
      "Boiled eggs with cucumber, peppers, or tomatoes.",
    icon: "🥚",
    mealType: "snack",
    preparationTimeMinutes: 10,
    cookingMethods: ["boiled", "no-cook"],
    mealPrepFriendly: true,
    tags: ["high-protein", "lower-carb", "portable"],
    ingredients: [
      {
        role: "protein",
        type: "fixed",
        foodId: "whole-eggs",
        quantity: 0.67
      },
      {
        role: "vegetable",
        type: "choice",
        allowedFoodIds: [
          "cucumber",
          "bell-peppers",
          "tomatoes"
        ],
        quantity: 0.75
      }
    ],
    instructions: [
      "Boil and peel the eggs.",
      "Serve with the selected fresh vegetable."
    ]
  }
];

/**
 * Recipe category display configuration.
 */

window.ELEVEN_RECIPE_CATEGORIES = [
  {
    id: "breakfast",
    name: "Breakfast",
    targetShareOfDailyCalories: 0.25
  },
  {
    id: "lunch",
    name: "Lunch",
    targetShareOfDailyCalories: 0.3
  },
  {
    id: "dinner",
    name: "Dinner",
    targetShareOfDailyCalories: 0.32
  },
  {
    id: "snack",
    name: "Snack",
    targetShareOfDailyCalories: 0.13
  }
];

/**
 * Return one recipe by ID.
 *
 * @param {string} recipeId
 * @returns {object|null}
 */

window.getElevenRecipeById = function getElevenRecipeById(recipeId) {
  return (
    window.ELEVEN_RECIPES.find(
      (recipe) => recipe.id === recipeId
    ) || null
  );
};

/**
 * Return every recipe for a meal type.
 *
 * @param {"breakfast"|"lunch"|"dinner"|"snack"} mealType
 * @returns {object[]}
 */

window.getElevenRecipesByMealType =
  function getElevenRecipesByMealType(mealType) {
    return window.ELEVEN_RECIPES.filter(
      (recipe) => recipe.mealType === mealType
    );
  };

/**
 * Return recipes that can be prepared using the user's selected foods.
 *
 * Fixed ingredients must be selected.
 * Choice ingredients must have at least one valid selected option.
 * Optional ingredients do not prevent recipe eligibility.
 *
 * @param {string[]} selectedFoodIds
 * @returns {object[]}
 */

window.getEligibleElevenRecipes =
  function getEligibleElevenRecipes(selectedFoodIds) {
    const selectedSet = new Set(selectedFoodIds);

    return window.ELEVEN_RECIPES.filter((recipe) =>
      recipe.ingredients.every((ingredient) => {
        if (ingredient.optional) {
          return true;
        }

        if (ingredient.type === "fixed") {
          return selectedSet.has(ingredient.foodId);
        }

        if (ingredient.type === "choice") {
          const directChoices =
            ingredient.allowedFoodIds || [];

          const directMatch = directChoices.some((foodId) =>
            selectedSet.has(foodId)
          );

          const categoryChoices =
            ingredient.allowedCategories || [];

          const categoryMatch = categoryChoices.some(
            (categoryId) =>
              window.ELEVEN_FOODS.some(
                (food) =>
                  food.category === categoryId &&
                  selectedSet.has(food.id)
              )
          );

          return directMatch || categoryMatch;
        }

        return false;
      })
    );
  };

/**
 * Create a deep copy of a recipe.
 *
 * @param {string} recipeId
 * @returns {object|null}
 */

window.cloneElevenRecipe = function cloneElevenRecipe(recipeId) {
  const recipe = window.getElevenRecipeById(recipeId);

  return recipe
    ? JSON.parse(JSON.stringify(recipe))
    : null;
};
