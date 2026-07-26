"use strict";

/**
 * Eleven meal generation engine
 *
 * Responsibilities:
 *
 * - Read the saved profile and food preferences
 * - Create packaged-food recipe templates for selected custom foods
 * - Run the multi-candidate optimizer
 * - Convert the winning strategy into ingredient-level meals
 * - Select actual foods for every recipe choice
 * - Adjust portions toward each meal's calorie and protein targets
 * - Calculate meal and daily nutrition
 * - Evaluate and score the completed plan
 * - Save the plan in browser storage
 * - Render the complete 11-day plan
 */

window.ELEVEN_MEAL_GENERATOR = (() => {
  const MEAL_ORDER = [
    "breakfast",
    "lunch",
    "dinner",
    "snack"
  ];

  const MEAL_LABELS = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack"
  };

  const GENERATION_OPTIONS = {
    mode: "balanced",
    targetScore: 90,
    maximumAttempts: 40,
    minimumQuantity: 0.25,
    maximumQuantity: 2,
    quantityIncrement: 0.25,
    maximumAdjustmentPasses: 24
  };

  let initialized = false;
  let generateButton = null;
  let planContainer = null;
  let generationStatus = null;
  let comingSoonCard = null;
  let isGenerating = false;

  /**
   * Initialize the meal generator.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      return true;
    }

    generateButton =
      document.getElementById(
        "generate-plan-button"
      );

    planContainer =
      document.getElementById(
        "meal-plan-days"
      );

    comingSoonCard =
      document.querySelector(
        "#meal-plan .coming-soon-card"
      );

    if (
      !generateButton ||
      !planContainer
    ) {
      console.warn(
        "Eleven meal-plan controls were not found."
      );

      return false;
    }

    if (!dependenciesAvailable()) {
      console.error(
        "One or more Eleven meal-generation dependencies are unavailable."
      );

      return false;
    }

    injectGenerationStatus();
    bindEvents();
    prepareCustomFoodRecipes();
    restoreSavedPlan();
    refreshAvailability();

    initialized = true;

    return true;
  }

  /**
   * Confirm required modules are loaded.
   *
   * @returns {boolean}
   */

  function dependenciesAvailable() {
    return Boolean(
      window.ELEVEN_STORAGE &&
      window.ELEVEN_NUTRITION &&
      window.ELEVEN_CONSTRAINTS &&
      window.ELEVEN_PLANNER &&
      window.ELEVEN_OPTIMIZER &&
      Array.isArray(
        window.ELEVEN_FOODS
      ) &&
      Array.isArray(
        window.ELEVEN_RECIPES
      )
    );
  }

  /**
   * Bind generator events.
   */

  function bindEvents() {
    generateButton.addEventListener(
      "click",
      handleGenerateClick
    );

    document.addEventListener(
      "eleven:profile-updated",
      refreshAvailability
    );

    document.addEventListener(
      "eleven:preferences-updated",
      () => {
        prepareCustomFoodRecipes();
        refreshAvailability();
      }
    );
  }

  /**
   * Add a visible optimization status panel.
   */

  function injectGenerationStatus() {
    if (
      document.getElementById(
        "generation-status"
      )
    ) {
      generationStatus =
        document.getElementById(
          "generation-status"
        );

      return;
    }

    generationStatus =
      document.createElement("div");

    generationStatus.id =
      "generation-status";

    generationStatus.className =
      "generation-status";

    generationStatus.hidden = true;

    generationStatus.innerHTML = `
      <div class="generation-status-heading">
        <div>
          <p class="eyebrow">
            Eleven optimization
          </p>

          <h2 id="generation-status-title">
            Building your plan
          </h2>
        </div>

        <strong id="generation-best-score">
          0
        </strong>
      </div>

      <div
        class="progress-track"
        aria-hidden="true"
      >
        <span
          class="progress-bar"
          id="generation-progress-bar"
        ></span>
      </div>

      <p
        id="generation-status-message"
        class="generation-status-message"
      >
        Preparing your selected foods and recipes.
      </p>
    `;

    planContainer.before(
      generationStatus
    );
  }

  /**
   * Enable generation when setup requirements are met.
   */

  function refreshAvailability() {
    const profile =
      window.ELEVEN_STORAGE
        .getProfile();

    const preferences =
      window.ELEVEN_STORAGE
        .getPreferences();

    const profileReady =
      window.ELEVEN_STORAGE
        .isProfileComplete(profile);

    const preferencesReady =
      Array.isArray(
        preferences.selectedFoodIds
      ) &&
      preferences.selectedFoodIds
        .length > 0;

    generateButton.disabled =
      !profileReady ||
      !preferencesReady ||
      isGenerating;

    if (!profileReady) {
      generateButton.title =
        "Complete and save your profile first.";
    } else if (!preferencesReady) {
      generateButton.title =
        "Save your food preferences first.";
    } else {
      generateButton.removeAttribute(
        "title"
      );
    }
  }

  /**
   * Handle Generate new plan.
   */

  async function handleGenerateClick() {
    if (isGenerating) {
      return;
    }

    const profile =
      window.ELEVEN_STORAGE
        .getProfile();

    const preferences =
      window.ELEVEN_STORAGE
        .getPreferences();

    if (
      !window.ELEVEN_STORAGE
        .isProfileComplete(profile)
    ) {
      showFailure(
        "Complete and save your profile before generating a plan."
      );

      return;
    }

    if (
      !preferences.selectedFoodIds
        .length
    ) {
      showFailure(
        "Select and save your preferred foods before generating a plan."
      );

      return;
    }

    const existingPlan =
      window.ELEVEN_STORAGE
        .getMealPlan();

    if (existingPlan) {
      const confirmed =
        window.confirm(
          "Generate a new 11-day plan? This will replace the currently saved plan."
        );

      if (!confirmed) {
        return;
      }
    }

    await generatePlan(
      profile,
      preferences
    );
  }

  /**
   * Generate, validate, save, and render a plan.
   *
   * @param {object} profile
   * @param {object} preferences
   */

  async function generatePlan(
    profile,
    preferences
  ) {
    setGeneratingState(true);
    resetGenerationStatus();

    try {
      prepareCustomFoodRecipes();

      const optimizationResult =
        await window.ELEVEN_OPTIMIZER
          .optimizeCycle(
            profile,
            preferences,
            {},
            {
              mode:
                GENERATION_OPTIONS.mode,

              maximumAttempts:
                GENERATION_OPTIONS
                  .maximumAttempts,

              targetScore:
                GENERATION_OPTIONS
                  .targetScore,

              stopWhenTargetReached:
                true,

              preserveCandidates:
                false,

              onProgress:
                updateOptimizationProgress
            }
          );

      if (
        !optimizationResult.success ||
        !optimizationResult
          .bestCandidate
      ) {
        throw new Error(
          optimizationResult.errors?.[0] ||
          "Eleven could not produce a valid planning strategy."
        );
      }

      setGenerationMessage(
        "Building ingredient portions from the strongest strategy."
      );

      const completedPlan =
        materializeStrategy({
          strategy:
            optimizationResult
              .bestCandidate
              .strategy,

          profile,
          preferences,
          optimizationResult
        });

      setGenerationMessage(
        "Performing the final nutrition and variety review."
      );

      const finalEvaluation =
        window.ELEVEN_CONSTRAINTS
          .evaluatePlan(
            completedPlan,
            profile,
            completedPlan.constraints
          );

      completedPlan.evaluation =
        finalEvaluation;

      completedPlan.score =
        finalEvaluation.score;

      completedPlan.rating =
        finalEvaluation.rating;

      completedPlan.optimization =
        optimizationResult
          .optimization;

      completedPlan.optimizationLog =
        optimizationResult
          .optimizationLog;

      completedPlan.completedDays =
        [];

      completedPlan.updatedAt =
        new Date().toISOString();

      const saved =
        window.ELEVEN_STORAGE
          .saveMealPlan(
            completedPlan
          );

      if (!saved) {
        throw new Error(
          "The generated plan could not be saved in this browser."
        );
      }

      showGenerationComplete(
        completedPlan
      );

      renderPlan(completedPlan);

      document.dispatchEvent(
        new CustomEvent(
          "eleven:meal-plan-updated",
          {
            detail: {
              mealPlan:
                completedPlan
            }
          }
        )
      );
    } catch (error) {
      console.error(
        "Eleven meal generation failed.",
        error
      );

      showFailure(
        error instanceof Error
          ? error.message
          : "An unexpected meal-generation error occurred."
      );
    } finally {
      setGeneratingState(false);
    }
  }

  /**
   * Turn the winning strategy into actual meals.
   *
   * @param {object} context
   * @returns {object}
   */

  function materializeStrategy(
    context
  ) {
    const {
      strategy,
      profile,
      preferences,
      optimizationResult
    } = context;

    const usageState =
      createFoodUsageState();

    const days =
      strategy.days.map((day) =>
        materializeDay({
          day,
          preferences,
          usageState
        })
      );

    const averageDailyMacros =
      window.ELEVEN_NUTRITION
        .calculateAverageDailyMacros(
          days
        );

    const totalMacros =
      window.ELEVEN_NUTRITION
        .calculatePlanMacros(days);

    return {
      id: createPlanId(),
      version: 1,
      createdAt:
        new Date().toISOString(),

      name:
        "Eleven 11-Day Cycle",

      cycleLengthDays:
        days.length,

      profileSnapshot:
        strategy.profileSnapshot,

      selectedFoodIds:
        [
          ...strategy
            .selectedFoodIds
        ],

      exclusions:
        [
          ...strategy.exclusions
        ],

      targets: {
        ...strategy.targets
      },

      constraints:
        strategy.constraints,

      options:
        strategy.options,

      days,

      macros: {
        totals: totalMacros,
        averageDaily:
          averageDailyMacros
      },

      rotationSummary:
        strategy.rotationSummary,

      planningDecisionLog:
        strategy.decisionLog,

      optimizerCandidateScore:
        optimizationResult
          .bestCandidate.score,

      optimizerCandidateRating:
        optimizationResult
          .bestCandidate.rating
    };
  }

  /**
   * Build one complete day.
   *
   * @param {object} context
   * @returns {object}
   */

  function materializeDay(
    context
  ) {
    const {
      day,
      preferences,
      usageState
    } = context;

    const meals =
      MEAL_ORDER.map(
        (mealType) => {
          const plannedMeal =
            day.meals.find(
              (meal) =>
                meal.mealType ===
                mealType
            );

          if (!plannedMeal) {
            return null;
          }

          return materializeMeal({
            plannedMeal,
            preferences,
            usageState
          });
        }
      ).filter(Boolean);

    const macros =
      window.ELEVEN_NUTRITION
        .calculateDayMacros(meals);

    return {
      day: day.day,
      targets: {
        ...day.targets
      },
      meals,
      macros,
      planningNotes:
        [
          ...(day.planningNotes ||
            [])
        ]
    };
  }

  /**
   * Build one ingredient-level meal.
   *
   * @param {object} context
   * @returns {object}
   */

  function materializeMeal(
    context
  ) {
    const {
      plannedMeal,
      preferences,
      usageState
    } = context;

    const recipe =
      window.getElevenRecipeById(
        plannedMeal.recipeId
      );

    if (!recipe) {
      throw new Error(
        `Recipe ${plannedMeal.recipeId} could not be found.`
      );
    }

    const selectedSet =
      new Set(
        preferences.selectedFoodIds
      );

    const ingredients =
      recipe.ingredients
        .map((ingredient) =>
          chooseIngredient({
            ingredient,
            selectedSet,
            usageState,
            mealType:
              plannedMeal.mealType
          })
        )
        .filter(Boolean);

    if (
      ingredients.length === 0
    ) {
      throw new Error(
        `${recipe.name} did not produce any usable ingredients.`
      );
    }

    const adjustedIngredients =
      adjustMealPortions({
        ingredients,
        target:
          plannedMeal.target
      });

    const macros =
      window.ELEVEN_NUTRITION
        .calculateMealMacros(
          adjustedIngredients
        );

    adjustedIngredients.forEach(
      (ingredient) => {
        incrementUsage(
          usageState,
          ingredient.foodId
        );
      }
    );

    return {
      id: createMealId(
        plannedMeal.day,
        plannedMeal.mealType
      ),

      day:
        plannedMeal.day,

      mealType:
        plannedMeal.mealType,

      recipeId:
        recipe.id,

      name:
        recipe.name,

      description:
        recipe.description,

      icon:
        recipe.icon,

      preparationTimeMinutes:
        recipe
          .preparationTimeMinutes,

      mealPrepFriendly:
        recipe
          .mealPrepFriendly,

      cookingMethods: [
        ...(recipe.cookingMethods ||
          [])
      ],

      ingredients:
        adjustedIngredients,

      instructions: [
        ...(recipe.instructions ||
          [])
      ],

      macros,

      target: {
        ...plannedMeal.target
      },

      candidateScore:
        plannedMeal
          .candidateScore,

      reasons: [
        ...(plannedMeal.reasons ||
          [])
      ],

      alternatives: [
        ...(plannedMeal
          .alternatives || [])
      ]
    };
  }

  /**
   * Select one food for a recipe ingredient.
   *
   * @param {object} context
   * @returns {object|null}
   */

  function chooseIngredient(
    context
  ) {
    const {
      ingredient,
      selectedSet,
      usageState,
      mealType
    } = context;

    if (
      ingredient.optional &&
      Math.random() < 0.28
    ) {
      return null;
    }

    if (
      ingredient.type ===
      "fixed"
    ) {
      if (
        !selectedSet.has(
          ingredient.foodId
        )
      ) {
        return null;
      }

      return createGeneratedIngredient(
        ingredient.foodId,
        ingredient.quantity ?? 1,
        ingredient.role
      );
    }

    const candidates =
      getIngredientCandidates(
        ingredient,
        selectedSet
      );

    if (candidates.length === 0) {
      return null;
    }

    const selectedFood =
      candidates
        .map((food) => ({
          food,
          score:
            scoreIngredientCandidate({
              food,
              ingredient,
              usageState,
              mealType
            })
        }))
        .sort(
          (first, second) =>
            second.score -
            first.score
        )[0].food;

    return createGeneratedIngredient(
      selectedFood.id,
      ingredient.quantity ?? 1,
      ingredient.role
    );
  }

  /**
   * Return eligible foods for a choice ingredient.
   *
   * @param {object} ingredient
   * @param {Set<string>} selectedSet
   * @returns {object[]}
   */

  function getIngredientCandidates(
    ingredient,
    selectedSet
  ) {
    const direct =
      (
        ingredient.allowedFoodIds ||
        []
      )
        .filter((foodId) =>
          selectedSet.has(foodId)
        )
        .map((foodId) =>
          window.getElevenFoodById(
            foodId
          )
        )
        .filter(Boolean);

    const category =
      (
        ingredient.allowedCategories ||
        []
      )
        .flatMap((categoryId) =>
          Array.from(
            selectedSet
          )
            .map((foodId) =>
              window
                .getElevenFoodById(
                  foodId
                )
            )
            .filter(
              (food) =>
                food &&
                food.category ===
                  categoryId
            )
        );

    return [
      ...new Map(
        [
          ...direct,
          ...category
        ].map((food) => [
          food.id,
          food
        ])
      ).values()
    ];
  }

  /**
   * Score ingredient options for rotation.
   *
   * @param {object} context
   * @returns {number}
   */

  function scoreIngredientCandidate(
    context
  ) {
    const {
      food,
      ingredient,
      usageState,
      mealType
    } = context;

    const usage =
      usageState.foodCounts.get(
        food.id
      ) || 0;

    let score =
      100 - usage * 12;

    if (
      food.mealTypes?.includes(
        mealType
      )
    ) {
      score += 8;
    }

    if (
      ingredient.role ===
        "protein" &&
      food.protein >= 25
    ) {
      score += 5;
    }

    if (
      food.isCustom &&
      food.mealTypes?.includes(
        mealType
      )
    ) {
      score += 3;
    }

    score +=
      Math.random() * 4;

    return score;
  }

  /**
   * Create one generated ingredient.
   *
   * @param {string} foodId
   * @param {number} quantity
   * @param {string} role
   * @returns {object}
   */

  function createGeneratedIngredient(
    foodId,
    quantity,
    role
  ) {
    const food =
      window.getElevenFoodById(
        foodId
      );

    if (!food) {
      return null;
    }

    return {
      foodId:
        food.id,

      name:
        food.name,

      brand:
        food.brand || null,

      role:
        role || null,

      quantity:
        normalizeQuantity(
          quantity
        ),

      servingDescription:
        food.servingDescription,

      servingGrams:
        food.servingGrams,

      category:
        food.category,

      isCustom:
        Boolean(
          food.isCustom
        )
    };
  }

  /**
   * Adjust scalable portions toward calorie and protein targets.
   *
   * @param {object} context
   * @returns {object[]}
   */

  function adjustMealPortions(
    context
  ) {
    const {
      ingredients,
      target
    } = context;

    const adjusted =
      ingredients.map(
        (ingredient) => ({
          ...ingredient
        })
      );

    for (
      let pass = 0;
      pass <
      GENERATION_OPTIONS
        .maximumAdjustmentPasses;
      pass += 1
    ) {
      const macros =
        window.ELEVEN_NUTRITION
          .calculateMealMacros(
            adjusted
          );

      const calorieGap =
        target.calories -
        macros.calories;

      const proteinGap =
        target.protein -
        macros.protein;

      const calorieClose =
        Math.abs(calorieGap) <=
        Math.max(
          45,
          target.calories *
            0.1
        );

      const proteinClose =
        proteinGap <= 5 &&
        proteinGap >= -10;

      if (
        calorieClose &&
        proteinClose
      ) {
        break;
      }

      const index =
        chooseIngredientToAdjust({
          ingredients: adjusted,
          calorieGap,
          proteinGap
        });

      if (index === -1) {
        break;
      }

      const direction =
        calorieGap > 0 ||
        proteinGap > 4
          ? 1
          : -1;

      const proposed =
        adjusted[index].quantity +
        direction *
          GENERATION_OPTIONS
            .quantityIncrement;

      const bounded =
        clamp(
          proposed,
          GENERATION_OPTIONS
            .minimumQuantity,
          GENERATION_OPTIONS
            .maximumQuantity
        );

      if (
        bounded ===
        adjusted[index].quantity
      ) {
        break;
      }

      adjusted[index].quantity =
        normalizeQuantity(
          bounded
        );
    }

    return adjusted.map(
      (ingredient) => ({
        ...ingredient,
        displayQuantity:
          formatIngredientQuantity(
            ingredient
          ),

        macros:
          window.ELEVEN_NUTRITION
            .scaleFoodNutrition(
              window
                .getElevenFoodById(
                  ingredient.foodId
                ),
              ingredient.quantity
            )
      })
    );
  }

  /**
   * Choose the best ingredient to scale.
   *
   * @param {object} context
   * @returns {number}
   */

  function chooseIngredientToAdjust(
    context
  ) {
    const {
      ingredients,
      calorieGap,
      proteinGap
    } = context;

    const ranked =
      ingredients.map(
        (ingredient, index) => {
          const food =
            window.getElevenFoodById(
              ingredient.foodId
            );

          let score = 0;

          if (!food) {
            return {
              index,
              score: -1000
            };
          }

          if (proteinGap > 4) {
            score +=
              food.protein * 2;

            if (
              food.category ===
              "protein" ||
              food.category ===
              "dairy"
            ) {
              score += 25;
            }
          }

          if (
            calorieGap > 80 &&
            proteinGap <= 4
          ) {
            if (
              food.category ===
                "carbohydrate" ||
              food.category ===
                "fat"
            ) {
              score += 25;
            }

            score +=
              food.calories * 0.05;
          }

          if (calorieGap < -45) {
            score +=
              food.calories * 0.08;

            if (
              ingredient.quantity <=
              GENERATION_OPTIONS
                .minimumQuantity
            ) {
              score -= 100;
            }
          }

          return {
            index,
            score
          };
        }
      )
        .sort(
          (first, second) =>
            second.score -
            first.score
        );

    return ranked[0]?.score >
      -100
      ? ranked[0].index
      : -1;
  }

  /**
   * Create standalone recipes for selected custom packaged foods.
   *
   * This allows items such as a Kirkland protein shake to participate
   * in planning even though they were not present in recipes.js.
   */

  function prepareCustomFoodRecipes() {
    const customFoods =
      window.ELEVEN_FOODS.filter(
        (food) =>
          food.isCustom
      );

    customFoods.forEach(
      (food) => {
        const recipeId =
          `custom-product-${food.id}`;

        if (
          window.ELEVEN_RECIPES
            .some(
              (recipe) =>
                recipe.id ===
                recipeId
            )
        ) {
          return;
        }

        const suitableMealTypes =
          food.mealTypes?.length
            ? food.mealTypes
            : ["snack"];

        suitableMealTypes.forEach(
          (mealType) => {
            const typedRecipeId =
              `${recipeId}-${mealType}`;

            if (
              window.ELEVEN_RECIPES
                .some(
                  (recipe) =>
                    recipe.id ===
                    typedRecipeId
                )
            ) {
              return;
            }

            window.ELEVEN_RECIPES.push({
              id:
                typedRecipeId,

              name:
                food.brand
                  ? `${food.brand} ${food.name}`
                  : food.name,

              description:
                "A custom packaged product entered from its nutrition label.",

              icon:
                food.icon || "🥤",

              mealType,

              preparationTimeMinutes:
                1,

              cookingMethods: [
                "packaged",
                "no-cook"
              ],

              mealPrepFriendly:
                true,

              tags: [
                "custom-food",
                "packaged",
                "quick"
              ],

              ingredients: [
                {
                  role:
                    food.category ===
                      "protein" ||
                    food.category ===
                      "dairy"
                      ? "protein"
                      : "custom",

                  type: "fixed",
                  foodId:
                    food.id,
                  quantity: 1
                }
              ],

              instructions: [
                "Use one labelled serving.",
                "Keep refrigerated if required by the product packaging."
              ],

              isCustomRecipe:
                true
            });
          }
        );
      }
    );
  }

  /**
   * Restore a previously generated plan.
   */

  function restoreSavedPlan() {
    const plan =
      window.ELEVEN_STORAGE
        .getMealPlan();

    if (plan) {
      renderPlan(plan);
    }
  }

  /**
   * Render the complete plan.
   *
   * @param {object} plan
   */

  function renderPlan(plan) {
    planContainer.innerHTML = "";

    if (comingSoonCard) {
      comingSoonCard.hidden = true;
    }

    const summary =
      createPlanSummary(plan);

    planContainer.appendChild(
      summary
    );

    plan.days.forEach((day) => {
      planContainer.appendChild(
        createDayCard(day)
      );
    });
  }

  /**
   * Create plan-quality summary.
   *
   * @param {object} plan
   * @returns {HTMLElement}
   */

  function createPlanSummary(plan) {
    const element =
      document.createElement(
        "article"
      );

    element.className =
      "plan-quality-card";

    const score =
      Number(plan.score) || 0;

    const average =
      plan.macros
        ?.averageDaily || {};

    element.innerHTML = `
      <div>
        <p class="eyebrow">
          Plan quality
        </p>

        <h2>
          ${escapeHtml(
            plan.rating ||
            "Generated plan"
          )}
        </h2>

        <p>
          Eleven optimized this cycle using your saved profile,
          food preferences, nutrition targets, and rotation rules.
        </p>
      </div>

      <div class="plan-quality-score">
        <strong>
          ${score.toFixed(1)}
        </strong>

        <span>
          out of 100
        </span>
      </div>

      <div class="plan-quality-macros">
        <span>
          <strong>
            ${formatCalories(
              average.calories
            )}
          </strong>
          average calories
        </span>

        <span>
          <strong>
            ${formatMacro(
              average.protein
            )} protein
          </strong>
          daily average
        </span>

        <span>
          <strong>
            ${formatMacro(
              average.fibre
            )} fibre
          </strong>
          daily average
        </span>
      </div>
    `;

    return element;
  }

  /**
   * Create one day card.
   *
   * @param {object} day
   * @returns {HTMLElement}
   */

  function createDayCard(day) {
    const card =
      document.createElement(
        "article"
      );

    card.className =
      "meal-plan-day-card";

    const mealsHtml =
      day.meals
        .map(createMealHtml)
        .join("");

    card.innerHTML = `
      <div class="meal-plan-day-header">
        <div>
          <p class="eyebrow">
            Eleven cycle
          </p>

          <h2>
            Day ${day.day}
          </h2>
        </div>

        <div class="day-macro-summary">
          <span>
            ${formatCalories(
              day.macros.calories
            )}
          </span>

          <span>
            ${formatMacro(
              day.macros.protein
            )} protein
          </span>

          <span>
            ${formatMacro(
              day.macros.fibre
            )} fibre
          </span>
        </div>
      </div>

      <div class="generated-meal-grid">
        ${mealsHtml}
      </div>
    `;

    return card;
  }

  /**
   * Render one meal as HTML.
   *
   * @param {object} meal
   * @returns {string}
   */

  function createMealHtml(meal) {
    const ingredients =
      meal.ingredients
        .map(
          (ingredient) => `
            <li>
              <span>
                ${escapeHtml(
                  ingredient.name
                )}
              </span>

              <strong>
                ${escapeHtml(
                  ingredient
                    .displayQuantity
                )}
              </strong>
            </li>
          `
        )
        .join("");

    return `
      <section class="generated-meal-card">
        <div class="generated-meal-heading">
          <span class="generated-meal-icon">
            ${escapeHtml(
              meal.icon || "🍽️"
            )}
          </span>

          <div>
            <small>
              ${escapeHtml(
                MEAL_LABELS[
                  meal.mealType
                ] ||
                meal.mealType
              )}
            </small>

            <h3>
              ${escapeHtml(
                meal.name
              )}
            </h3>
          </div>
        </div>

        <p>
          ${escapeHtml(
            meal.description ||
            ""
          )}
        </p>

        <ul class="generated-ingredient-list">
          ${ingredients}
        </ul>

        <div class="generated-meal-macros">
          <span>
            ${formatCalories(
              meal.macros.calories
            )}
          </span>

          <span>
            ${formatMacro(
              meal.macros.protein
            )} protein
          </span>

          <span>
            ${formatMacro(
              meal.macros
                .carbohydrates
            )} carbs
          </span>

          <span>
            ${formatMacro(
              meal.macros.fat
            )} fat
          </span>
        </div>
      </section>
    `;
  }

  /**
   * Update progress from optimizer callback.
   *
   * @param {object} progress
   */

  function updateOptimizationProgress(
    progress
  ) {
    const maximum =
      progress.maximumAttempts ||
      1;

    const attempt =
      progress.attemptNumber ||
      0;

    const percentage =
      progress.status ===
        "complete"
        ? 100
        : Math.min(
            98,
            attempt /
              maximum *
              100
          );

    setProgressBar(
      percentage
    );

    setGenerationScore(
      progress.bestScore || 0
    );

    setGenerationMessage(
      progress.message ||
      "Optimizing your plan."
    );
  }

  /**
   * Show successful completion.
   *
   * @param {object} plan
   */

  function showGenerationComplete(
    plan
  ) {
    generationStatus.hidden =
      false;

    setProgressBar(100);

    setGenerationScore(
      plan.score
    );

    setGenerationTitle(
      `${plan.rating} plan ready`
    );

    setGenerationMessage(
      `Your complete ${plan.days.length}-day cycle has been saved in this browser.`
    );
  }

  /**
   * Show generation failure.
   *
   * @param {string} message
   */

  function showFailure(message) {
    generationStatus.hidden =
      false;

    generationStatus.classList.add(
      "is-error"
    );

    setGenerationTitle(
      "Plan generation stopped"
    );

    setGenerationMessage(
      message
    );

    setGenerationScore(0);
    setProgressBar(0);
  }

  /**
   * Reset generation status.
   */

  function resetGenerationStatus() {
    generationStatus.hidden =
      false;

    generationStatus.classList.remove(
      "is-error"
    );

    setGenerationTitle(
      "Building your plan"
    );

    setGenerationMessage(
      "Preparing your selected foods and recipes."
    );

    setGenerationScore(0);
    setProgressBar(2);
  }

  /**
   * Toggle generating UI state.
   *
   * @param {boolean} generating
   */

  function setGeneratingState(
    generating
  ) {
    isGenerating = generating;

    generateButton.disabled =
      generating;

    generateButton.textContent =
      generating
        ? "Optimizing plan…"
        : "Generate new plan";

    refreshAvailability();
  }

  /**
   * Food usage state.
   *
   * @returns {object}
   */

  function createFoodUsageState() {
    return {
      foodCounts:
        new Map()
    };
  }

  /**
   * Increase food usage count.
   *
   * @param {object} state
   * @param {string} foodId
   */

  function incrementUsage(
    state,
    foodId
  ) {
    state.foodCounts.set(
      foodId,
      (
        state.foodCounts.get(
          foodId
        ) || 0
      ) + 1
    );
  }

  /**
   * Format serving quantity.
   *
   * @param {object} ingredient
   * @returns {string}
   */

  function formatIngredientQuantity(
    ingredient
  ) {
    const quantity =
      normalizeQuantity(
        ingredient.quantity
      );

    if (quantity === 1) {
      return ingredient
        .servingDescription;
    }

    if (
      ingredient.servingGrams >
      0
    ) {
      const amount =
        ingredient.servingGrams *
        quantity;

      return `${formatNumber(
        amount
      )} g`;
    }

    return `${formatNumber(
      quantity
    )} × ${ingredient.servingDescription}`;
  }

  /**
   * UI setters.
   */

  function setGenerationTitle(
    value
  ) {
    setText(
      "generation-status-title",
      value
    );
  }

  function setGenerationMessage(
    value
  ) {
    setText(
      "generation-status-message",
      value
    );
  }

  function setGenerationScore(
    value
  ) {
    const numericValue =
      Number(value) || 0;

    setText(
      "generation-best-score",
      numericValue.toFixed(1)
    );
  }

  function setProgressBar(
    percentage
  ) {
    const bar =
      document.getElementById(
        "generation-progress-bar"
      );

    if (bar) {
      bar.style.width =
        `${clamp(
          percentage,
          0,
          100
        )}%`;
    }
  }

  function setText(
    elementId,
    value
  ) {
    const element =
      document.getElementById(
        elementId
      );

    if (element) {
      element.textContent =
        value ?? "";
    }
  }

  /**
   * Formatting and utility functions.
   */

  function formatCalories(value) {
    return `${Math.round(
      Number(value) || 0
    ).toLocaleString(
      "en-CA"
    )} kcal`;
  }

  function formatMacro(value) {
    const number =
      Number(value) || 0;

    return `${number.toLocaleString(
      "en-CA",
      {
        maximumFractionDigits: 1
      }
    )} g`;
  }

  function formatNumber(value) {
    return Number(value)
      .toLocaleString(
        "en-CA",
        {
          maximumFractionDigits: 1
        }
      );
  }

  function normalizeQuantity(value) {
    return Math.round(
      (
        Number(value) || 0
      ) * 4
    ) / 4;
  }

  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      Math.max(
        Number(value) || 0,
        minimum
      ),
      maximum
    );
  }

  function escapeHtml(value) {
    return String(
      value ?? ""
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createPlanId() {
    return [
      "plan",
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 9)
    ].join("-");
  }

  function createMealId(
    day,
    mealType
  ) {
    return [
      "meal",
      day,
      mealType,
      Math.random()
        .toString(36)
        .slice(2, 8)
    ].join("-");
  }

  return {
    init,
    generatePlan,
    renderPlan,
    restoreSavedPlan,
    prepareCustomFoodRecipes,
    refreshAvailability
  };
})();
