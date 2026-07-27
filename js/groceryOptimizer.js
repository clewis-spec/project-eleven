"use strict";

/**
 * Eleven grocery optimization engine
 *
 * Responsibilities:
 *
 * - Convert a generated meal plan into a consolidated grocery list
 * - Combine duplicate ingredients across all meals
 * - Calculate total required servings and grams
 * - Group items by grocery department
 * - Round requirements into practical purchase quantities
 * - Identify estimated leftovers
 * - Identify likely pantry staples
 * - Calculate shopping-efficiency metrics
 * - Save the resulting grocery list in browser storage
 */

window.ELEVEN_GROCERY_OPTIMIZER = (() => {
  const VERSION = 1;

  const DEPARTMENT_ORDER = [
    "produce",
    "meat-seafood",
    "dairy-eggs",
    "bakery",
    "frozen",
    "pantry",
    "beverages",
    "other"
  ];

  const DEPARTMENT_LABELS = {
    produce: "Produce",
    "meat-seafood": "Meat & Seafood",
    "dairy-eggs": "Dairy & Eggs",
    bakery: "Bakery",
    frozen: "Frozen",
    pantry: "Pantry",
    beverages: "Beverages",
    other: "Other"
  };

  const CATEGORY_DEPARTMENTS = {
    vegetable: "produce",
    fruit: "produce",
    protein: "meat-seafood",
    dairy: "dairy-eggs",
    carbohydrate: "pantry",
    fat: "pantry"
  };

  const PANTRY_KEYWORDS = [
    "oil",
    "salt",
    "pepper",
    "seasoning",
    "spice",
    "paprika",
    "garlic powder",
    "onion powder",
    "cinnamon",
    "vinegar",
    "mustard",
    "honey",
    "maple syrup",
    "soy sauce",
    "hot sauce",
    "protein powder"
  ];

  const DEFAULT_PACKAGE_RULES = {
    produce: {
      minimumServings: 1,
      servingIncrement: 1
    },

    "meat-seafood": {
      minimumGrams: 454,
      gramIncrement: 454
    },

    "dairy-eggs": {
      minimumServings: 1,
      servingIncrement: 1
    },

    bakery: {
      minimumServings: 1,
      servingIncrement: 1
    },

    frozen: {
      minimumGrams: 500,
      gramIncrement: 500
    },

    pantry: {
      minimumServings: 1,
      servingIncrement: 1
    },

    beverages: {
      minimumServings: 1,
      servingIncrement: 1
    },

    other: {
      minimumServings: 1,
      servingIncrement: 1
    }
  };

  /**
   * Create a grocery list from a generated meal plan.
   *
   * @param {object} mealPlan
   * @param {object} options
   * @returns {object}
   */

  function createGroceryList(
    mealPlan,
    options = {}
  ) {
    const validation =
      validateMealPlan(mealPlan);

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        groceryList: null
      };
    }

    const normalizedOptions =
      normalizeOptions(options);

    const ingredientRecords =
      extractIngredients(mealPlan);

    const consolidatedItems =
      consolidateIngredients(
        ingredientRecords
      );

    const optimizedItems =
      consolidatedItems.map(
        (item) =>
          optimizePurchaseQuantity(
            item,
            normalizedOptions
          )
      );

    const departments =
      groupItemsByDepartment(
        optimizedItems
      );

    const metrics =
      calculateGroceryMetrics(
        optimizedItems,
        mealPlan
      );

    const groceryList = {
      id: createGroceryListId(),
      version: VERSION,
      createdAt:
        new Date().toISOString(),

      sourcePlanId:
        mealPlan.id || null,

      sourcePlanName:
        mealPlan.name ||
        "Eleven Meal Plan",

      cycleLengthDays:
        Array.isArray(
          mealPlan.days
        )
          ? mealPlan.days.length
          : 0,

      options:
        normalizedOptions,

      items:
        optimizedItems,

      departments,

      metrics,

      pantryItems:
        optimizedItems.filter(
          (item) =>
            item.isLikelyPantryItem
        ),

      freshItems:
        optimizedItems.filter(
          (item) =>
            !item.isLikelyPantryItem
        ),

      decisionLog:
        createDecisionLog({
          optimizedItems,
          departments,
          metrics
        })
    };

    return {
      success: true,
      errors: [],
      groceryList
    };
  }

  /**
   * Extract all ingredients from all days and meals.
   *
   * @param {object} mealPlan
   * @returns {object[]}
   */

  function extractIngredients(
    mealPlan
  ) {
    return mealPlan.days.flatMap(
      (day) =>
        day.meals.flatMap(
          (meal) =>
            meal.ingredients.map(
              (ingredient) => ({
                ...ingredient,
                day:
                  day.day,
                mealType:
                  meal.mealType,
                mealName:
                  meal.name
              })
            )
        )
    );
  }

  /**
   * Combine duplicate ingredients.
   *
   * @param {object[]} ingredients
   * @returns {object[]}
   */

  function consolidateIngredients(
    ingredients
  ) {
    const itemMap = new Map();

    ingredients.forEach(
      (ingredient) => {
        const foodId =
          ingredient.foodId;

        if (!foodId) {
          return;
        }

        const food =
          typeof window
            .getElevenFoodById ===
          "function"
            ? window
                .getElevenFoodById(
                  foodId
                )
            : null;

        if (!food) {
          return;
        }

        const existing =
          itemMap.get(foodId) ||
          createEmptyGroceryItem(
            food
          );

        const quantity =
          toFiniteNumber(
            ingredient.quantity
          );

        existing.requiredServings +=
          quantity;

        if (
          toFiniteNumber(
            food.servingGrams
          ) > 0
        ) {
          existing.requiredGrams +=
            quantity *
            toFiniteNumber(
              food.servingGrams
            );
        }

        existing.uses.push({
          day:
            ingredient.day,
          mealType:
            ingredient.mealType,
          mealName:
            ingredient.mealName,
          quantity
        });

        itemMap.set(
          foodId,
          existing
        );
      }
    );

    return Array.from(
      itemMap.values()
    )
      .map((item) => ({
        ...item,

        requiredServings:
          roundNumber(
            item.requiredServings,
            2
          ),

        requiredGrams:
          roundNumber(
            item.requiredGrams,
            1
          ),

        useCount:
          item.uses.length
      }))
      .sort(
        compareGroceryItems
      );
  }

  /**
   * Create a base grocery item.
   *
   * @param {object} food
   * @returns {object}
   */

  function createEmptyGroceryItem(
    food
  ) {
    const department =
      determineDepartment(food);

    return {
      foodId:
        food.id,

      name:
        food.name,

      brand:
        food.brand || null,

      category:
        food.category ||
        "other",

      department,

      servingDescription:
        food.servingDescription ||
        "serving",

      servingGrams:
        toFiniteNumber(
          food.servingGrams
        ),

      requiredServings: 0,
      requiredGrams: 0,

      purchaseServings: 0,
      purchaseGrams: 0,

      leftoverServings: 0,
      leftoverGrams: 0,

      useCount: 0,
      uses: [],

      isCustom:
        Boolean(
          food.isCustom
        ),

      isLikelyPantryItem:
        isLikelyPantryItem(food),

      purchaseRecommendation:
        null
    };
  }

  /**
   * Round a required amount to a practical purchase amount.
   *
   * @param {object} item
   * @param {object} options
   * @returns {object}
   */

  function optimizePurchaseQuantity(
    item,
    options
  ) {
    const packageRule =
      getPackageRule(
        item,
        options
      );

    let purchaseServings =
      item.requiredServings;

    let purchaseGrams =
      item.requiredGrams;

    if (
      item.requiredGrams > 0 &&
      packageRule.gramIncrement
    ) {
      purchaseGrams =
        roundUpToIncrement(
          Math.max(
            item.requiredGrams,
            packageRule.minimumGrams ||
              packageRule.gramIncrement
          ),
          packageRule.gramIncrement
        );

      if (
        item.servingGrams > 0
      ) {
        purchaseServings =
          purchaseGrams /
          item.servingGrams;
      }
    } else {
      purchaseServings =
        roundUpToIncrement(
          Math.max(
            item.requiredServings,
            packageRule
              .minimumServings ||
              1
          ),
          packageRule
            .servingIncrement ||
            1
        );

      if (
        item.servingGrams > 0
      ) {
        purchaseGrams =
          purchaseServings *
          item.servingGrams;
      }
    }

    const leftoverServings =
      Math.max(
        0,
        purchaseServings -
          item.requiredServings
      );

    const leftoverGrams =
      Math.max(
        0,
        purchaseGrams -
          item.requiredGrams
      );

    return {
      ...item,

      purchaseServings:
        roundNumber(
          purchaseServings,
          2
        ),

      purchaseGrams:
        roundNumber(
          purchaseGrams,
          1
        ),

      leftoverServings:
        roundNumber(
          leftoverServings,
          2
        ),

      leftoverGrams:
        roundNumber(
          leftoverGrams,
          1
        ),

      wastePercentage:
        purchaseGrams > 0
          ? roundNumber(
              leftoverGrams /
                purchaseGrams *
                100,
              1
            )
          : purchaseServings > 0
            ? roundNumber(
                leftoverServings /
                  purchaseServings *
                  100,
                1
              )
            : 0,

      purchaseRecommendation:
        createPurchaseRecommendation({
          ...item,
          purchaseServings,
          purchaseGrams
        })
    };
  }

  /**
   * Determine the grocery department for a food.
   *
   * @param {object} food
   * @returns {string}
   */

  function determineDepartment(
    food
  ) {
    const searchableText = [
      food.name,
      food.brand,
      ...(food.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    if (
      searchableText.includes(
        "frozen"
      )
    ) {
      return "frozen";
    }

    if (
      searchableText.includes(
        "bread"
      ) ||
      searchableText.includes(
        "wrap"
      ) ||
      searchableText.includes(
        "tortilla"
      ) ||
      searchableText.includes(
        "bagel"
      )
    ) {
      return "bakery";
    }

    if (
      searchableText.includes(
        "shake"
      ) ||
      searchableText.includes(
        "drink"
      ) ||
      searchableText.includes(
        "beverage"
      )
    ) {
      return "beverages";
    }

    if (
      food.category ===
        "protein" &&
      (
        searchableText.includes(
          "egg"
        ) ||
        searchableText.includes(
          "yogurt"
        ) ||
        searchableText.includes(
          "cottage cheese"
        )
      )
    ) {
      return "dairy-eggs";
    }

    return (
      CATEGORY_DEPARTMENTS[
        food.category
      ] ||
      "other"
    );
  }

  /**
   * Identify foods the user may already keep in the pantry.
   *
   * @param {object} food
   * @returns {boolean}
   */

  function isLikelyPantryItem(
    food
  ) {
    const searchableText = [
      food.name,
      food.brand,
      ...(food.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return PANTRY_KEYWORDS.some(
      (keyword) =>
        searchableText.includes(
          keyword
        )
    );
  }

  /**
   * Group optimized items by department.
   *
   * @param {object[]} items
   * @returns {object[]}
   */

  function groupItemsByDepartment(
    items
  ) {
    return DEPARTMENT_ORDER
      .map((departmentId) => {
        const departmentItems =
          items.filter(
            (item) =>
              item.department ===
              departmentId
          );

        if (
          departmentItems.length ===
          0
        ) {
          return null;
        }

        return {
          id:
            departmentId,

          name:
            DEPARTMENT_LABELS[
              departmentId
            ],

          itemCount:
            departmentItems.length,

          items:
            departmentItems
        };
      })
      .filter(Boolean);
  }

  /**
   * Calculate shopping metrics.
   *
   * @param {object[]} items
   * @param {object} mealPlan
   * @returns {object}
   */

  function calculateGroceryMetrics(
    items,
    mealPlan
  ) {
    const totalRequiredGrams =
      items.reduce(
        (total, item) =>
          total +
          item.requiredGrams,
        0
      );

    const totalPurchaseGrams =
      items.reduce(
        (total, item) =>
          total +
          item.purchaseGrams,
        0
      );

    const totalLeftoverGrams =
      items.reduce(
        (total, item) =>
          total +
          item.leftoverGrams,
        0
      );

    const weightedWastePercentage =
      totalPurchaseGrams > 0
        ? totalLeftoverGrams /
          totalPurchaseGrams *
          100
        : 0;

    const uniqueItems =
      items.length;

    const totalUses =
      items.reduce(
        (total, item) =>
          total + item.useCount,
        0
      );

    const averageUsesPerItem =
      uniqueItems > 0
        ? totalUses /
          uniqueItems
        : 0;

    const pantryItemCount =
      items.filter(
        (item) =>
          item.isLikelyPantryItem
      ).length;

    const shoppingEfficiencyScore =
      calculateShoppingEfficiencyScore({
        weightedWastePercentage,
        averageUsesPerItem,
        uniqueItems,
        mealCount:
          countPlanMeals(mealPlan)
      });

    return {
      uniqueItemCount:
        uniqueItems,

      departmentCount:
        new Set(
          items.map(
            (item) =>
              item.department
          )
        ).size,

      pantryItemCount,

      freshItemCount:
        uniqueItems -
        pantryItemCount,

      totalIngredientUses:
        totalUses,

      averageUsesPerItem:
        roundNumber(
          averageUsesPerItem,
          1
        ),

      totalRequiredGrams:
        roundNumber(
          totalRequiredGrams,
          1
        ),

      totalPurchaseGrams:
        roundNumber(
          totalPurchaseGrams,
          1
        ),

      totalLeftoverGrams:
        roundNumber(
          totalLeftoverGrams,
          1
        ),

      estimatedWastePercentage:
        roundNumber(
          weightedWastePercentage,
          1
        ),

      shoppingEfficiencyScore,

      rating:
        getShoppingRating(
          shoppingEfficiencyScore
        )
    };
  }

  /**
   * Calculate shopping-efficiency score.
   *
   * @param {object} metrics
   * @returns {number}
   */

  function calculateShoppingEfficiencyScore(
    metrics
  ) {
    const {
      weightedWastePercentage,
      averageUsesPerItem,
      uniqueItems,
      mealCount
    } = metrics;

    const wasteScore =
      clamp(
        100 -
          weightedWastePercentage *
            2.5,
        0,
        100
      );

    const reuseScore =
      clamp(
        averageUsesPerItem /
          3 *
          100,
        0,
        100
      );

    const itemDensity =
      mealCount > 0
        ? uniqueItems /
          mealCount
        : 1;

    const simplicityScore =
      clamp(
        100 -
          Math.max(
            0,
            itemDensity - 0.75
          ) *
            65,
        0,
        100
      );

    return roundNumber(
      wasteScore * 0.45 +
        reuseScore * 0.35 +
        simplicityScore * 0.2,
      1
    );
  }

  /**
   * Create a human-readable purchase recommendation.
   *
   * @param {object} item
   * @returns {string}
   */

  function createPurchaseRecommendation(
    item
  ) {
    if (
      item.purchaseGrams > 0
    ) {
      if (
        item.purchaseGrams >=
        1000
      ) {
        return `${formatNumber(
          item.purchaseGrams /
            1000
        )} kg`;
      }

      return `${formatNumber(
        item.purchaseGrams
      )} g`;
    }

    if (
      item.purchaseServings <= 1
    ) {
      return `1 ${item.servingDescription}`;
    }

    return `${formatNumber(
      item.purchaseServings
    )} × ${item.servingDescription}`;
  }

  /**
   * Produce an explanatory grocery decision log.
   *
   * @param {object} context
   * @returns {object[]}
   */

  function createDecisionLog(
    context
  ) {
    const {
      optimizedItems,
      departments,
      metrics
    } = context;

    const entries = [
      {
        type: "summary",
        title:
          "Shopping list created",

        message:
          `Eleven consolidated the complete meal plan into ${metrics.uniqueItemCount} grocery items across ${metrics.departmentCount} departments.`
      },

      {
        type: "information",
        title:
          "Ingredient reuse",

        message:
          `Each grocery item appears in an average of ${metrics.averageUsesPerItem} planned meals.`
      },

      {
        type:
          metrics
            .estimatedWastePercentage <=
          10
            ? "positive"
            : "warning",

        title:
          "Estimated leftovers",

        message:
          `Package rounding produces approximately ${formatNumber(
            metrics.totalLeftoverGrams
          )} g of estimated leftovers, or ${metrics.estimatedWastePercentage}% of purchased weight.`
      },

      {
        type: "information",
        title:
          "Pantry review",

        message:
          `${metrics.pantryItemCount} item${
            metrics.pantryItemCount ===
            1
              ? " is"
              : "s are"
          } marked as likely pantry staples and should be checked before shopping.`
      }
    ];

    const highWasteItems =
      optimizedItems
        .filter(
          (item) =>
            item.wastePercentage >=
            25
        )
        .sort(
          (first, second) =>
            second.wastePercentage -
            first.wastePercentage
        )
        .slice(0, 3);

    if (
      highWasteItems.length > 0
    ) {
      entries.push({
        type: "warning",
        title:
          "Items with larger leftovers",

        message:
          `${highWasteItems
            .map(
              (item) =>
                item.name
            )
            .join(", ")} may leave larger package remnants after the cycle.`
      });
    }

    return entries;
  }

  /**
   * Save a generated grocery list.
   *
   * @param {object} groceryList
   * @returns {boolean}
   */

  function saveGroceryList(
    groceryList
  ) {
    if (!groceryList) {
      return false;
    }

    if (
      window.ELEVEN_STORAGE &&
      typeof window
        .ELEVEN_STORAGE
        .saveGroceryList ===
        "function"
    ) {
      return window
        .ELEVEN_STORAGE
        .saveGroceryList(
          groceryList
        );
    }

    try {
      localStorage.setItem(
        "eleven.groceryList",
        JSON.stringify(
          groceryList
        )
      );

      return true;
    } catch (error) {
      console.error(
        "Eleven could not save the grocery list.",
        error
      );

      return false;
    }
  }

  /**
   * Generate and save a grocery list from the current plan.
   *
   * @param {object} options
   * @returns {object}
   */

  function generateFromSavedPlan(
    options = {}
  ) {
    const mealPlan =
      window.ELEVEN_STORAGE
        ?.getMealPlan?.();

    if (!mealPlan) {
      return {
        success: false,
        errors: [
          "Generate a meal plan before creating a grocery list."
        ],
        groceryList: null
      };
    }

    const result =
      createGroceryList(
        mealPlan,
        options
      );

    if (
      result.success &&
      result.groceryList
    ) {
      saveGroceryList(
        result.groceryList
      );

      document.dispatchEvent(
        new CustomEvent(
          "eleven:grocery-list-updated",
          {
            detail: {
              groceryList:
                result.groceryList
            }
          }
        )
      );
    }

    return result;
  }

  /**
   * Validate meal-plan structure.
   *
   * @param {object} mealPlan
   * @returns {object}
   */

  function validateMealPlan(
    mealPlan
  ) {
    const errors = [];

    if (!mealPlan) {
      errors.push(
        "A meal plan is required."
      );
    }

    if (
      !Array.isArray(
        mealPlan?.days
      ) ||
      mealPlan.days.length === 0
    ) {
      errors.push(
        "The meal plan does not contain any days."
      );
    }

    const meals =
      Array.isArray(
        mealPlan?.days
      )
        ? mealPlan.days.flatMap(
            (day) =>
              Array.isArray(
                day?.meals
              )
                ? day.meals
                : []
          )
        : [];

    if (
      meals.length === 0
    ) {
      errors.push(
        "The meal plan does not contain any meals."
      );
    }

    const ingredientCount =
      meals.reduce(
        (total, meal) =>
          total +
          (
            Array.isArray(
              meal?.ingredients
            )
              ? meal.ingredients
                  .length
              : 0
          ),
        0
      );

    if (
      ingredientCount === 0
    ) {
      errors.push(
        "The meal plan does not contain ingredient-level data."
      );
    }

    return {
      isValid:
        errors.length === 0,
      errors
    };
  }

  /**
   * Determine the appropriate package rule.
   *
   * @param {object} item
   * @param {object} options
   * @returns {object}
   */

  function getPackageRule(
    item,
    options
  ) {
    const customRule =
      options.packageRules[
        item.foodId
      ];

    if (customRule) {
      return {
        ...DEFAULT_PACKAGE_RULES[
          item.department
        ],
        ...customRule
      };
    }

    if (
      item.isCustom &&
      item.servingGrams <= 0
    ) {
      return {
        minimumServings: 1,
        servingIncrement: 1
      };
    }

    return {
      ...DEFAULT_PACKAGE_RULES[
        item.department
      ]
    };
  }

  /**
   * Normalize optimizer options.
   *
   * @param {object} options
   * @returns {object}
   */

  function normalizeOptions(
    options
  ) {
    return {
      store:
        options.store ||
        "general",

      includePantryItems:
        options
          .includePantryItems !==
        false,

      packageRules:
        options.packageRules &&
        typeof options
          .packageRules ===
          "object"
          ? {
              ...options
                .packageRules
            }
          : {}
    };
  }

  /**
   * Compare grocery items.
   *
   * @param {object} first
   * @param {object} second
   * @returns {number}
   */

  function compareGroceryItems(
    first,
    second
  ) {
    const firstDepartment =
      DEPARTMENT_ORDER.indexOf(
        first.department
      );

    const secondDepartment =
      DEPARTMENT_ORDER.indexOf(
        second.department
      );

    if (
      firstDepartment !==
      secondDepartment
    ) {
      return (
        firstDepartment -
        secondDepartment
      );
    }

    return first.name.localeCompare(
      second.name,
      "en-CA"
    );
  }

  /**
   * Count plan meals.
   *
   * @param {object} mealPlan
   * @returns {number}
   */

  function countPlanMeals(
    mealPlan
  ) {
    return mealPlan.days.reduce(
      (total, day) =>
        total +
        (
          Array.isArray(
            day.meals
          )
            ? day.meals.length
            : 0
        ),
      0
    );
  }

  /**
   * Return shopping rating.
   *
   * @param {number} score
   * @returns {string}
   */

  function getShoppingRating(
    score
  ) {
    if (score >= 95) {
      return "Exceptional";
    }

    if (score >= 90) {
      return "Excellent";
    }

    if (score >= 80) {
      return "Very good";
    }

    if (score >= 70) {
      return "Good";
    }

    if (score >= 60) {
      return "Needs improvement";
    }

    return "High waste";
  }

  /**
   * Round upward to a package increment.
   *
   * @param {number} value
   * @param {number} increment
   * @returns {number}
   */

  function roundUpToIncrement(
    value,
    increment
  ) {
    const safeIncrement =
      toFiniteNumber(
        increment
      );

    if (
      safeIncrement <= 0
    ) {
      return value;
    }

    return (
      Math.ceil(
        value /
        safeIncrement
      ) *
      safeIncrement
    );
  }

  /**
   * Utilities.
   */

  function createGroceryListId() {
    return [
      "grocery",
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 9)
    ].join("-");
  }

  function toFiniteNumber(
    value
  ) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function roundNumber(
    value,
    decimalPlaces = 0
  ) {
    const multiplier =
      10 ** decimalPlaces;

    return (
      Math.round(
        (
          toFiniteNumber(value) +
          Number.EPSILON
        ) *
          multiplier
      ) /
      multiplier
    );
  }

  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      Math.max(
        toFiniteNumber(value),
        minimum
      ),
      maximum
    );
  }

  function formatNumber(
    value
  ) {
    return toFiniteNumber(
      value
    ).toLocaleString(
      "en-CA",
      {
        maximumFractionDigits: 1
      }
    );
  }

  return {
    version: VERSION,

    departmentOrder: [
      ...DEPARTMENT_ORDER
    ],

    departmentLabels: {
      ...DEPARTMENT_LABELS
    },

    createGroceryList,
    generateFromSavedPlan,
    saveGroceryList,
    consolidateIngredients,
    calculateGroceryMetrics,
    getShoppingRating
  };
})();
