"use strict";

/**
 * Eleven planning engine
 *
 * The planner creates the strategy for a nutrition cycle.
 *
 * It does not yet calculate final portions or generate the complete
 * meal plan. Instead, it decides:
 *
 * - Daily calorie and macro targets
 * - Meal-level targets
 * - Candidate recipes for each meal
 * - Recipe sequence and food rotation
 * - Variety and repetition penalties
 * - Constraint-aware planning decisions
 *
 * The future meal generator will use this strategy to build the
 * complete ingredient-level plan.
 */

window.ELEVEN_PLANNER = (() => {
  const DEFAULT_OPTIONS = {
    cycleLengthDays: 11,
    mealsPerDay: 4,
    mealTypes: [
      "breakfast",
      "lunch",
      "dinner",
      "snack"
    ],
    candidateLimitPerMeal: 8,
    randomVariation: 4,
    prioritizeMealPrep: true,
    prioritizeVariety: true,
    useCalorieShifting: true
  };

  const DEFAULT_MEAL_SHARES = {
    breakfast: {
      calories: 0.25,
      protein: 0.24
    },
    lunch: {
      calories: 0.3,
      protein: 0.28
    },
    dinner: {
      calories: 0.32,
      protein: 0.3
    },
    snack: {
      calories: 0.13,
      protein: 0.18
    }
  };

  const FISH_FOOD_IDS = [
    "salmon",
    "cod",
    "canned-tuna",
    "shrimp"
  ];

  const EGG_FOOD_IDS = [
    "whole-eggs",
    "egg-whites"
  ];

  const SHAKE_RECIPE_IDS = [
    "protein-smoothie",
    "protein-shake-snack"
  ];

  /**
   * Create the complete planning strategy.
   *
   * @param {object} profile
   * @param {object|string[]} suppliedPreferences
   * @param {object} suppliedConstraints
   * @param {object} suppliedOptions
   * @returns {object}
   */

  function createCycleStrategy(
    profile,
    suppliedPreferences = {},
    suppliedConstraints = {},
    suppliedOptions = {}
  ) {
    const validation = validatePlanningInputs(
      profile,
      suppliedPreferences
    );

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
        strategy: null
      };
    }

    const options = normalizeOptions(
      suppliedOptions
    );

    const constraints =
      window.ELEVEN_CONSTRAINTS
        .createConstraints({
          ...suppliedConstraints,
          cycleLengthDays:
            suppliedConstraints
              .cycleLengthDays ??
            options.cycleLengthDays
        });

    const selectedFoodIds =
      normalizeSelectedFoodIds(
        suppliedPreferences
      );

    const exclusions =
      normalizeExclusions(
        suppliedPreferences
      );

    const targets =
      getProfileTargets(profile);

    if (!targets) {
      return {
        success: false,
        errors: [
          "Eleven could not calculate profile nutrition targets."
        ],
        warnings: [],
        strategy: null
      };
    }

    const dailyTargets =
      createDailyTargets(
        targets,
        options,
        constraints
      );

    const eligibleRecipes =
      getEligibleRecipes(
        selectedFoodIds,
        exclusions
      );

    const recipeAvailability =
      validateRecipeAvailability(
        eligibleRecipes,
        options.mealTypes
      );

    if (!recipeAvailability.isValid) {
      return {
        success: false,
        errors:
          recipeAvailability.errors,
        warnings:
          recipeAvailability.warnings,
        strategy: null
      };
    }

    const planningState =
      createPlanningState();

    const days = dailyTargets.map(
      (dayTargets) =>
        planDay({
          dayTargets,
          eligibleRecipes,
          selectedFoodIds,
          exclusions,
          constraints,
          options,
          planningState
        })
    );

    const decisionLog =
      buildCycleDecisionLog({
        profile,
        targets,
        days,
        planningState,
        constraints,
        selectedFoodIds
      });

    const strategy = {
      id: createStrategyId(),
      version: 1,
      createdAt:
        new Date().toISOString(),

      profileSnapshot:
        createProfileSnapshot(profile),

      selectedFoodIds:
        [...selectedFoodIds],

      exclusions:
        [...exclusions],

      targets: {
        calorieTarget:
          targets.calorieTarget,
        proteinTarget:
          targets.proteinTarget,
        maintenanceCalories:
          targets.maintenanceCalories,
        bmi: targets.bmi,
        estimatedWeeksToGoal:
          targets.estimatedWeeksToGoal
      },

      constraints,
      options,
      days,

      rotationSummary:
        createRotationSummary(
          planningState
        ),

      decisionLog,

      planningState:
        serializePlanningState(
          planningState
        )
    };

    return {
      success: true,
      errors: [],
      warnings: [
        ...validation.warnings,
        ...recipeAvailability.warnings
      ],
      strategy
    };
  }

  /**
   * Plan one day.
   *
   * @param {object} context
   * @returns {object}
   */

  function planDay(context) {
    const {
      dayTargets,
      eligibleRecipes,
      selectedFoodIds,
      exclusions,
      constraints,
      options,
      planningState
    } = context;

    const meals = [];

    options.mealTypes.forEach(
      (mealType) => {
        const mealTarget =
          createMealTarget(
            dayTargets,
            mealType
          );

        const candidates =
          eligibleRecipes.filter(
            (recipe) =>
              recipe.mealType ===
              mealType
          );

        const rankedCandidates =
          rankRecipeCandidates({
            candidates,
            mealType,
            dayNumber:
              dayTargets.day,
            mealTarget,
            selectedFoodIds,
            exclusions,
            constraints,
            options,
            planningState
          });

        const selectedCandidate =
          rankedCandidates[0] ||
          null;

        if (!selectedCandidate) {
          meals.push({
            mealType,
            target: mealTarget,
            recipeId: null,
            recipeName:
              "No eligible recipe",
            score: 0,
            reasons: [
              "No eligible recipe was available for this meal."
            ],
            alternatives: []
          });

          return;
        }

        const plannedMeal =
          createPlannedMeal({
            candidate:
              selectedCandidate,
            alternatives:
              rankedCandidates.slice(
                1,
                options
                  .candidateLimitPerMeal
              ),
            mealType,
            mealTarget,
            dayNumber:
              dayTargets.day
          });

        meals.push(plannedMeal);

        updatePlanningState({
          plannedMeal,
          planningState
        });
      }
    );

    return {
      day: dayTargets.day,
      targets: {
        calories:
          dayTargets.calories,
        protein:
          dayTargets.protein,
        carbohydrates:
          dayTargets.carbohydrates,
        fat:
          dayTargets.fat,
        fibre:
          dayTargets.fibre
      },
      meals,
      planningNotes:
        createDayPlanningNotes(
          dayTargets,
          meals
        )
    };
  }

  /**
   * Rank recipes for one meal.
   *
   * @param {object} context
   * @returns {object[]}
   */

  function rankRecipeCandidates(context) {
    const {
      candidates,
      mealType,
      dayNumber,
      mealTarget,
      selectedFoodIds,
      exclusions,
      constraints,
      options,
      planningState
    } = context;

    return candidates
      .map((recipe) =>
        scoreRecipeCandidate({
          recipe,
          mealType,
          dayNumber,
          mealTarget,
          selectedFoodIds,
          exclusions,
          constraints,
          options,
          planningState
        })
      )
      .filter(
        (candidate) =>
          candidate.isEligible
      )
      .sort(
        (first, second) =>
          second.score -
          first.score
      );
  }

  /**
   * Score one recipe candidate.
   *
   * @param {object} context
   * @returns {object}
   */

  function scoreRecipeCandidate(context) {
    const {
      recipe,
      mealType,
      dayNumber,
      mealTarget,
      selectedFoodIds,
      constraints,
      options,
      planningState
    } = context;

    const eligibility =
      evaluateRecipeEligibility({
        recipe,
        selectedFoodIds,
        mealType
      });

    if (!eligibility.isEligible) {
      return {
        recipe,
        recipeId: recipe.id,
        score: 0,
        isEligible: false,
        reasons:
          eligibility.reasons,
        penalties: [],
        bonuses: []
      };
    }

    let score = 70;

    const bonuses = [];
    const penalties = [];
    const reasons = [];

    const recipeFoodIds =
      getRecipePossibleFoodIds(
        recipe,
        selectedFoodIds
      );

    const primaryProteinIds =
      getRecipeFoodIdsByCategory(
        recipe,
        selectedFoodIds,
        "protein"
      );

    const vegetableIds =
      getRecipeFoodIdsByCategory(
        recipe,
        selectedFoodIds,
        "vegetable"
      );

    const fruitIds =
      getRecipeFoodIdsByCategory(
        recipe,
        selectedFoodIds,
        "fruit"
      );

    const carbohydrateIds =
      getRecipeFoodIdsByCategory(
        recipe,
        selectedFoodIds,
        "carbohydrate"
      );

    const recipeUseCount =
      getMapValue(
        planningState.recipeCounts,
        recipe.id
      );

    const mealTypeUseCount =
      getMapValue(
        planningState
          .recipeCountsByMealType[
            mealType
          ],
        recipe.id
      );

    const previousDayRecipeId =
      planningState
        .previousDayRecipes[
          mealType
        ];

    const previousPrimaryProteins =
      planningState
        .previousDayPrimaryProteins;

    if (recipeUseCount === 0) {
      score += 12;

      bonuses.push({
        amount: 12,
        reason:
          "This recipe has not been used in the cycle."
      });
    } else {
      const repeatPenalty =
        recipeUseCount * 7;

      score -= repeatPenalty;

      penalties.push({
        amount:
          repeatPenalty,
        reason:
          `This recipe has already been used ${recipeUseCount} time${
            recipeUseCount === 1
              ? ""
              : "s"
          }.`
      });
    }

    if (
      previousDayRecipeId ===
      recipe.id
    ) {
      score -= 30;

      penalties.push({
        amount: 30,
        reason:
          "The same recipe appeared for this meal on the previous day."
      });
    }

    const maximumByMealType =
      mealType === "breakfast"
        ? constraints.repetition
            .maximumSameBreakfastPerCycle
        : mealType === "dinner"
          ? constraints.repetition
              .maximumSameDinnerPerCycle
          : constraints.repetition
              .maximumSameRecipePerCycle;

    if (
      mealTypeUseCount >=
      maximumByMealType
    ) {
      score -= 35;

      penalties.push({
        amount: 35,
        reason:
          `This recipe has reached the preferred ${mealType} frequency limit.`
      });
    }

    const repeatedPrimaryProtein =
      primaryProteinIds.some(
        (foodId) =>
          previousPrimaryProteins
            .includes(foodId)
      );

    if (repeatedPrimaryProtein) {
      score -= 10;

      penalties.push({
        amount: 10,
        reason:
          "Its primary protein was used on the previous day."
      });
    } else if (
      primaryProteinIds.length >
      0
    ) {
      score += 5;

      bonuses.push({
        amount: 5,
        reason:
          "It improves primary-protein rotation."
      });
    }

    const unusedVegetables =
      vegetableIds.filter(
        (foodId) =>
          getMapValue(
            planningState
              .foodCounts,
            foodId
          ) === 0
      );

    if (
      unusedVegetables.length >
      0
    ) {
      score += Math.min(
        unusedVegetables.length *
          4,
        8
      );

      bonuses.push({
        amount: Math.min(
          unusedVegetables.length *
            4,
          8
        ),
        reason:
          "It introduces vegetable variety."
      });
    }

    const unusedFruits =
      fruitIds.filter(
        (foodId) =>
          getMapValue(
            planningState
              .foodCounts,
            foodId
          ) === 0
      );

    if (
      unusedFruits.length >
      0
    ) {
      score += 4;

      bonuses.push({
        amount: 4,
        reason:
          "It introduces a fruit not yet used in the cycle."
      });
    }

    const unusedCarbohydrates =
      carbohydrateIds.filter(
        (foodId) =>
          getMapValue(
            planningState
              .foodCounts,
            foodId
          ) === 0
      );

    if (
      unusedCarbohydrates.length >
      0
    ) {
      score += 3;

      bonuses.push({
        amount: 3,
        reason:
          "It improves carbohydrate-source variety."
      });
    }

    if (
      options.prioritizeMealPrep &&
      recipe.mealPrepFriendly
    ) {
      score += 6;

      bonuses.push({
        amount: 6,
        reason:
          "This recipe is suitable for advance meal preparation."
      });
    }

    const estimatedMacros =
      estimateRecipeMacros(
        recipe,
        selectedFoodIds
      );

    const macroScore =
      scoreEstimatedMacros(
        estimatedMacros,
        mealTarget
      );

    score +=
      macroScore.adjustment;

    if (
      macroScore.adjustment >= 0
    ) {
      bonuses.push({
        amount:
          macroScore.adjustment,
        reason:
          macroScore.reason
      });
    } else {
      penalties.push({
        amount:
          Math.abs(
            macroScore.adjustment
          ),
        reason:
          macroScore.reason
      });
    }

    const frequencyScore =
      evaluateFrequencyRules({
        recipe,
        recipeFoodIds,
        mealType,
        dayNumber,
        planningState,
        constraints
      });

    score +=
      frequencyScore.adjustment;

    bonuses.push(
      ...frequencyScore.bonuses
    );

    penalties.push(
      ...frequencyScore.penalties
    );

    const selectedFoodCoverage =
      recipeFoodIds.filter(
        (foodId) =>
          selectedFoodIds.has(
            foodId
          )
      ).length;

    if (
      selectedFoodCoverage >= 3
    ) {
      score += 4;

      bonuses.push({
        amount: 4,
        reason:
          "The recipe strongly reflects the user's preferred foods."
      });
    }

    if (
      options.randomVariation >
      0
    ) {
      const randomAdjustment =
        randomBetween(
          -options.randomVariation,
          options.randomVariation
        );

      score += randomAdjustment;
    }

    reasons.push(
      ...bonuses.map(
        (item) => item.reason
      )
    );

    if (
      reasons.length === 0
    ) {
      reasons.push(
        "This recipe provides a reasonable fit for the meal target."
      );
    }

    return {
      recipe,
      recipeId: recipe.id,
      score: roundNumber(
        clamp(score, 0, 100),
        1
      ),
      isEligible: true,
      estimatedMacros,
      possibleFoodIds:
        recipeFoodIds,
      primaryProteinIds,
      vegetableIds,
      fruitIds,
      carbohydrateIds,
      reasons,
      penalties,
      bonuses
    };
  }

  /**
   * Evaluate recipe frequency limits.
   *
   * @param {object} context
   * @returns {object}
   */

  function evaluateFrequencyRules(context) {
    const {
      recipe,
      recipeFoodIds,
      mealType,
      planningState,
      constraints
    } = context;

    let adjustment = 0;

    const bonuses = [];
    const penalties = [];

    const containsSteak =
      recipeFoodIds.includes(
        "sirloin-steak"
      );

    const containsFish =
      recipeFoodIds.some(
        (foodId) =>
          FISH_FOOD_IDS.includes(
            foodId
          )
      );

    const containsEggs =
      recipeFoodIds.some(
        (foodId) =>
          EGG_FOOD_IDS.includes(
            foodId
          )
      );

    const isShake =
      SHAKE_RECIPE_IDS.includes(
        recipe.id
      ) ||
      recipeFoodIds.some(
        isCustomProteinShakeId
      );

    if (containsSteak) {
      const steakCount =
        planningState
          .specialCounts.steak;

      const maximum =
        constraints.foodFrequency
          .maximumSteakMealsPerCycle;

      if (
        steakCount >= maximum
      ) {
        adjustment -= 50;

        penalties.push({
          amount: 50,
          reason:
            "The preferred steak limit has already been reached."
        });
      } else {
        adjustment -=
          steakCount * 5;
      }
    }

    if (containsFish) {
      const fishCount =
        planningState
          .specialCounts.fish;

      const minimum =
        constraints.foodFrequency
          .minimumFishMealsPerCycle;

      if (
        fishCount < minimum
      ) {
        adjustment += 10;

        bonuses.push({
          amount: 10,
          reason:
            "This meal helps satisfy the fish-rotation target."
        });
      }
    }

    if (
      containsEggs &&
      mealType === "breakfast"
    ) {
      const eggCount =
        planningState
          .specialCounts
          .eggBreakfasts;

      const maximum =
        constraints.foodFrequency
          .maximumEggBreakfastsPerCycle;

      if (
        eggCount >= maximum
      ) {
        adjustment -= 40;

        penalties.push({
          amount: 40,
          reason:
            "The preferred egg-breakfast limit has already been reached."
        });
      }
    }

    if (isShake) {
      const totalShakes =
        planningState
          .specialCounts.shakes;

      const maximum =
        constraints.foodFrequency
          .maximumProteinShakesPerCycle;

      if (
        totalShakes >= maximum
      ) {
        adjustment -= 60;

        penalties.push({
          amount: 60,
          reason:
            "The cycle protein-shake limit has already been reached."
        });
      } else if (
        planningState
          .currentDayShakeCount >=
        constraints.foodFrequency
          .maximumProteinShakesPerDay
      ) {
        adjustment -= 80;

        penalties.push({
          amount: 80,
          reason:
            "A protein shake is already planned for this day."
        });
      }
    }

    return {
      adjustment,
      bonuses,
      penalties
    };
  }

  /**
   * Create meal-level target allocation.
   *
   * @param {object} dayTargets
   * @param {string} mealType
   * @returns {object}
   */

  function createMealTarget(
    dayTargets,
    mealType
  ) {
    const shares =
      DEFAULT_MEAL_SHARES[
        mealType
      ] ||
      DEFAULT_MEAL_SHARES.snack;

    return {
      calories: roundToNearest(
        dayTargets.calories *
          shares.calories,
        5
      ),

      protein: roundToNearest(
        dayTargets.protein *
          shares.protein,
        1
      ),

      carbohydrates:
        roundToNearest(
          dayTargets
            .carbohydrates *
            shares.calories,
          1
        ),

      fat: roundToNearest(
        dayTargets.fat *
          shares.calories,
        1
      ),

      fibre: roundToNearest(
        dayTargets.fibre *
          shares.calories,
        1
      )
    };
  }

  /**
   * Create a planned meal record.
   *
   * @param {object} context
   * @returns {object}
   */

  function createPlannedMeal(context) {
    const {
      candidate,
      alternatives,
      mealType,
      mealTarget,
      dayNumber
    } = context;

    return {
      day: dayNumber,
      mealType,
      target: mealTarget,

      recipeId:
        candidate.recipe.id,

      recipeName:
        candidate.recipe.name,

      recipeDescription:
        candidate.recipe
          .description,

      recipeIcon:
        candidate.recipe.icon,

      preparationTimeMinutes:
        candidate.recipe
          .preparationTimeMinutes,

      mealPrepFriendly:
        candidate.recipe
          .mealPrepFriendly,

      candidateScore:
        candidate.score,

      estimatedMacros:
        candidate
          .estimatedMacros,

      possibleFoodIds:
        candidate
          .possibleFoodIds,

      primaryProteinIds:
        candidate
          .primaryProteinIds,

      vegetableIds:
        candidate
          .vegetableIds,

      fruitIds:
        candidate.fruitIds,

      carbohydrateIds:
        candidate
          .carbohydrateIds,

      reasons:
        candidate.reasons,

      penalties:
        candidate.penalties,

      alternatives:
        alternatives.map(
          (alternative) => ({
            recipeId:
              alternative.recipe.id,
            recipeName:
              alternative.recipe.name,
            score:
              alternative.score,
            reasons:
              alternative.reasons
                .slice(0, 3)
          })
        )
    };
  }

  /**
   * Update rotation history after selecting a meal.
   *
   * @param {object} context
   */

  function updatePlanningState(context) {
    const {
      plannedMeal,
      planningState
    } = context;

    incrementMapValue(
      planningState.recipeCounts,
      plannedMeal.recipeId
    );

    incrementMapValue(
      planningState
        .recipeCountsByMealType[
          plannedMeal.mealType
        ],
      plannedMeal.recipeId
    );

    plannedMeal.possibleFoodIds
      .forEach((foodId) => {
        incrementMapValue(
          planningState.foodCounts,
          foodId
        );
      });

    plannedMeal.primaryProteinIds
      .forEach((foodId) => {
        incrementMapValue(
          planningState
            .proteinCounts,
          foodId
        );
      });

    plannedMeal.vegetableIds
      .forEach((foodId) => {
        incrementMapValue(
          planningState
            .vegetableCounts,
          foodId
        );
      });

    plannedMeal.fruitIds
      .forEach((foodId) => {
        incrementMapValue(
          planningState
            .fruitCounts,
          foodId
        );
      });

    plannedMeal.carbohydrateIds
      .forEach((foodId) => {
        incrementMapValue(
          planningState
            .carbohydrateCounts,
          foodId
        );
      });

    planningState
      .previousDayRecipes[
        plannedMeal.mealType
      ] =
      plannedMeal.recipeId;

    if (
      plannedMeal.mealType ===
      "dinner"
    ) {
      planningState
        .previousDayPrimaryProteins =
        [
          ...plannedMeal
            .primaryProteinIds
        ];

      planningState
        .currentDayShakeCount = 0;
    }

    if (
      plannedMeal.possibleFoodIds
        .includes(
          "sirloin-steak"
        )
    ) {
      planningState
        .specialCounts.steak += 1;
    }

    if (
      plannedMeal.possibleFoodIds
        .some(
          (foodId) =>
            FISH_FOOD_IDS
              .includes(foodId)
        )
    ) {
      planningState
        .specialCounts.fish += 1;
    }

    if (
      plannedMeal.mealType ===
        "breakfast" &&
      plannedMeal.possibleFoodIds
        .some(
          (foodId) =>
            EGG_FOOD_IDS
              .includes(foodId)
        )
    ) {
      planningState
        .specialCounts
        .eggBreakfasts += 1;
    }

    if (
      SHAKE_RECIPE_IDS.includes(
        plannedMeal.recipeId
      ) ||
      plannedMeal.possibleFoodIds
        .some(
          isCustomProteinShakeId
        )
    ) {
      planningState
        .specialCounts.shakes += 1;

      planningState
        .currentDayShakeCount += 1;
    }
  }

  /**
   * Create daily cycle targets.
   *
   * @param {object} targets
   * @param {object} options
   * @param {object} constraints
   * @returns {object[]}
   */

  function createDailyTargets(
    targets,
    options,
    constraints
  ) {
    const cycleLength =
      constraints.cycleLengthDays;

    if (
      options.useCalorieShifting &&
      cycleLength === 11 &&
      window.ELEVEN_NUTRITION &&
      typeof window
        .ELEVEN_NUTRITION
        .createElevenDayTargets ===
        "function"
    ) {
      return window
        .ELEVEN_NUTRITION
        .createElevenDayTargets(
          targets.calorieTarget,
          targets.proteinTarget
        );
    }

    return Array.from(
      {
        length: cycleLength
      },
      (_, index) => ({
        day: index + 1,
        ...window
          .ELEVEN_NUTRITION
          .createDailyMacroTargets(
            targets.calorieTarget,
            targets.proteinTarget
          )
      })
    );
  }

  /**
   * Get eligible recipes.
   *
   * @param {Set<string>} selectedFoodIds
   * @param {string[]} exclusions
   * @returns {object[]}
   */

  function getEligibleRecipes(
    selectedFoodIds,
    exclusions
  ) {
    const selectedArray =
      Array.from(selectedFoodIds);

    const eligible =
      typeof window
        .getEligibleElevenRecipes ===
      "function"
        ? window
            .getEligibleElevenRecipes(
              selectedArray
            )
        : window.ELEVEN_RECIPES ||
          [];

    return eligible.filter(
      (recipe) =>
        !recipeContainsExcludedText(
          recipe,
          exclusions
        )
    );
  }

  /**
   * Validate recipe availability by meal type.
   *
   * @param {object[]} eligibleRecipes
   * @param {string[]} mealTypes
   * @returns {object}
   */

  function validateRecipeAvailability(
    eligibleRecipes,
    mealTypes
  ) {
    const errors = [];
    const warnings = [];

    mealTypes.forEach(
      (mealType) => {
        const count =
          eligibleRecipes.filter(
            (recipe) =>
              recipe.mealType ===
              mealType
          ).length;

        if (count === 0) {
          errors.push(
            `No eligible ${mealType} recipes are available from the selected foods.`
          );
        } else if (count < 3) {
          warnings.push(
            `Only ${count} eligible ${mealType} recipe${
              count === 1
                ? " is"
                : "s are"
            } available. Select more foods for better variety.`
          );
        }
      }
    );

    return {
      isValid:
        errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Evaluate whether a recipe is usable.
   *
   * @param {object} context
   * @returns {object}
   */

  function evaluateRecipeEligibility(
    context
  ) {
    const {
      recipe,
      selectedFoodIds,
      mealType
    } = context;

    const reasons = [];

    if (
      recipe.mealType !== mealType
    ) {
      reasons.push(
        "Recipe meal type does not match."
      );
    }

    const requiredIngredients =
      recipe.ingredients.filter(
        (ingredient) =>
          !ingredient.optional
      );

    requiredIngredients.forEach(
      (ingredient) => {
        if (
          ingredient.type ===
          "fixed" &&
          !selectedFoodIds.has(
            ingredient.foodId
          )
        ) {
          reasons.push(
            `${ingredient.foodId} is not selected.`
          );
        }

        if (
          ingredient.type ===
          "choice"
        ) {
          const availableChoices =
            getIngredientAvailableFoodIds(
              ingredient,
              selectedFoodIds
            );

          if (
            availableChoices.length ===
            0
          ) {
            reasons.push(
              "No selected food satisfies one of the recipe choices."
            );
          }
        }
      }
    );

    return {
      isEligible:
        reasons.length === 0,
      reasons
    };
  }

  /**
   * Estimate recipe macros using the first available choice.
   *
   * Final quantities will be calculated by the Meal Generator.
   *
   * @param {object} recipe
   * @param {Set<string>} selectedFoodIds
   * @returns {object}
   */

  function estimateRecipeMacros(
    recipe,
    selectedFoodIds
  ) {
    const ingredients =
      recipe.ingredients
        .map((ingredient) => {
          const foodId =
            chooseRepresentativeFoodId(
              ingredient,
              selectedFoodIds
            );

          if (!foodId) {
            return null;
          }

          return {
            foodId,
            quantity:
              ingredient.quantity ??
              1
          };
        })
        .filter(Boolean);

    return window
      .ELEVEN_NUTRITION
      .calculateMealMacros(
        ingredients
      );
  }

  /**
   * Score estimated macros against meal target.
   *
   * @param {object} macros
   * @param {object} target
   * @returns {object}
   */

  function scoreEstimatedMacros(
    macros,
    target
  ) {
    const calorieDifference =
      target.calories > 0
        ? Math.abs(
            macros.calories -
            target.calories
          ) /
          target.calories
        : 1;

    const proteinDifference =
      target.protein > 0
        ? Math.abs(
            macros.protein -
            target.protein
          ) /
          target.protein
        : 1;

    const combinedDifference =
      calorieDifference * 0.55 +
      proteinDifference * 0.45;

    if (
      combinedDifference <= 0.12
    ) {
      return {
        adjustment: 12,
        reason:
          "Estimated calories and protein closely match this meal's target."
      };
    }

    if (
      combinedDifference <= 0.25
    ) {
      return {
        adjustment: 6,
        reason:
          "Estimated nutrition is reasonably close to the meal target."
      };
    }

    if (
      combinedDifference <= 0.4
    ) {
      return {
        adjustment: 0,
        reason:
          "Portion adjustment will be needed to meet the meal target."
      };
    }

    return {
      adjustment: -8,
      reason:
        "This recipe requires a larger portion adjustment than other candidates."
    };
  }

  /**
   * Return possible food IDs for a recipe.
   *
   * @param {object} recipe
   * @param {Set<string>} selectedFoodIds
   * @returns {string[]}
   */

  function getRecipePossibleFoodIds(
    recipe,
    selectedFoodIds
  ) {
    return [
      ...new Set(
        recipe.ingredients.flatMap(
          (ingredient) => {
            if (
              ingredient.type ===
              "fixed"
            ) {
              return selectedFoodIds.has(
                ingredient.foodId
              )
                ? [
                    ingredient.foodId
                  ]
                : [];
            }

            return getIngredientAvailableFoodIds(
              ingredient,
              selectedFoodIds
            );
          }
        )
      )
    ];
  }

  /**
   * Return recipe food IDs for one category.
   *
   * @param {object} recipe
   * @param {Set<string>} selectedFoodIds
   * @param {string} category
   * @returns {string[]}
   */

  function getRecipeFoodIdsByCategory(
    recipe,
    selectedFoodIds,
    category
  ) {
    return getRecipePossibleFoodIds(
      recipe,
      selectedFoodIds
    ).filter((foodId) => {
      const food =
        window.getElevenFoodById(
          foodId
        );

      return (
        food?.category ===
        category
      );
    });
  }

  /**
   * Get selected foods that satisfy an ingredient choice.
   *
   * @param {object} ingredient
   * @param {Set<string>} selectedFoodIds
   * @returns {string[]}
   */

  function getIngredientAvailableFoodIds(
    ingredient,
    selectedFoodIds
  ) {
    const directChoices =
      (
        ingredient.allowedFoodIds ||
        []
      ).filter((foodId) =>
        selectedFoodIds.has(foodId)
      );

    const categoryChoices =
      (
        ingredient.allowedCategories ||
        []
      ).flatMap(
        (categoryId) =>
          Array.from(
            selectedFoodIds
          ).filter(
            (foodId) => {
              const food =
                window
                  .getElevenFoodById(
                    foodId
                  );

              return (
                food?.category ===
                categoryId
              );
            }
          )
      );

    return [
      ...new Set([
        ...directChoices,
        ...categoryChoices
      ])
    ];
  }

  /**
   * Choose one representative food for macro estimation.
   *
   * @param {object} ingredient
   * @param {Set<string>} selectedFoodIds
   * @returns {string|null}
   */

  function chooseRepresentativeFoodId(
    ingredient,
    selectedFoodIds
  ) {
    if (
      ingredient.type ===
      "fixed"
    ) {
      return selectedFoodIds.has(
        ingredient.foodId
      )
        ? ingredient.foodId
        : null;
    }

    const choices =
      getIngredientAvailableFoodIds(
        ingredient,
        selectedFoodIds
      );

    if (choices.length === 0) {
      return null;
    }

    return choices
      .map((foodId) => ({
        foodId,
        usageCount: 0
      }))
      .sort(
        (first, second) =>
          first.usageCount -
          second.usageCount
      )[0].foodId;
  }

  /**
   * Create planning state.
   *
   * @returns {object}
   */

  function createPlanningState() {
    return {
      recipeCounts:
        new Map(),

      recipeCountsByMealType: {
        breakfast: new Map(),
        lunch: new Map(),
        dinner: new Map(),
        snack: new Map()
      },

      foodCounts:
        new Map(),

      proteinCounts:
        new Map(),

      vegetableCounts:
        new Map(),

      fruitCounts:
        new Map(),

      carbohydrateCounts:
        new Map(),

      previousDayRecipes: {
        breakfast: null,
        lunch: null,
        dinner: null,
        snack: null
      },

      previousDayPrimaryProteins:
        [],

      currentDayShakeCount: 0,

      specialCounts: {
        steak: 0,
        fish: 0,
        eggBreakfasts: 0,
        shakes: 0
      }
    };
  }

  /**
   * Create daily planning notes.
   *
   * @param {object} dayTargets
   * @param {object[]} meals
   * @returns {string[]}
   */

  function createDayPlanningNotes(
    dayTargets,
    meals
  ) {
    const notes = [
      `Day ${dayTargets.day} targets approximately ${dayTargets.calories} calories and ${dayTargets.protein} g of protein.`
    ];

    const mealPrepCount =
      meals.filter(
        (meal) =>
          meal
            .mealPrepFriendly
      ).length;

    if (
      mealPrepCount >= 3
    ) {
      notes.push(
        "Most meals selected for this day are meal-prep friendly."
      );
    }

    const uniqueProteins =
      new Set(
        meals.flatMap(
          (meal) =>
            meal
              .primaryProteinIds ||
            []
        )
      );

    if (
      uniqueProteins.size >= 3
    ) {
      notes.push(
        "This day uses strong protein variety."
      );
    }

    return notes;
  }

  /**
   * Build a cycle-level decision log.
   *
   * @param {object} context
   * @returns {object[]}
   */

  function buildCycleDecisionLog(
    context
  ) {
    const {
      targets,
      days,
      planningState,
      constraints
    } = context;

    const log = [
      {
        type: "summary",
        title:
          "Cycle target",
        message:
          `The planner created ${days.length} days around an average target of ${targets.calorieTarget} calories and ${targets.proteinTarget} g of protein.`
      },

      {
        type: "information",
        title:
          "Recipe rotation",
        message:
          `${planningState.recipeCounts.size} different recipes were selected during planning.`
      },

      {
        type: "information",
        title:
          "Food variety",
        message:
          `${planningState.foodCounts.size} different foods are represented in the strategy.`
      }
    ];

    if (
      planningState
        .specialCounts.fish >=
      constraints.foodFrequency
        .minimumFishMealsPerCycle
    ) {
      log.push({
        type: "positive",
        title:
          "Fish target",
        message:
          "The strategy includes enough fish meals to meet the preferred cycle target."
      });
    } else {
      log.push({
        type: "warning",
        title:
          "Fish target",
        message:
          "The strategy currently contains fewer fish meals than preferred."
      });
    }

    if (
      planningState
        .specialCounts.steak <=
      constraints.foodFrequency
        .maximumSteakMealsPerCycle
    ) {
      log.push({
        type: "positive",
        title:
          "Steak frequency",
        message:
          "Steak remains within the preferred cycle limit."
      });
    }

    if (
      planningState
        .specialCounts.shakes <=
      constraints.foodFrequency
        .maximumProteinShakesPerCycle
    ) {
      log.push({
        type: "positive",
        title:
          "Protein-shake frequency",
        message:
          "Protein shakes remain within the preferred cycle limit."
      });
    }

    return log;
  }

  /**
   * Create a rotation summary.
   *
   * @param {object} planningState
   * @returns {object}
   */

  function createRotationSummary(
    planningState
  ) {
    return {
      uniqueRecipes:
        planningState
          .recipeCounts.size,

      uniqueFoods:
        planningState
          .foodCounts.size,

      uniqueProteins:
        planningState
          .proteinCounts.size,

      uniqueVegetables:
        planningState
          .vegetableCounts.size,

      uniqueFruits:
        planningState
          .fruitCounts.size,

      uniqueCarbohydrates:
        planningState
          .carbohydrateCounts
          .size,

      specialCounts: {
        ...planningState
          .specialCounts
      },

      mostUsedRecipes:
        getMostUsedMapItems(
          planningState
            .recipeCounts,
          5
        ),

      mostUsedFoods:
        getMostUsedMapItems(
          planningState
            .foodCounts,
          10
        )
    };
  }

  /**
   * Serialize planning state.
   *
   * @param {object} state
   * @returns {object}
   */

  function serializePlanningState(
    state
  ) {
    return {
      recipeCounts:
        mapToObject(
          state.recipeCounts
        ),

      recipeCountsByMealType:
        Object.fromEntries(
          Object.entries(
            state
              .recipeCountsByMealType
          ).map(
            ([mealType, map]) => [
              mealType,
              mapToObject(map)
            ]
          )
        ),

      foodCounts:
        mapToObject(
          state.foodCounts
        ),

      proteinCounts:
        mapToObject(
          state.proteinCounts
        ),

      vegetableCounts:
        mapToObject(
          state.vegetableCounts
        ),

      fruitCounts:
        mapToObject(
          state.fruitCounts
        ),

      carbohydrateCounts:
        mapToObject(
          state
            .carbohydrateCounts
        ),

      specialCounts: {
        ...state.specialCounts
      }
    };
  }

  /**
   * Validate planning inputs.
   *
   * @param {object} profile
   * @param {object|string[]} preferences
   * @returns {object}
   */

  function validatePlanningInputs(
    profile,
    preferences
  ) {
    const errors = [];
    const warnings = [];

    if (
      !window.ELEVEN_NUTRITION
    ) {
      errors.push(
        "The nutrition engine is unavailable."
      );
    }

    if (
      !window.ELEVEN_CONSTRAINTS
    ) {
      errors.push(
        "The constraint engine is unavailable."
      );
    }

    if (
      !Array.isArray(
        window.ELEVEN_RECIPES
      )
    ) {
      errors.push(
        "The recipe database is unavailable."
      );
    }

    if (
      !Array.isArray(
        window.ELEVEN_FOODS
      )
    ) {
      errors.push(
        "The food database is unavailable."
      );
    }

    if (
      !profile ||
      !window
        .ELEVEN_NUTRITION
        ?.isValidProfileForCalculation(
          profile
        )
    ) {
      errors.push(
        "A complete profile is required before planning."
      );
    }

    const selectedFoodIds =
      normalizeSelectedFoodIds(
        preferences
      );

    if (
      selectedFoodIds.size === 0
    ) {
      errors.push(
        "Food preferences are required before planning."
      );
    }

    if (
      selectedFoodIds.size < 12
    ) {
      warnings.push(
        "A larger food selection will create a more varied cycle."
      );
    }

    return {
      isValid:
        errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Return profile nutrition targets.
   *
   * @param {object} profile
   * @returns {object|null}
   */

  function getProfileTargets(
    profile
  ) {
    if (
      profile.targets &&
      profile.targets
        .calorieTarget &&
      profile.targets
        .proteinTarget
    ) {
      return profile.targets;
    }

    return window
      .ELEVEN_NUTRITION
      .calculateProfileTargets(
        profile
      );
  }

  /**
   * Normalize selected food IDs.
   *
   * @param {object|string[]} preferences
   * @returns {Set<string>}
   */

  function normalizeSelectedFoodIds(
    preferences
  ) {
    const values =
      Array.isArray(preferences)
        ? preferences
        : preferences
            ?.selectedFoodIds ||
          [];

    return new Set(
      values.filter(
        (foodId) =>
          typeof foodId ===
            "string" &&
          Boolean(
            window
              .getElevenFoodById(
                foodId
              )
          )
      )
    );
  }

  /**
   * Normalize exclusions.
   *
   * @param {object|string[]} preferences
   * @returns {string[]}
   */

  function normalizeExclusions(
    preferences
  ) {
    const values =
      Array.isArray(
        preferences?.excludedFoods
      )
        ? preferences
            .excludedFoods
        : [];

    return [
      ...new Set(
        values
          .map((value) =>
            String(value)
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      )
    ];
  }

  /**
   * Determine whether a recipe includes excluded text.
   *
   * @param {object} recipe
   * @param {string[]} exclusions
   * @returns {boolean}
   */

  function recipeContainsExcludedText(
    recipe,
    exclusions
  ) {
    if (
      exclusions.length === 0
    ) {
      return false;
    }

    const searchableText = [
      recipe.name,
      recipe.description,
      ...(recipe.tags || []),
      ...getRecipeAllFoodNames(
        recipe
      )
    ]
      .join(" ")
      .toLowerCase();

    return exclusions.some(
      (excludedTerm) =>
        searchableText.includes(
          excludedTerm
        )
    );
  }

  /**
   * Return food names referenced by a recipe.
   *
   * @param {object} recipe
   * @returns {string[]}
   */

  function getRecipeAllFoodNames(
    recipe
  ) {
    const foodIds =
      recipe.ingredients.flatMap(
        (ingredient) => [
          ingredient.foodId,
          ...(
            ingredient
              .allowedFoodIds ||
            []
          )
        ]
      );

    return foodIds
      .filter(Boolean)
      .map(
        (foodId) =>
          window
            .getElevenFoodById(
              foodId
            )?.name ||
          ""
      )
      .filter(Boolean);
  }

  /**
   * Detect a custom protein shake ID.
   *
   * @param {string} foodId
   * @returns {boolean}
   */

  function isCustomProteinShakeId(
    foodId
  ) {
    const food =
      window.getElevenFoodById(
        foodId
      );

    if (
      !food?.isCustom
    ) {
      return false;
    }

    const searchableText = [
      food.name,
      food.brand,
      ...(food.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.includes(
        "protein shake"
      ) ||
      searchableText.includes(
        "protein drink"
      )
    );
  }

  /**
   * Normalize planner options.
   *
   * @param {object} options
   * @returns {object}
   */

  function normalizeOptions(
    options
  ) {
    return {
      ...DEFAULT_OPTIONS,
      ...options,

      mealTypes:
        Array.isArray(
          options.mealTypes
        )
          ? [
              ...options
                .mealTypes
            ]
          : [
              ...DEFAULT_OPTIONS
                .mealTypes
            ],

      cycleLengthDays:
        clampInteger(
          options
            .cycleLengthDays ??
          DEFAULT_OPTIONS
            .cycleLengthDays,
          1,
          31
        ),

      candidateLimitPerMeal:
        clampInteger(
          options
            .candidateLimitPerMeal ??
          DEFAULT_OPTIONS
            .candidateLimitPerMeal,
          1,
          20
        ),

      randomVariation:
        clamp(
          options
            .randomVariation ??
          DEFAULT_OPTIONS
            .randomVariation,
          0,
          15
        )
    };
  }

  /**
   * Create profile snapshot.
   *
   * @param {object} profile
   * @returns {object}
   */

  function createProfileSnapshot(
    profile
  ) {
    return {
      profileName:
        profile.profileName,
      age: profile.age,
      sex: profile.sex,
      heightFeet:
        profile.heightFeet,
      heightInches:
        profile.heightInches,
      currentWeight:
        profile.currentWeight,
      goalWeight:
        profile.goalWeight,
      activityLevel:
        profile.activityLevel,
      lossRate:
        profile.lossRate
    };
  }

  /**
   * Create a strategy ID.
   *
   * @returns {string}
   */

  function createStrategyId() {
    return [
      "strategy",
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 9)
    ].join("-");
  }

  /**
   * Return most-used map items.
   *
   * @param {Map} map
   * @param {number} limit
   * @returns {object[]}
   */

  function getMostUsedMapItems(
    map,
    limit
  ) {
    return Array.from(
      map.entries()
    )
      .sort(
        (first, second) =>
          second[1] -
          first[1]
      )
      .slice(0, limit)
      .map(
        ([id, count]) => ({
          id,
          count
        })
      );
  }

  /**
   * Increment a map value.
   *
   * @param {Map} map
   * @param {string} key
   */

  function incrementMapValue(
    map,
    key
  ) {
    if (!key) {
      return;
    }

    map.set(
      key,
      getMapValue(
        map,
        key
      ) + 1
    );
  }

  /**
   * Read a map value.
   *
   * @param {Map} map
   * @param {string} key
   * @returns {number}
   */

  function getMapValue(
    map,
    key
  ) {
    return map.get(key) || 0;
  }

  /**
   * Convert a map to an object.
   *
   * @param {Map} map
   * @returns {object}
   */

  function mapToObject(map) {
    return Object.fromEntries(
      map.entries()
    );
  }

  /**
   * Random number within a range.
   *
   * @param {number} minimum
   * @param {number} maximum
   * @returns {number}
   */

  function randomBetween(
    minimum,
    maximum
  ) {
    return (
      Math.random() *
        (maximum - minimum) +
      minimum
    );
  }

  /**
   * Round to interval.
   *
   * @param {number} value
   * @param {number} interval
   * @returns {number}
   */

  function roundToNearest(
    value,
    interval
  ) {
    return (
      Math.round(
        Number(value) /
          interval
      ) * interval
    );
  }

  /**
   * Round number.
   *
   * @param {number} value
   * @param {number} decimalPlaces
   * @returns {number}
   */

  function roundNumber(
    value,
    decimalPlaces = 0
  ) {
    const multiplier =
      10 ** decimalPlaces;

    return (
      Math.round(
        (
          Number(value) +
          Number.EPSILON
        ) *
          multiplier
      ) /
      multiplier
    );
  }

  /**
   * Restrict a number.
   *
   * @param {number} value
   * @param {number} minimum
   * @param {number} maximum
   * @returns {number}
   */

  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      Math.max(
        Number(value),
        minimum
      ),
      maximum
    );
  }

  /**
   * Restrict an integer.
   *
   * @param {number} value
   * @param {number} minimum
   * @param {number} maximum
   * @returns {number}
   */

  function clampInteger(
    value,
    minimum,
    maximum
  ) {
    return Math.round(
      clamp(
        value,
        minimum,
        maximum
      )
    );
  }

  return {
    defaults: {
      ...DEFAULT_OPTIONS
    },

    mealShares:
      JSON.parse(
        JSON.stringify(
          DEFAULT_MEAL_SHARES
        )
      ),

    createCycleStrategy,
    createDailyTargets,
    createMealTarget,
    getEligibleRecipes,
    validateRecipeAvailability,
    rankRecipeCandidates,
    scoreRecipeCandidate
  };
})();
