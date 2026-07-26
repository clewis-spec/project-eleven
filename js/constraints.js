"use strict";

/**
 * Eleven constraint engine
 *
 * The constraint engine defines and evaluates planning rules.
 *
 * It does not generate meals. Instead, it:
 *
 * - Creates default planning constraints
 * - Merges user overrides with defaults
 * - Validates constraint settings
 * - Evaluates meals, days, and full plans
 * - Returns violations, warnings, and quality scores
 * - Produces decision-log explanations
 */

window.ELEVEN_CONSTRAINTS = (() => {
  const DEFAULT_CONSTRAINTS = {
    cycleLengthDays: 11,

    dailyTargets: {
      calorieToleranceBelow: 100,
      calorieToleranceAbove: 100,
      proteinMinimumPercentage: 0.9,
      proteinPreferredPercentage: 1,
      fibreMinimumGrams: 25
    },

    mealStructure: {
      requiredMealTypes: [
        "breakfast",
        "lunch",
        "dinner",
        "snack"
      ],
      minimumMealsPerDay: 4,
      maximumMealsPerDay: 4,
      requireProteinAtEveryMeal: true,
      minimumProteinPerMeal: 18
    },

    repetition: {
      maximumSameRecipePerCycle: 3,
      maximumSameRecipeConsecutiveDays: 1,
      maximumSamePrimaryProteinConsecutiveDays: 2,
      maximumSameBreakfastPerCycle: 3,
      maximumSameDinnerPerCycle: 2,
      minimumUniqueRecipesPerCycle: 12,
      minimumUniqueVegetablesPerCycle: 6,
      minimumUniqueFruitsPerCycle: 3
    },

    foodFrequency: {
      maximumSteakMealsPerCycle: 2,
      minimumFishMealsPerCycle: 2,
      maximumEggBreakfastsPerCycle: 5,
      maximumProteinShakesPerDay: 1,
      maximumProteinShakesPerCycle: 8,
      minimumVegetableServingsPerDay: 2
    },

    planning: {
      allowLeftovers: true,
      prioritizeMealPrep: true,
      prioritizeSelectedFoods: true,
      permitOptionalIngredients: true,
      maximumGeneratedAttempts: 100,
      minimumAcceptablePlanScore: 85
    },

    scoringWeights: {
      calories: 0.25,
      protein: 0.25,
      variety: 0.18,
      vegetables: 0.1,
      mealPrep: 0.08,
      groceryEfficiency: 0.07,
      constraintCompliance: 0.07
    }
  };

  const SEVERITY = {
    error: "error",
    warning: "warning",
    information: "information"
  };

  /**
   * Create a complete constraints object.
   *
   * User overrides may contain only the properties that need
   * to differ from the defaults.
   *
   * @param {object} overrides
   * @returns {object}
   */

  function createConstraints(overrides = {}) {
    return deepMerge(
      cloneValue(DEFAULT_CONSTRAINTS),
      overrides
    );
  }

  /**
   * Validate a constraints object.
   *
   * @param {object} constraints
   * @returns {{
   *   isValid: boolean,
   *   errors: string[],
   *   warnings: string[],
   *   constraints: object
   * }}
   */

  function validateConstraints(constraints = {}) {
    const normalized = createConstraints(
      constraints
    );

    const errors = [];
    const warnings = [];

    if (
      normalized.cycleLengthDays < 1 ||
      normalized.cycleLengthDays > 31
    ) {
      errors.push(
        "Cycle length must be between 1 and 31 days."
      );
    }

    if (
      normalized.mealStructure.minimumMealsPerDay >
      normalized.mealStructure.maximumMealsPerDay
    ) {
      errors.push(
        "Minimum meals per day cannot exceed maximum meals per day."
      );
    }

    if (
      normalized.planning.minimumAcceptablePlanScore < 0 ||
      normalized.planning.minimumAcceptablePlanScore > 100
    ) {
      errors.push(
        "Minimum acceptable plan score must be between 0 and 100."
      );
    }

    if (
      normalized.planning.maximumGeneratedAttempts < 1
    ) {
      errors.push(
        "Maximum generation attempts must be at least 1."
      );
    }

    if (
      normalized.dailyTargets.proteinMinimumPercentage >
      normalized.dailyTargets.proteinPreferredPercentage
    ) {
      warnings.push(
        "Minimum protein percentage is higher than the preferred percentage."
      );
    }

    const scoringTotal = Object.values(
      normalized.scoringWeights
    ).reduce(
      (total, value) =>
        total + toFiniteNumber(value),
      0
    );

    if (
      Math.abs(scoringTotal - 1) > 0.001
    ) {
      warnings.push(
        "Plan scoring weights do not total 1. The engine will normalize them automatically."
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      constraints: normalized
    };
  }

  /**
   * Evaluate one complete generated plan.
   *
   * @param {object} plan
   * @param {object} profile
   * @param {object} suppliedConstraints
   * @returns {object}
   */

  function evaluatePlan(
    plan,
    profile,
    suppliedConstraints = {}
  ) {
    const validation = validateConstraints(
      suppliedConstraints
    );

    const constraints =
      validation.constraints;

    const days = Array.isArray(plan?.days)
      ? plan.days
      : [];

    const violations = [];
    const warnings = [];
    const information = [];

    if (days.length !== constraints.cycleLengthDays) {
      violations.push(
        createIssue({
          code: "cycle-length",
          severity: SEVERITY.error,
          message:
            `The plan contains ${days.length} days instead of ${constraints.cycleLengthDays}.`,
          expected: constraints.cycleLengthDays,
          actual: days.length
        })
      );
    }

    const dailyEvaluations = days.map(
      (day, index) =>
        evaluateDay(
          day,
          profile,
          constraints,
          index
        )
    );

    dailyEvaluations.forEach(
      (evaluation) => {
        violations.push(
          ...evaluation.violations
        );

        warnings.push(
          ...evaluation.warnings
        );

        information.push(
          ...evaluation.information
        );
      }
    );

    const cycleEvaluation =
      evaluateCycleRules(
        plan,
        constraints
      );

    violations.push(
      ...cycleEvaluation.violations
    );

    warnings.push(
      ...cycleEvaluation.warnings
    );

    information.push(
      ...cycleEvaluation.information
    );

    const componentScores =
      calculateComponentScores({
        plan,
        profile,
        constraints,
        dailyEvaluations,
        cycleEvaluation
      });

    const overallScore =
      calculateWeightedScore(
        componentScores,
        constraints.scoringWeights
      );

    const decisionLog =
      buildDecisionLog({
        plan,
        profile,
        constraints,
        dailyEvaluations,
        cycleEvaluation,
        componentScores,
        overallScore
      });

    return {
      score: overallScore,
      rating:
        getPlanScoreRating(overallScore),
      passed:
        violations.length === 0 &&
        overallScore >=
          constraints.planning
            .minimumAcceptablePlanScore,
      componentScores,
      violations,
      warnings,
      information,
      dailyEvaluations,
      decisionLog,
      constraintValidation: validation
    };
  }

  /**
   * Evaluate one day.
   *
   * @param {object} day
   * @param {object} profile
   * @param {object} constraints
   * @param {number} dayIndex
   * @returns {object}
   */

  function evaluateDay(
    day,
    profile,
    constraints,
    dayIndex = 0
  ) {
    const dayNumber =
      toFiniteNumber(day?.day) ||
      dayIndex + 1;

    const meals =
      Array.isArray(day?.meals)
        ? day.meals
        : [];

    const violations = [];
    const warnings = [];
    const information = [];

    const macros =
      getDayMacros(day);

    const targets =
      getDayTargets(
        day,
        profile
      );

    const minimumMeals =
      constraints.mealStructure
        .minimumMealsPerDay;

    const maximumMeals =
      constraints.mealStructure
        .maximumMealsPerDay;

    if (meals.length < minimumMeals) {
      violations.push(
        createIssue({
          code: "minimum-meals",
          severity: SEVERITY.error,
          day: dayNumber,
          message:
            `Day ${dayNumber} contains fewer than ${minimumMeals} meals.`,
          expected: minimumMeals,
          actual: meals.length
        })
      );
    }

    if (meals.length > maximumMeals) {
      warnings.push(
        createIssue({
          code: "maximum-meals",
          severity: SEVERITY.warning,
          day: dayNumber,
          message:
            `Day ${dayNumber} contains more than ${maximumMeals} meals.`,
          expected: maximumMeals,
          actual: meals.length
        })
      );
    }

    evaluateRequiredMealTypes(
      meals,
      dayNumber,
      constraints,
      violations
    );

    evaluateDailyCalories(
      macros,
      targets,
      dayNumber,
      constraints,
      violations,
      warnings
    );

    evaluateDailyProtein(
      macros,
      targets,
      dayNumber,
      constraints,
      violations,
      warnings
    );

    evaluateDailyFibre(
      macros,
      dayNumber,
      constraints,
      warnings
    );

    evaluateProteinAtEveryMeal(
      meals,
      dayNumber,
      constraints,
      violations,
      warnings
    );

    evaluateDailyProteinShakes(
      meals,
      dayNumber,
      constraints,
      violations
    );

    evaluateDailyVegetables(
      meals,
      dayNumber,
      constraints,
      warnings
    );

    const score =
      calculateDailyScore({
        macros,
        targets,
        meals,
        constraints,
        violations,
        warnings
      });

    information.push(
      createIssue({
        code: "daily-score",
        severity: SEVERITY.information,
        day: dayNumber,
        message:
          `Day ${dayNumber} received a quality score of ${score}.`,
        actual: score
      })
    );

    return {
      day: dayNumber,
      score,
      macros,
      targets,
      violations,
      warnings,
      information
    };
  }

  /**
   * Evaluate rules that apply across the whole cycle.
   *
   * @param {object} plan
   * @param {object} constraints
   * @returns {object}
   */

  function evaluateCycleRules(
    plan,
    constraints
  ) {
    const days =
      Array.isArray(plan?.days)
        ? plan.days
        : [];

    const meals = flattenMeals(days);

    const violations = [];
    const warnings = [];
    const information = [];

    const recipeCounts =
      countBy(
        meals,
        (meal) =>
          meal.recipeId ||
          meal.id ||
          meal.name
      );

    const breakfastMeals =
      meals.filter(
        (meal) =>
          meal.mealType === "breakfast"
      );

    const dinnerMeals =
      meals.filter(
        (meal) =>
          meal.mealType === "dinner"
      );

    evaluateRecipeFrequency(
      recipeCounts,
      constraints,
      warnings
    );

    evaluateMealTypeRecipeFrequency(
      breakfastMeals,
      "breakfast",
      constraints.repetition
        .maximumSameBreakfastPerCycle,
      warnings
    );

    evaluateMealTypeRecipeFrequency(
      dinnerMeals,
      "dinner",
      constraints.repetition
        .maximumSameDinnerPerCycle,
      warnings
    );

    evaluateConsecutiveRecipes(
      days,
      constraints,
      warnings
    );

    evaluateConsecutivePrimaryProteins(
      days,
      constraints,
      warnings
    );

    evaluateUniqueRecipes(
      meals,
      constraints,
      warnings
    );

    evaluateFoodFrequency(
      meals,
      constraints,
      violations,
      warnings
    );

    evaluateFoodVariety(
      meals,
      constraints,
      warnings
    );

    const metrics =
      calculateCycleMetrics(
        days,
        meals
      );

    information.push(
      createIssue({
        code: "unique-recipes",
        severity: SEVERITY.information,
        message:
          `${metrics.uniqueRecipeCount} unique recipes appear in the cycle.`,
        actual:
          metrics.uniqueRecipeCount
      })
    );

    information.push(
      createIssue({
        code: "unique-foods",
        severity: SEVERITY.information,
        message:
          `${metrics.uniqueFoodCount} unique foods appear in the cycle.`,
        actual:
          metrics.uniqueFoodCount
      })
    );

    return {
      violations,
      warnings,
      information,
      metrics
    };
  }

  /**
   * Evaluate required eating occasions.
   */

  function evaluateRequiredMealTypes(
    meals,
    dayNumber,
    constraints,
    violations
  ) {
    const requiredTypes =
      constraints.mealStructure
        .requiredMealTypes;

    requiredTypes.forEach(
      (mealType) => {
        const found =
          meals.some(
            (meal) =>
              meal.mealType === mealType
          );

        if (!found) {
          violations.push(
            createIssue({
              code:
                "missing-meal-type",
              severity:
                SEVERITY.error,
              day: dayNumber,
              mealType,
              message:
                `Day ${dayNumber} is missing ${mealType}.`
            })
          );
        }
      }
    );
  }

  /**
   * Evaluate daily calorie adherence.
   */

  function evaluateDailyCalories(
    macros,
    targets,
    dayNumber,
    constraints,
    violations,
    warnings
  ) {
    if (
      !targets ||
      targets.calories <= 0
    ) {
      return;
    }

    const minimum =
      targets.calories -
      constraints.dailyTargets
        .calorieToleranceBelow;

    const maximum =
      targets.calories +
      constraints.dailyTargets
        .calorieToleranceAbove;

    if (macros.calories < minimum) {
      violations.push(
        createIssue({
          code: "calories-low",
          severity: SEVERITY.error,
          day: dayNumber,
          message:
            `Day ${dayNumber} is below its calorie range.`,
          expected: minimum,
          actual: macros.calories
        })
      );
    } else if (
      macros.calories > maximum
    ) {
      warnings.push(
        createIssue({
          code: "calories-high",
          severity:
            SEVERITY.warning,
          day: dayNumber,
          message:
            `Day ${dayNumber} is above its calorie range.`,
          expected: maximum,
          actual: macros.calories
        })
      );
    }
  }

  /**
   * Evaluate daily protein adherence.
   */

  function evaluateDailyProtein(
    macros,
    targets,
    dayNumber,
    constraints,
    violations,
    warnings
  ) {
    if (
      !targets ||
      targets.protein <= 0
    ) {
      return;
    }

    const minimumProtein =
      targets.protein *
      constraints.dailyTargets
        .proteinMinimumPercentage;

    const preferredProtein =
      targets.protein *
      constraints.dailyTargets
        .proteinPreferredPercentage;

    if (
      macros.protein <
      minimumProtein
    ) {
      violations.push(
        createIssue({
          code: "protein-low",
          severity: SEVERITY.error,
          day: dayNumber,
          message:
            `Day ${dayNumber} does not meet the minimum protein target.`,
          expected:
            roundNumber(
              minimumProtein,
              1
            ),
          actual: macros.protein
        })
      );
    } else if (
      macros.protein <
      preferredProtein
    ) {
      warnings.push(
        createIssue({
          code:
            "protein-below-preferred",
          severity:
            SEVERITY.warning,
          day: dayNumber,
          message:
            `Day ${dayNumber} meets the minimum protein requirement but is below the preferred target.`,
          expected:
            roundNumber(
              preferredProtein,
              1
            ),
          actual: macros.protein
        })
      );
    }
  }

  /**
   * Evaluate daily fibre.
   */

  function evaluateDailyFibre(
    macros,
    dayNumber,
    constraints,
    warnings
  ) {
    const minimum =
      constraints.dailyTargets
        .fibreMinimumGrams;

    if (
      macros.fibre > 0 &&
      macros.fibre < minimum
    ) {
      warnings.push(
        createIssue({
          code: "fibre-low",
          severity:
            SEVERITY.warning,
          day: dayNumber,
          message:
            `Day ${dayNumber} provides less than ${minimum} g of fibre.`,
          expected: minimum,
          actual: macros.fibre
        })
      );
    }
  }

  /**
   * Evaluate protein at each meal.
   */

  function evaluateProteinAtEveryMeal(
    meals,
    dayNumber,
    constraints,
    violations,
    warnings
  ) {
    if (
      !constraints.mealStructure
        .requireProteinAtEveryMeal
    ) {
      return;
    }

    const minimum =
      constraints.mealStructure
        .minimumProteinPerMeal;

    meals.forEach((meal) => {
      const macros =
        getMealMacros(meal);

      if (macros.protein < minimum) {
        const collection =
          meal.mealType === "snack"
            ? warnings
            : violations;

        collection.push(
          createIssue({
            code:
              "meal-protein-low",
            severity:
              meal.mealType ===
              "snack"
                ? SEVERITY.warning
                : SEVERITY.error,
            day: dayNumber,
            mealType:
              meal.mealType,
            message:
              `${capitalize(
                meal.mealType
              )} on Day ${dayNumber} provides less than ${minimum} g of protein.`,
            expected: minimum,
            actual: macros.protein
          })
        );
      }
    });
  }

  /**
   * Evaluate daily shake frequency.
   */

  function evaluateDailyProteinShakes(
    meals,
    dayNumber,
    constraints,
    violations
  ) {
    const shakeCount =
      meals.filter(
        isProteinShakeMeal
      ).length;

    const maximum =
      constraints.foodFrequency
        .maximumProteinShakesPerDay;

    if (shakeCount > maximum) {
      violations.push(
        createIssue({
          code:
            "protein-shakes-daily",
          severity: SEVERITY.error,
          day: dayNumber,
          message:
            `Day ${dayNumber} contains more than ${maximum} protein shake.`,
          expected: maximum,
          actual: shakeCount
        })
      );
    }
  }

  /**
   * Evaluate daily vegetable servings.
   */

  function evaluateDailyVegetables(
    meals,
    dayNumber,
    constraints,
    warnings
  ) {
    const vegetableServings =
      meals.reduce(
        (total, meal) =>
          total +
          getFoodServingsByCategory(
            meal,
            "vegetable"
          ),
        0
      );

    const minimum =
      constraints.foodFrequency
        .minimumVegetableServingsPerDay;

    if (
      vegetableServings < minimum
    ) {
      warnings.push(
        createIssue({
          code:
            "vegetables-daily",
          severity:
            SEVERITY.warning,
          day: dayNumber,
          message:
            `Day ${dayNumber} contains fewer than ${minimum} vegetable servings.`,
          expected: minimum,
          actual:
            roundNumber(
              vegetableServings,
              1
            )
        })
      );
    }
  }

  /**
   * Evaluate total recipe frequency.
   */

  function evaluateRecipeFrequency(
    recipeCounts,
    constraints,
    warnings
  ) {
    const maximum =
      constraints.repetition
        .maximumSameRecipePerCycle;

    Object.entries(
      recipeCounts
    ).forEach(
      ([recipeId, count]) => {
        if (
          recipeId &&
          count > maximum
        ) {
          warnings.push(
            createIssue({
              code:
                "recipe-frequency",
              severity:
                SEVERITY.warning,
              recipeId,
              message:
                `${recipeId} appears ${count} times, exceeding the preferred maximum of ${maximum}.`,
              expected: maximum,
              actual: count
            })
          );
        }
      }
    );
  }

  /**
   * Evaluate recipe frequency by meal type.
   */

  function evaluateMealTypeRecipeFrequency(
    meals,
    mealType,
    maximum,
    warnings
  ) {
    const counts = countBy(
      meals,
      (meal) =>
        meal.recipeId ||
        meal.id ||
        meal.name
    );

    Object.entries(counts).forEach(
      ([recipeId, count]) => {
        if (count > maximum) {
          warnings.push(
            createIssue({
              code:
                `${mealType}-frequency`,
              severity:
                SEVERITY.warning,
              mealType,
              recipeId,
              message:
                `${capitalize(
                  mealType
                )} recipe ${recipeId} appears ${count} times.`,
              expected: maximum,
              actual: count
            })
          );
        }
      }
    );
  }

  /**
   * Evaluate consecutive-day recipe repetition.
   */

  function evaluateConsecutiveRecipes(
    days,
    constraints,
    warnings
  ) {
    const maximum =
      constraints.repetition
        .maximumSameRecipeConsecutiveDays;

    const mealTypes =
      constraints.mealStructure
        .requiredMealTypes;

    mealTypes.forEach(
      (mealType) => {
        let previousRecipeId = null;
        let consecutiveCount = 0;

        days.forEach(
          (day, index) => {
            const meal =
              day.meals?.find(
                (item) =>
                  item.mealType ===
                  mealType
              );

            const recipeId =
              meal?.recipeId ||
              meal?.id ||
              meal?.name ||
              null;

            if (
              recipeId &&
              recipeId ===
                previousRecipeId
            ) {
              consecutiveCount += 1;
            } else {
              consecutiveCount = 1;
              previousRecipeId =
                recipeId;
            }

            if (
              recipeId &&
              consecutiveCount >
                maximum
            ) {
              warnings.push(
                createIssue({
                  code:
                    "consecutive-recipe",
                  severity:
                    SEVERITY.warning,
                  day: index + 1,
                  mealType,
                  recipeId,
                  message:
                    `${capitalize(
                      mealType
                    )} repeats the same recipe on consecutive days.`,
                  expected: maximum,
                  actual:
                    consecutiveCount
                })
              );
            }
          }
        );
      }
    );
  }

  /**
   * Evaluate repeated primary protein.
   */

  function evaluateConsecutivePrimaryProteins(
    days,
    constraints,
    warnings
  ) {
    const maximum =
      constraints.repetition
        .maximumSamePrimaryProteinConsecutiveDays;

    let previousProtein = null;
    let consecutiveCount = 0;

    days.forEach(
      (day, index) => {
        const proteins =
          getPrimaryProteinsFromDay(
            day
          );

        const primaryProtein =
          proteins[0] || null;

        if (
          primaryProtein &&
          primaryProtein ===
            previousProtein
        ) {
          consecutiveCount += 1;
        } else {
          previousProtein =
            primaryProtein;
          consecutiveCount = 1;
        }

        if (
          primaryProtein &&
          consecutiveCount > maximum
        ) {
          warnings.push(
            createIssue({
              code:
                "consecutive-primary-protein",
              severity:
                SEVERITY.warning,
              day: index + 1,
              foodId:
                primaryProtein,
              message:
                `${primaryProtein} is the primary protein for too many consecutive days.`,
              expected: maximum,
              actual:
                consecutiveCount
            })
          );
        }
      }
    );
  }

  /**
   * Evaluate unique recipe count.
   */

  function evaluateUniqueRecipes(
    meals,
    constraints,
    warnings
  ) {
    const uniqueRecipeCount =
      new Set(
        meals
          .map(
            (meal) =>
              meal.recipeId ||
              meal.id ||
              meal.name
          )
          .filter(Boolean)
      ).size;

    const minimum =
      constraints.repetition
        .minimumUniqueRecipesPerCycle;

    if (
      uniqueRecipeCount < minimum
    ) {
      warnings.push(
        createIssue({
          code:
            "unique-recipes-low",
          severity:
            SEVERITY.warning,
          message:
            `The cycle contains fewer than ${minimum} unique recipes.`,
          expected: minimum,
          actual:
            uniqueRecipeCount
        })
      );
    }
  }

  /**
   * Evaluate steak, fish, eggs, and shake limits.
   */

  function evaluateFoodFrequency(
    meals,
    constraints,
    violations,
    warnings
  ) {
    const steakCount =
      countMealsContainingFood(
        meals,
        "sirloin-steak"
      );

    const fishCount =
      countMealsContainingAnyFood(
        meals,
        [
          "salmon",
          "cod",
          "canned-tuna",
          "shrimp"
        ]
      );

    const eggBreakfastCount =
      meals.filter(
        (meal) =>
          meal.mealType ===
            "breakfast" &&
          mealContainsAnyFood(
            meal,
            [
              "whole-eggs",
              "egg-whites"
            ]
          )
      ).length;

    const shakeCount =
      meals.filter(
        isProteinShakeMeal
      ).length;

    const frequency =
      constraints.foodFrequency;

    if (
      steakCount >
      frequency
        .maximumSteakMealsPerCycle
    ) {
      warnings.push(
        createIssue({
          code:
            "steak-frequency",
          severity:
            SEVERITY.warning,
          message:
            "Steak appears too frequently in the cycle.",
          expected:
            frequency
              .maximumSteakMealsPerCycle,
          actual: steakCount
        })
      );
    }

    if (
      fishCount <
      frequency
        .minimumFishMealsPerCycle
    ) {
      warnings.push(
        createIssue({
          code:
            "fish-frequency",
          severity:
            SEVERITY.warning,
          message:
            "The cycle contains fewer fish meals than preferred.",
          expected:
            frequency
              .minimumFishMealsPerCycle,
          actual: fishCount
        })
      );
    }

    if (
      eggBreakfastCount >
      frequency
        .maximumEggBreakfastsPerCycle
    ) {
      warnings.push(
        createIssue({
          code:
            "egg-breakfast-frequency",
          severity:
            SEVERITY.warning,
          message:
            "Egg-based breakfasts appear too frequently.",
          expected:
            frequency
              .maximumEggBreakfastsPerCycle,
          actual:
            eggBreakfastCount
        })
      );
    }

    if (
      shakeCount >
      frequency
        .maximumProteinShakesPerCycle
    ) {
      violations.push(
        createIssue({
          code:
            "protein-shakes-cycle",
          severity:
            SEVERITY.error,
          message:
            "Protein shakes exceed the cycle maximum.",
          expected:
            frequency
              .maximumProteinShakesPerCycle,
          actual: shakeCount
        })
      );
    }
  }

  /**
   * Evaluate vegetable and fruit variety.
   */

  function evaluateFoodVariety(
    meals,
    constraints,
    warnings
  ) {
    const vegetableIds =
      getUniqueFoodIdsByCategory(
        meals,
        "vegetable"
      );

    const fruitIds =
      getUniqueFoodIdsByCategory(
        meals,
        "fruit"
      );

    const minimumVegetables =
      constraints.repetition
        .minimumUniqueVegetablesPerCycle;

    const minimumFruits =
      constraints.repetition
        .minimumUniqueFruitsPerCycle;

    if (
      vegetableIds.length <
      minimumVegetables
    ) {
      warnings.push(
        createIssue({
          code:
            "vegetable-variety",
          severity:
            SEVERITY.warning,
          message:
            "The cycle has limited vegetable variety.",
          expected:
            minimumVegetables,
          actual:
            vegetableIds.length
        })
      );
    }

    if (
      fruitIds.length <
      minimumFruits
    ) {
      warnings.push(
        createIssue({
          code:
            "fruit-variety",
          severity:
            SEVERITY.warning,
          message:
            "The cycle has limited fruit variety.",
          expected:
            minimumFruits,
          actual:
            fruitIds.length
        })
      );
    }
  }

  /**
   * Calculate all major component scores.
   */

  function calculateComponentScores({
    plan,
    profile,
    constraints,
    dailyEvaluations,
    cycleEvaluation
  }) {
    const calories =
      average(
        dailyEvaluations.map(
          (evaluation) =>
            calculateTargetMatchScore(
              evaluation.macros
                .calories,
              evaluation.targets
                .calories
            )
        )
      );

    const protein =
      average(
        dailyEvaluations.map(
          (evaluation) =>
            calculateMinimumTargetScore(
              evaluation.macros
                .protein,
              evaluation.targets
                .protein
            )
        )
      );

    const variety =
      calculateVarietyScore(
        cycleEvaluation.metrics,
        constraints
      );

    const vegetables =
      calculateVegetableScore(
        plan,
        constraints
      );

    const mealPrep =
      calculateMealPrepScore(plan);

    const groceryEfficiency =
      calculateGroceryEfficiencyScore(
        plan
      );

    const totalIssuePenalty =
      dailyEvaluations.reduce(
        (total, evaluation) =>
          total +
          evaluation.violations.length *
            8 +
          evaluation.warnings.length *
            2,
        0
      ) +
      cycleEvaluation.violations
        .length *
        10 +
      cycleEvaluation.warnings
        .length *
        3;

    const constraintCompliance =
      clamp(
        100 - totalIssuePenalty,
        0,
        100
      );

    return {
      calories:
        roundNumber(calories, 1),
      protein:
        roundNumber(protein, 1),
      variety:
        roundNumber(variety, 1),
      vegetables:
        roundNumber(
          vegetables,
          1
        ),
      mealPrep:
        roundNumber(mealPrep, 1),
      groceryEfficiency:
        roundNumber(
          groceryEfficiency,
          1
        ),
      constraintCompliance:
        roundNumber(
          constraintCompliance,
          1
        )
    };
  }

  /**
   * Calculate a weighted overall score.
   */

  function calculateWeightedScore(
    componentScores,
    suppliedWeights
  ) {
    const weights =
      normalizeWeights(
        suppliedWeights
      );

    const score =
      Object.entries(weights).reduce(
        (total, [key, weight]) =>
          total +
          toFiniteNumber(
            componentScores[key]
          ) *
            weight,
        0
      );

    return roundNumber(
      clamp(score, 0, 100),
      1
    );
  }

  /**
   * Calculate one day's score.
   */

  function calculateDailyScore({
    macros,
    targets,
    meals,
    constraints,
    violations,
    warnings
  }) {
    const calorieScore =
      calculateTargetMatchScore(
        macros.calories,
        targets.calories
      );

    const proteinScore =
      calculateMinimumTargetScore(
        macros.protein,
        targets.protein
      );

    const mealStructureScore =
      meals.length >=
        constraints.mealStructure
          .minimumMealsPerDay &&
      meals.length <=
        constraints.mealStructure
          .maximumMealsPerDay
        ? 100
        : 70;

    const penalty =
      violations.length * 8 +
      warnings.length * 2;

    return roundNumber(
      clamp(
        calorieScore * 0.4 +
          proteinScore * 0.4 +
          mealStructureScore *
            0.2 -
          penalty,
        0,
        100
      ),
      1
    );
  }

  /**
   * Calculate variety quality.
   */

  function calculateVarietyScore(
    metrics,
    constraints
  ) {
    const recipeScore =
      calculateMinimumTargetScore(
        metrics.uniqueRecipeCount,
        constraints.repetition
          .minimumUniqueRecipesPerCycle
      );

    const vegetableScore =
      calculateMinimumTargetScore(
        metrics.uniqueVegetableCount,
        constraints.repetition
          .minimumUniqueVegetablesPerCycle
      );

    const fruitScore =
      calculateMinimumTargetScore(
        metrics.uniqueFruitCount,
        constraints.repetition
          .minimumUniqueFruitsPerCycle
      );

    return (
      recipeScore * 0.5 +
      vegetableScore * 0.3 +
      fruitScore * 0.2
    );
  }

  /**
   * Calculate vegetable score.
   */

  function calculateVegetableScore(
    plan,
    constraints
  ) {
    const days =
      Array.isArray(plan?.days)
        ? plan.days
        : [];

    if (days.length === 0) {
      return 0;
    }

    const dayScores = days.map(
      (day) => {
        const servings =
          flattenMeals([day])
            .reduce(
              (total, meal) =>
                total +
                getFoodServingsByCategory(
                  meal,
                  "vegetable"
                ),
              0
            );

        return calculateMinimumTargetScore(
          servings,
          constraints.foodFrequency
            .minimumVegetableServingsPerDay
        );
      }
    );

    return average(dayScores);
  }

  /**
   * Calculate meal-prep quality.
   */

  function calculateMealPrepScore(plan) {
    const meals =
      flattenMeals(
        plan?.days || []
      );

    if (meals.length === 0) {
      return 0;
    }

    const friendlyCount =
      meals.filter(
        (meal) =>
          meal.mealPrepFriendly !==
          false
      ).length;

    return (
      friendlyCount /
      meals.length *
      100
    );
  }

  /**
   * Estimate grocery efficiency from repeated ingredients.
   */

  function calculateGroceryEfficiencyScore(
    plan
  ) {
    const meals =
      flattenMeals(
        plan?.days || []
      );

    const ingredientIds =
      meals.flatMap(
        getMealFoodIds
      );

    if (
      ingredientIds.length === 0
    ) {
      return 0;
    }

    const uniqueCount =
      new Set(
        ingredientIds
      ).size;

    const reuseRatio =
      1 -
      uniqueCount /
        ingredientIds.length;

    return clamp(
      65 +
        reuseRatio * 50,
      0,
      100
    );
  }

  /**
   * Build transparent plan explanations.
   */

  function buildDecisionLog({
    constraints,
    cycleEvaluation,
    componentScores,
    overallScore
  }) {
    const entries = [];

    entries.push({
      type: "summary",
      title: "Overall plan quality",
      message:
        `This plan scored ${overallScore} out of 100 and is rated ${getPlanScoreRating(
          overallScore
        ).toLowerCase()}.`
    });

    if (
      componentScores.protein >=
      95
    ) {
      entries.push({
        type: "positive",
        title: "Protein target",
        message:
          "The plan consistently meets or closely approaches the preferred protein target."
      });
    }

    if (
      componentScores.variety >=
      90
    ) {
      entries.push({
        type: "positive",
        title: "Food variety",
        message:
          "The plan uses a strong range of recipes, vegetables, and fruits."
      });
    }

    if (
      componentScores.mealPrep >=
      90
    ) {
      entries.push({
        type: "positive",
        title: "Meal-prep efficiency",
        message:
          "Most meals are suitable for advance preparation."
      });
    }

    if (
      cycleEvaluation.metrics
        .fishMealCount >=
      constraints.foodFrequency
        .minimumFishMealsPerCycle
    ) {
      entries.push({
        type: "information",
        title: "Fish rotation",
        message:
          "Fish appears often enough to improve protein variety during the cycle."
      });
    }

    cycleEvaluation.warnings
      .slice(0, 5)
      .forEach((warning) => {
        entries.push({
          type: "warning",
          title: "Planning consideration",
          message: warning.message
        });
      });

    return entries;
  }

  /**
   * Calculate cycle metrics.
   */

  function calculateCycleMetrics(
    days,
    meals
  ) {
    const uniqueFoodIds =
      new Set(
        meals.flatMap(
          getMealFoodIds
        )
      );

    const uniqueRecipeIds =
      new Set(
        meals
          .map(
            (meal) =>
              meal.recipeId ||
              meal.id ||
              meal.name
          )
          .filter(Boolean)
      );

    const uniqueVegetables =
      getUniqueFoodIdsByCategory(
        meals,
        "vegetable"
      );

    const uniqueFruits =
      getUniqueFoodIdsByCategory(
        meals,
        "fruit"
      );

    return {
      dayCount: days.length,
      mealCount: meals.length,
      uniqueFoodCount:
        uniqueFoodIds.size,
      uniqueRecipeCount:
        uniqueRecipeIds.size,
      uniqueVegetableCount:
        uniqueVegetables.length,
      uniqueFruitCount:
        uniqueFruits.length,
      fishMealCount:
        countMealsContainingAnyFood(
          meals,
          [
            "salmon",
            "cod",
            "canned-tuna",
            "shrimp"
          ]
        )
    };
  }

  /**
   * Get day macros.
   */

  function getDayMacros(day) {
    if (
      day?.macros &&
      typeof day.macros ===
        "object"
    ) {
      return normalizeMacros(
        day.macros
      );
    }

    if (
      window.ELEVEN_NUTRITION &&
      typeof window
        .ELEVEN_NUTRITION
        .calculateDayMacros ===
        "function"
    ) {
      return window
        .ELEVEN_NUTRITION
        .calculateDayMacros(day);
    }

    return createEmptyMacros();
  }

  /**
   * Get meal macros.
   */

  function getMealMacros(meal) {
    if (
      meal?.macros &&
      typeof meal.macros ===
        "object"
    ) {
      return normalizeMacros(
        meal.macros
      );
    }

    if (
      window.ELEVEN_NUTRITION &&
      typeof window
        .ELEVEN_NUTRITION
        .calculateMealMacros ===
        "function"
    ) {
      return window
        .ELEVEN_NUTRITION
        .calculateMealMacros(meal);
    }

    return createEmptyMacros();
  }

  /**
   * Get a day's intended targets.
   */

  function getDayTargets(
    day,
    profile
  ) {
    if (
      day?.targets &&
      typeof day.targets ===
        "object"
    ) {
      return normalizeMacros(
        day.targets
      );
    }

    const profileTargets =
      profile?.targets;

    if (!profileTargets) {
      return createEmptyMacros();
    }

    return {
      calories:
        toFiniteNumber(
          profileTargets
            .calorieTarget
        ),
      protein:
        toFiniteNumber(
          profileTargets
            .proteinTarget
        ),
      carbohydrates: 0,
      fat: 0,
      fibre: 0
    };
  }

  /**
   * Return meal foods.
   */

  function getMealFoods(meal) {
    if (
      Array.isArray(
        meal?.ingredients
      )
    ) {
      return meal.ingredients
        .map((ingredient) => {
          if (ingredient.food) {
            return {
              ...ingredient.food,
              quantity:
                ingredient.quantity ??
                1
            };
          }

          const food =
            typeof window
              .getElevenFoodById ===
            "function"
              ? window
                  .getElevenFoodById(
                    ingredient.foodId
                  )
              : null;

          return food
            ? {
                ...food,
                quantity:
                  ingredient.quantity ??
                  1
              }
            : null;
        })
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Return food IDs used by a meal.
   */

  function getMealFoodIds(meal) {
    return getMealFoods(meal)
      .map((food) => food.id)
      .filter(Boolean);
  }

  /**
   * Count servings from one category.
   */

  function getFoodServingsByCategory(
    meal,
    category
  ) {
    return getMealFoods(meal)
      .filter(
        (food) =>
          food.category ===
          category
      )
      .reduce(
        (total, food) =>
          total +
          toFiniteNumber(
            food.quantity || 1
          ),
        0
      );
  }

  /**
   * Return unique food IDs by category.
   */

  function getUniqueFoodIdsByCategory(
    meals,
    category
  ) {
    return [
      ...new Set(
        meals.flatMap(
          (meal) =>
            getMealFoods(meal)
              .filter(
                (food) =>
                  food.category ===
                  category
              )
              .map(
                (food) => food.id
              )
        )
      )
    ];
  }

  /**
   * Return primary proteins used by a day.
   */

  function getPrimaryProteinsFromDay(
    day
  ) {
    return [
      ...new Set(
        flattenMeals([day])
          .flatMap(getMealFoods)
          .filter(
            (food) =>
              food.category ===
              "protein"
          )
          .map((food) => food.id)
      )
    ];
  }

  /**
   * Check for a food.
   */

  function mealContainsFood(
    meal,
    foodId
  ) {
    return getMealFoodIds(
      meal
    ).includes(foodId);
  }

  /**
   * Check for any food in a list.
   */

  function mealContainsAnyFood(
    meal,
    foodIds
  ) {
    return foodIds.some(
      (foodId) =>
        mealContainsFood(
          meal,
          foodId
        )
    );
  }

  /**
   * Detect protein shake meals.
   */

  function isProteinShakeMeal(
    meal
  ) {
    return Boolean(
      meal?.recipeId ===
        "protein-shake-snack" ||
      meal?.recipeId ===
        "protein-smoothie" ||
      mealContainsAnyFood(
        meal,
        [
          "whey-protein",
          "plant-protein"
        ]
      ) ||
      getMealFoods(meal).some(
        (food) =>
          food.isCustom &&
          (
            food.name
              ?.toLowerCase()
              .includes(
                "protein shake"
              ) ||
            food.name
              ?.toLowerCase()
              .includes(
                "protein drink"
              )
          )
      )
    );
  }

  /**
   * Count meals containing one food.
   */

  function countMealsContainingFood(
    meals,
    foodId
  ) {
    return meals.filter(
      (meal) =>
        mealContainsFood(
          meal,
          foodId
        )
    ).length;
  }

  /**
   * Count meals containing any food.
   */

  function countMealsContainingAnyFood(
    meals,
    foodIds
  ) {
    return meals.filter(
      (meal) =>
        mealContainsAnyFood(
          meal,
          foodIds
        )
    ).length;
  }

  /**
   * Flatten plan days into meals.
   */

  function flattenMeals(days) {
    return days.flatMap(
      (day) =>
        Array.isArray(day?.meals)
          ? day.meals
          : []
    );
  }

  /**
   * Create an issue object.
   */

  function createIssue(issue) {
    return {
      code:
        issue.code ||
        "unknown",
      severity:
        issue.severity ||
        SEVERITY.information,
      message:
        issue.message ||
        "",
      day:
        issue.day ?? null,
      mealType:
        issue.mealType ?? null,
      recipeId:
        issue.recipeId ?? null,
      foodId:
        issue.foodId ?? null,
      expected:
        issue.expected ?? null,
      actual:
        issue.actual ?? null
    };
  }

  /**
   * Score how closely a value matches a target.
   */

  function calculateTargetMatchScore(
    actual,
    target
  ) {
    const safeTarget =
      toFiniteNumber(target);

    if (safeTarget <= 0) {
      return 0;
    }

    const difference =
      Math.abs(
        toFiniteNumber(actual) -
        safeTarget
      );

    return clamp(
      100 -
        difference /
          safeTarget *
          100,
      0,
      100
    );
  }

  /**
   * Score minimum-target attainment.
   */

  function calculateMinimumTargetScore(
    actual,
    target
  ) {
    const safeTarget =
      toFiniteNumber(target);

    if (safeTarget <= 0) {
      return 0;
    }

    return clamp(
      toFiniteNumber(actual) /
        safeTarget *
        100,
      0,
      100
    );
  }

  /**
   * Normalize score weights.
   */

  function normalizeWeights(
    suppliedWeights
  ) {
    const weights = {
      ...DEFAULT_CONSTRAINTS
        .scoringWeights,
      ...suppliedWeights
    };

    const total =
      Object.values(weights).reduce(
        (sum, value) =>
          sum +
          toFiniteNumber(value),
        0
      );

    if (total <= 0) {
      return cloneValue(
        DEFAULT_CONSTRAINTS
          .scoringWeights
      );
    }

    return Object.fromEntries(
      Object.entries(weights).map(
        ([key, value]) => [
          key,
          toFiniteNumber(value) /
            total
        ]
      )
    );
  }

  /**
   * Return score rating.
   */

  function getPlanScoreRating(
    score
  ) {
    const value =
      toFiniteNumber(score);

    if (value >= 95) {
      return "Exceptional";
    }

    if (value >= 90) {
      return "Excellent";
    }

    if (value >= 80) {
      return "Very good";
    }

    if (value >= 70) {
      return "Good";
    }

    if (value >= 60) {
      return "Needs improvement";
    }

    return "Regenerate";
  }

  /**
   * Count records by key.
   */

  function countBy(
    items,
    keyFunction
  ) {
    return items.reduce(
      (counts, item) => {
        const key =
          keyFunction(item);

        if (!key) {
          return counts;
        }

        counts[key] =
          (counts[key] || 0) +
          1;

        return counts;
      },
      {}
    );
  }

  /**
   * Calculate average.
   */

  function average(values) {
    const safeValues =
      values
        .map(toFiniteNumber)
        .filter(
          (value) =>
            Number.isFinite(value)
        );

    if (
      safeValues.length === 0
    ) {
      return 0;
    }

    return (
      safeValues.reduce(
        (total, value) =>
          total + value,
        0
      ) /
      safeValues.length
    );
  }

  /**
   * Normalize macros.
   */

  function normalizeMacros(
    macros = {}
  ) {
    return {
      calories:
        toFiniteNumber(
          macros.calories
        ),
      protein:
        toFiniteNumber(
          macros.protein
        ),
      carbohydrates:
        toFiniteNumber(
          macros.carbohydrates
        ),
      fat:
        toFiniteNumber(
          macros.fat
        ),
      fibre:
        toFiniteNumber(
          macros.fibre
        )
    };
  }

  /**
   * Empty macro object.
   */

  function createEmptyMacros() {
    return {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fibre: 0
    };
  }

  /**
   * Merge nested objects.
   */

  function deepMerge(
    target,
    source
  ) {
    if (
      !source ||
      typeof source !==
        "object" ||
      Array.isArray(source)
    ) {
      return target;
    }

    Object.entries(source).forEach(
      ([key, value]) => {
        if (
          value &&
          typeof value ===
            "object" &&
          !Array.isArray(value)
        ) {
          target[key] =
            deepMerge(
              target[key] &&
              typeof target[key] ===
                "object"
                ? target[key]
                : {},
              value
            );
        } else {
          target[key] =
            cloneValue(value);
        }
      }
    );

    return target;
  }

  /**
   * Clone a serializable value.
   */

  function cloneValue(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return value;
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }

  /**
   * Convert to finite number.
   */

  function toFiniteNumber(value) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  /**
   * Round a number.
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
          toFiniteNumber(value) +
          Number.EPSILON
        ) *
          multiplier
      ) /
      multiplier
    );
  }

  /**
   * Restrict a value.
   */

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

  /**
   * Capitalize text.
   */

  function capitalize(value) {
    const text =
      String(value || "");

    return text
      ? text.charAt(0)
          .toUpperCase() +
          text.slice(1)
      : "";
  }

  return {
    defaults:
      cloneValue(
        DEFAULT_CONSTRAINTS
      ),

    severity: {
      ...SEVERITY
    },

    createConstraints,
    validateConstraints,
    evaluatePlan,
    evaluateDay,
    evaluateCycleRules,
    calculateWeightedScore,
    getPlanScoreRating
  };
})();
