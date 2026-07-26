"use strict";

/**
 * Eleven nutrition utilities
 *
 * This file contains the calculation functions used by the profile,
 * meal generator, recipe engine, and progress dashboard.
 *
 * All results are estimates for general meal-planning purposes.
 */

window.ELEVEN_NUTRITION = (() => {
  const POUNDS_TO_KILOGRAMS = 0.45359237;
  const INCHES_TO_CENTIMETRES = 2.54;

  const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    "very-active": 1.9
  };

  const WEEKLY_LOSS_RATES = {
    conservative: {
      poundsPerWeek: 0.5,
      dailyCalorieDeficit: 250
    },
    moderate: {
      poundsPerWeek: 1,
      dailyCalorieDeficit: 500
    },
    aggressive: {
      poundsPerWeek: 1.5,
      dailyCalorieDeficit: 750
    }
  };

  const DEFAULT_MINIMUM_CALORIES = {
    male: 1500,
    female: 1200
  };

  const DEFAULT_PROTEIN_SETTINGS = {
    gramsPerKilogramGoalWeight: 1.8,
    minimumGrams: 100,
    maximumGrams: 220
  };

  /**
   * Convert pounds to kilograms.
   *
   * @param {number} pounds
   * @returns {number}
   */

  function poundsToKilograms(pounds) {
    return toFiniteNumber(pounds) * POUNDS_TO_KILOGRAMS;
  }

  /**
   * Convert kilograms to pounds.
   *
   * @param {number} kilograms
   * @returns {number}
   */

  function kilogramsToPounds(kilograms) {
    return toFiniteNumber(kilograms) / POUNDS_TO_KILOGRAMS;
  }

  /**
   * Convert feet and inches to total inches.
   *
   * @param {number} feet
   * @param {number} inches
   * @returns {number}
   */

  function heightToTotalInches(feet, inches) {
    return (
      toFiniteNumber(feet) * 12 +
      toFiniteNumber(inches)
    );
  }

  /**
   * Convert feet and inches to centimetres.
   *
   * @param {number} feet
   * @param {number} inches
   * @returns {number}
   */

  function heightToCentimetres(feet, inches) {
    return (
      heightToTotalInches(feet, inches) *
      INCHES_TO_CENTIMETRES
    );
  }

  /**
   * Calculate basal metabolic rate using the
   * Mifflin-St Jeor equation.
   *
   * Male:
   * 10W + 6.25H - 5A + 5
   *
   * Female:
   * 10W + 6.25H - 5A - 161
   *
   * W = kilograms
   * H = centimetres
   * A = age
   *
   * @param {object} profile
   * @returns {number|null}
   */

  function calculateBmr(profile) {
    if (!isValidProfileForCalculation(profile)) {
      return null;
    }

    const weightKilograms = poundsToKilograms(
      profile.currentWeight
    );

    const heightCentimetres = heightToCentimetres(
      profile.heightFeet,
      profile.heightInches
    );

    const age = toFiniteNumber(profile.age);

    const sexAdjustment =
      profile.sex === "male"
        ? 5
        : -161;

    const bmr =
      10 * weightKilograms +
      6.25 * heightCentimetres -
      5 * age +
      sexAdjustment;

    return roundNumber(bmr);
  }

  /**
   * Estimate total daily energy expenditure.
   *
   * @param {object} profile
   * @returns {number|null}
   */

  function calculateMaintenanceCalories(profile) {
    const bmr = calculateBmr(profile);

    if (bmr === null) {
      return null;
    }

    const multiplier =
      ACTIVITY_MULTIPLIERS[profile.activityLevel];

    if (!multiplier) {
      return null;
    }

    return roundToNearest(
      bmr * multiplier,
      10
    );
  }

  /**
   * Calculate a calorie target from estimated maintenance
   * and the selected weight-loss rate.
   *
   * The result is prevented from dropping below the default
   * minimum intake assigned to the selected sex.
   *
   * @param {object} profile
   * @returns {number|null}
   */

  function calculateCalorieTarget(profile) {
    const maintenance =
      calculateMaintenanceCalories(profile);

    if (maintenance === null) {
      return null;
    }

    const lossRate =
      WEEKLY_LOSS_RATES[profile.lossRate] ||
      WEEKLY_LOSS_RATES.moderate;

    const minimumCalories =
      DEFAULT_MINIMUM_CALORIES[profile.sex] ||
      DEFAULT_MINIMUM_CALORIES.female;

    const calculatedTarget =
      maintenance - lossRate.dailyCalorieDeficit;

    const protectedTarget = Math.max(
      calculatedTarget,
      minimumCalories
    );

    return roundToNearest(protectedTarget, 25);
  }

  /**
   * Calculate a daily protein target.
   *
   * Protein is based primarily on goal weight rather than
   * current weight so the target remains practical while
   * supporting satiety and lean-mass retention.
   *
   * @param {object} profile
   * @returns {number|null}
   */

  function calculateProteinTarget(profile) {
    const goalWeight =
      toFiniteNumber(profile?.goalWeight);

    const currentWeight =
      toFiniteNumber(profile?.currentWeight);

    const referenceWeight =
      goalWeight > 0
        ? goalWeight
        : currentWeight;

    if (referenceWeight <= 0) {
      return null;
    }

    const referenceKilograms =
      poundsToKilograms(referenceWeight);

    const calculatedProtein =
      referenceKilograms *
      DEFAULT_PROTEIN_SETTINGS
        .gramsPerKilogramGoalWeight;

    const protectedProtein = clamp(
      calculatedProtein,
      DEFAULT_PROTEIN_SETTINGS.minimumGrams,
      DEFAULT_PROTEIN_SETTINGS.maximumGrams
    );

    return roundToNearest(protectedProtein, 5);
  }

  /**
   * Calculate BMI.
   *
   * @param {number} weightPounds
   * @param {number} heightFeet
   * @param {number} heightInches
   * @returns {number|null}
   */

  function calculateBmi(
    weightPounds,
    heightFeet,
    heightInches
  ) {
    const weightKilograms =
      poundsToKilograms(weightPounds);

    const heightMetres =
      heightToCentimetres(
        heightFeet,
        heightInches
      ) / 100;

    if (
      weightKilograms <= 0 ||
      heightMetres <= 0
    ) {
      return null;
    }

    return roundNumber(
      weightKilograms /
        (heightMetres * heightMetres),
      1
    );
  }

  /**
   * Return a plain-language BMI category.
   *
   * @param {number} bmi
   * @returns {string}
   */

  function getBmiCategory(bmi) {
    const numericBmi = toFiniteNumber(bmi);

    if (numericBmi <= 0) {
      return "Unavailable";
    }

    if (numericBmi < 18.5) {
      return "Below reference range";
    }

    if (numericBmi < 25) {
      return "Reference range";
    }

    if (numericBmi < 30) {
      return "Above reference range";
    }

    return "Well above reference range";
  }

  /**
   * Estimate the number of weeks required to reach the
   * goal weight at the selected rate.
   *
   * @param {object} profile
   * @returns {number|null}
   */

  function estimateWeeksToGoal(profile) {
    const currentWeight =
      toFiniteNumber(profile?.currentWeight);

    const goalWeight =
      toFiniteNumber(profile?.goalWeight);

    if (
      currentWeight <= 0 ||
      goalWeight <= 0 ||
      currentWeight <= goalWeight
    ) {
      return null;
    }

    const lossRate =
      WEEKLY_LOSS_RATES[profile.lossRate] ||
      WEEKLY_LOSS_RATES.moderate;

    const poundsToLose =
      currentWeight - goalWeight;

    return Math.ceil(
      poundsToLose /
      lossRate.poundsPerWeek
    );
  }

  /**
   * Calculate all profile targets in one operation.
   *
   * @param {object} profile
   * @returns {object|null}
   */

  function calculateProfileTargets(profile) {
    if (!isValidProfileForCalculation(profile)) {
      return null;
    }

    const bmr = calculateBmr(profile);

    const maintenanceCalories =
      calculateMaintenanceCalories(profile);

    const calorieTarget =
      calculateCalorieTarget(profile);

    const proteinTarget =
      calculateProteinTarget(profile);

    const bmi = calculateBmi(
      profile.currentWeight,
      profile.heightFeet,
      profile.heightInches
    );

    return {
      bmr,
      maintenanceCalories,
      calorieTarget,
      proteinTarget,
      bmi,
      bmiCategory: getBmiCategory(bmi),
      estimatedWeeksToGoal:
        estimateWeeksToGoal(profile)
    };
  }

  /**
   * Return an empty macro object.
   *
   * @returns {object}
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
   * Normalize a macro object.
   *
   * @param {object} macros
   * @returns {object}
   */

  function normalizeMacros(macros = {}) {
    return {
      calories: toFiniteNumber(macros.calories),
      protein: toFiniteNumber(macros.protein),
      carbohydrates:
        toFiniteNumber(macros.carbohydrates),
      fat: toFiniteNumber(macros.fat),
      fibre: toFiniteNumber(macros.fibre)
    };
  }

  /**
   * Scale a food's nutrition by a quantity multiplier.
   *
   * A quantity of 1 equals the serving described in
   * data/foods.js.
   *
   * @param {object} food
   * @param {number} quantity
   * @returns {object}
   */

  function scaleFoodNutrition(food, quantity = 1) {
    if (!food) {
      return createEmptyMacros();
    }

    const multiplier = Math.max(
      0,
      toFiniteNumber(quantity)
    );

    return {
      calories: roundNumber(
        toFiniteNumber(food.calories) *
          multiplier
      ),
      protein: roundNumber(
        toFiniteNumber(food.protein) *
          multiplier,
        1
      ),
      carbohydrates: roundNumber(
        toFiniteNumber(food.carbohydrates) *
          multiplier,
        1
      ),
      fat: roundNumber(
        toFiniteNumber(food.fat) *
          multiplier,
        1
      ),
      fibre: roundNumber(
        toFiniteNumber(food.fibre) *
          multiplier,
        1
      )
    };
  }

  /**
   * Add any number of macro objects together.
   *
   * @param {...object} macroObjects
   * @returns {object}
   */

  function addMacros(...macroObjects) {
    const total = createEmptyMacros();

    macroObjects.forEach((macroObject) => {
      const normalized =
        normalizeMacros(macroObject);

      total.calories += normalized.calories;
      total.protein += normalized.protein;
      total.carbohydrates +=
        normalized.carbohydrates;
      total.fat += normalized.fat;
      total.fibre += normalized.fibre;
    });

    return roundMacros(total);
  }

  /**
   * Calculate macros for a generated ingredient.
   *
   * The ingredient is expected to contain a food object or
   * food ID and a quantity multiplier.
   *
   * @param {object} ingredient
   * @returns {object}
   */

  function calculateIngredientMacros(ingredient) {
    if (!ingredient) {
      return createEmptyMacros();
    }

    let food = ingredient.food || null;

    if (
      !food &&
      ingredient.foodId &&
      typeof window.getElevenFoodById ===
        "function"
    ) {
      food = window.getElevenFoodById(
        ingredient.foodId
      );
    }

    return scaleFoodNutrition(
      food,
      ingredient.quantity ?? 1
    );
  }

  /**
   * Calculate macros for a meal containing generated
   * ingredients.
   *
   * @param {object[]|object} mealOrIngredients
   * @returns {object}
   */

  function calculateMealMacros(
    mealOrIngredients
  ) {
    const ingredients = Array.isArray(
      mealOrIngredients
    )
      ? mealOrIngredients
      : mealOrIngredients?.ingredients || [];

    const macroObjects = ingredients.map(
      calculateIngredientMacros
    );

    return addMacros(...macroObjects);
  }

  /**
   * Calculate macros for one day.
   *
   * @param {object[]|object} dayOrMeals
   * @returns {object}
   */

  function calculateDayMacros(dayOrMeals) {
    const meals = Array.isArray(dayOrMeals)
      ? dayOrMeals
      : dayOrMeals?.meals || [];

    return addMacros(
      ...meals.map(calculateMealMacros)
    );
  }

  /**
   * Calculate macros across a complete plan.
   *
   * @param {object[]|object} planOrDays
   * @returns {object}
   */

  function calculatePlanMacros(planOrDays) {
    const days = Array.isArray(planOrDays)
      ? planOrDays
      : planOrDays?.days || [];

    return addMacros(
      ...days.map(calculateDayMacros)
    );
  }

  /**
   * Calculate average daily macros for a plan.
   *
   * @param {object[]|object} planOrDays
   * @returns {object}
   */

  function calculateAverageDailyMacros(
    planOrDays
  ) {
    const days = Array.isArray(planOrDays)
      ? planOrDays
      : planOrDays?.days || [];

    if (days.length === 0) {
      return createEmptyMacros();
    }

    const totals =
      calculatePlanMacros(days);

    return roundMacros({
      calories:
        totals.calories / days.length,
      protein:
        totals.protein / days.length,
      carbohydrates:
        totals.carbohydrates / days.length,
      fat:
        totals.fat / days.length,
      fibre:
        totals.fibre / days.length
    });
  }

  /**
   * Calculate how closely a meal or day matches a target.
   *
   * A score closer to 100 indicates a closer match.
   *
   * @param {object} actual
   * @param {object} target
   * @returns {number}
   */

  function calculateMacroMatchScore(
    actual,
    target
  ) {
    const normalizedActual =
      normalizeMacros(actual);

    const normalizedTarget =
      normalizeMacros(target);

    const weightedDifferences = [
      {
        actual: normalizedActual.calories,
        target: normalizedTarget.calories,
        weight: 0.5
      },
      {
        actual: normalizedActual.protein,
        target: normalizedTarget.protein,
        weight: 0.3
      },
      {
        actual:
          normalizedActual.carbohydrates,
        target:
          normalizedTarget.carbohydrates,
        weight: 0.1
      },
      {
        actual: normalizedActual.fat,
        target: normalizedTarget.fat,
        weight: 0.1
      }
    ];

    let totalDifference = 0;
    let totalWeight = 0;

    weightedDifferences.forEach((item) => {
      if (item.target <= 0) {
        return;
      }

      const relativeDifference =
        Math.abs(
          item.actual - item.target
        ) / item.target;

      totalDifference +=
        relativeDifference * item.weight;

      totalWeight += item.weight;
    });

    if (totalWeight === 0) {
      return 0;
    }

    const normalizedDifference =
      totalDifference / totalWeight;

    return roundNumber(
      clamp(
        100 - normalizedDifference * 100,
        0,
        100
      ),
      1
    );
  }

  /**
   * Create daily macro targets from calories and protein.
   *
   * Remaining calories are divided between carbohydrates
   * and fat. This is not intended to represent a strict
   * ketogenic ratio.
   *
   * @param {number} calorieTarget
   * @param {number} proteinTarget
   * @param {object} options
   * @returns {object}
   */

  function createDailyMacroTargets(
    calorieTarget,
    proteinTarget,
    options = {}
  ) {
    const calories =
      toFiniteNumber(calorieTarget);

    const protein =
      toFiniteNumber(proteinTarget);

    if (
      calories <= 0 ||
      protein <= 0
    ) {
      return createEmptyMacros();
    }

    const fatCalorieShare = clamp(
      toFiniteNumber(
        options.fatCalorieShare ?? 0.3
      ),
      0.2,
      0.4
    );

    const proteinCalories =
      protein * 4;

    const fatCalories =
      calories * fatCalorieShare;

    const carbohydrateCalories = Math.max(
      0,
      calories -
        proteinCalories -
        fatCalories
    );

    return {
      calories: roundToNearest(
        calories,
        5
      ),
      protein: roundToNearest(
        protein,
        5
      ),
      carbohydrates: roundToNearest(
        carbohydrateCalories / 4,
        5
      ),
      fat: roundToNearest(
        fatCalories / 9,
        5
      ),
      fibre:
        calories >= 2000
          ? 30
          : 25
    };
  }

  /**
   * Create calorie-shifted targets across an 11-day cycle.
   *
   * The average remains close to the user's base target.
   * This variation is for flexibility and meal variety,
   * not to claim a special metabolic effect.
   *
   * @param {number} baseCalorieTarget
   * @param {number} proteinTarget
   * @returns {object[]}
   */

  function createElevenDayTargets(
    baseCalorieTarget,
    proteinTarget
  ) {
    const caloriePattern = [
      0.94,
      1.03,
      0.97,
      1.06,
      0.92,
      1,
      1.04,
      0.95,
      1.02,
      0.96,
      1.01
    ];

    const proteinPattern = [
      1,
      1,
      1.02,
      1,
      1.03,
      1,
      1,
      1.02,
      1,
      1.03,
      1
    ];

    return caloriePattern.map(
      (calorieMultiplier, index) => {
        const calories = roundToNearest(
          baseCalorieTarget *
            calorieMultiplier,
          25
        );

        const protein = roundToNearest(
          proteinTarget *
            proteinPattern[index],
          5
        );

        return {
          day: index + 1,
          ...createDailyMacroTargets(
            calories,
            protein
          )
        };
      }
    );
  }

  /**
   * Validate the profile fields required for nutrition
   * calculations.
   *
   * @param {object} profile
   * @returns {boolean}
   */

  function isValidProfileForCalculation(
    profile
  ) {
    if (!profile) {
      return false;
    }

    const validSex =
      profile.sex === "male" ||
      profile.sex === "female";

    const validActivity =
      Boolean(
        ACTIVITY_MULTIPLIERS[
          profile.activityLevel
        ]
      );

    return Boolean(
      validSex &&
      validActivity &&
      toFiniteNumber(profile.age) >= 18 &&
      toFiniteNumber(
        profile.currentWeight
      ) > 0 &&
      toFiniteNumber(
        profile.heightFeet
      ) > 0 &&
      toFiniteNumber(
        profile.heightInches
      ) >= 0
    );
  }

  /**
   * Convert an input to a safe finite number.
   *
   * @param {*} value
   * @returns {number}
   */

  function toFiniteNumber(value) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  /**
   * Round a number to a selected number of decimal places.
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
        (toFiniteNumber(value) +
          Number.EPSILON) *
          multiplier
      ) / multiplier
    );
  }

  /**
   * Round to a specified interval.
   *
   * @param {number} value
   * @param {number} interval
   * @returns {number}
   */

  function roundToNearest(
    value,
    interval = 1
  ) {
    const safeInterval = Math.max(
      1,
      toFiniteNumber(interval)
    );

    return (
      Math.round(
        toFiniteNumber(value) /
          safeInterval
      ) * safeInterval
    );
  }

  /**
   * Restrict a value to a minimum and maximum.
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
        toFiniteNumber(value),
        minimum
      ),
      maximum
    );
  }

  /**
   * Round every property in a macro object.
   *
   * @param {object} macros
   * @returns {object}
   */

  function roundMacros(macros) {
    return {
      calories: roundNumber(
        macros.calories
      ),
      protein: roundNumber(
        macros.protein,
        1
      ),
      carbohydrates: roundNumber(
        macros.carbohydrates,
        1
      ),
      fat: roundNumber(
        macros.fat,
        1
      ),
      fibre: roundNumber(
        macros.fibre,
        1
      )
    };
  }

  return {
    constants: {
      poundsToKilograms:
        POUNDS_TO_KILOGRAMS,
      inchesToCentimetres:
        INCHES_TO_CENTIMETRES,
      activityMultipliers:
        { ...ACTIVITY_MULTIPLIERS },
      weeklyLossRates:
        JSON.parse(
          JSON.stringify(
            WEEKLY_LOSS_RATES
          )
        ),
      minimumCalories:
        { ...DEFAULT_MINIMUM_CALORIES },
      proteinSettings:
        { ...DEFAULT_PROTEIN_SETTINGS }
    },

    poundsToKilograms,
    kilogramsToPounds,
    heightToTotalInches,
    heightToCentimetres,
    calculateBmr,
    calculateMaintenanceCalories,
    calculateCalorieTarget,
    calculateProteinTarget,
    calculateBmi,
    getBmiCategory,
    estimateWeeksToGoal,
    calculateProfileTargets,
    createEmptyMacros,
    normalizeMacros,
    scaleFoodNutrition,
    addMacros,
    calculateIngredientMacros,
    calculateMealMacros,
    calculateDayMacros,
    calculatePlanMacros,
    calculateAverageDailyMacros,
    calculateMacroMatchScore,
    createDailyMacroTargets,
    createElevenDayTargets,
    isValidProfileForCalculation,
    roundNumber,
    roundToNearest,
    clamp
  };
})();
