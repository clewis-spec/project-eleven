"use strict";

/**
 * Eleven developer diagnostics engine
 *
 * Responsibilities:
 *
 * - Inspect Eleven's loaded JavaScript modules
 * - Verify critical public methods exist
 * - Validate the current stored profile, preferences, meal plan,
 *   grocery list, and cycle progress
 * - Detect common integration problems
 * - Produce a single health report for the Developer Console
 *
 * This module does not render an interface.
 */

window.ELEVEN_DEVELOPER_DIAGNOSTICS = (() => {
  const VERSION = 1;

  const MODULE_DEFINITIONS = [
    {
      id: "storage",
      name: "Storage",
      globalName: "ELEVEN_STORAGE",
      requiredMethods: [
        "getProfile",
        "getPreferences",
        "getMealPlan",
        "saveMealPlan"
      ]
    },

    {
      id: "profile",
      name: "Profile",
      globalName: "ELEVEN_PROFILE",
      requiredMethods: [
        "init"
      ]
    },

    {
      id: "custom-foods",
      name: "Custom Foods",
      globalName: "ELEVEN_CUSTOM_FOODS",
      requiredMethods: [
        "init"
      ]
    },

    {
      id: "preferences",
      name: "Preferences",
      globalName: "ELEVEN_PREFERENCES",
      requiredMethods: [
        "init"
      ]
    },

    {
      id: "nutrition",
      name: "Nutrition Engine",
      globalName: "ELEVEN_NUTRITION",
      requiredMethods: [
        "calculateMealMacros",
        "calculateDayMacros",
        "calculateProfileTargets"
      ]
    },

    {
      id: "constraints",
      name: "Constraint Engine",
      globalName: "ELEVEN_CONSTRAINTS",
      requiredMethods: [
        "createConstraints",
        "evaluatePlan",
        "getPlanScoreRating"
      ]
    },

    {
      id: "planner",
      name: "Planner",
      globalName: "ELEVEN_PLANNER",
      requiredMethods: [
        "createCycleStrategy",
        "rankRecipeCandidates"
      ]
    },

    {
      id: "optimizer",
      name: "Optimizer",
      globalName: "ELEVEN_OPTIMIZER",
      requiredMethods: [
        "optimizeCycle",
        "evaluateStrategy"
      ]
    },

    {
      id: "meal-generator",
      name: "Meal Generator",
      globalName: "ELEVEN_MEAL_GENERATOR",
      requiredMethods: [
        "init",
        "generatePlan",
        "renderPlan"
      ]
    },

    {
      id: "calendar-timeline",
      name: "Calendar Timeline",
      globalName: "ELEVEN_CALENDAR_TIMELINE",
      requiredMethods: [
        "render",
        "createTimelineState"
      ]
    },

    {
      id: "calendar-day-card",
      name: "Calendar Day Card",
      globalName: "ELEVEN_CALENDAR_DAY_CARD",
      requiredMethods: [
        "render",
        "createDayState"
      ]
    },

    {
      id: "calendar-progress",
      name: "Calendar Progress",
      globalName: "ELEVEN_CALENDAR_PROGRESS",
      requiredMethods: [
        "calculateProgress",
        "setDayCompletion",
        "resetCycleProgress"
      ]
    },

    {
      id: "calendar",
      name: "Calendar Controller",
      globalName: "ELEVEN_CALENDAR",
      requiredMethods: [
        "init",
        "refresh",
        "selectDay"
      ]
    },

    {
      id: "grocery-optimizer",
      name: "Grocery Optimizer",
      globalName: "ELEVEN_GROCERY_OPTIMIZER",
      requiredMethods: [
        "createGroceryList",
        "generateFromSavedPlan"
      ]
    },

    {
      id: "grocery",
      name: "Grocery Interface",
      globalName: "ELEVEN_GROCERY",
      requiredMethods: [
        "init",
        "refresh"
      ]
    },

    {
      id: "dashboard",
      name: "Dashboard",
      globalName: "ELEVEN_DASHBOARD",
      requiredMethods: [
        "init",
        "refresh"
      ]
    }
  ];

  /**
   * Run the complete Eleven diagnostic review.
   *
   * @returns {object}
   */

  function runDiagnostics() {
    const startedAt =
      new Date().toISOString();

    const moduleReport =
      inspectModules();

    const databaseReport =
      inspectDatabases();

    const storageReport =
      inspectStoredData();

    const profileReport =
      inspectProfile(
        storageReport.data.profile
      );

    const preferencesReport =
      inspectPreferences(
        storageReport.data.preferences
      );

    const mealPlanReport =
      inspectMealPlan(
        storageReport.data.mealPlan
      );

    const groceryReport =
      inspectGroceryList(
        storageReport.data.groceryList,
        storageReport.data.mealPlan
      );

    const progressReport =
      inspectProgress(
        storageReport.data.mealPlan
      );

    const issueSummary =
      collectIssues([
        moduleReport,
        databaseReport,
        storageReport,
        profileReport,
        preferencesReport,
        mealPlanReport,
        groceryReport,
        progressReport
      ]);

    const score =
      calculateHealthScore({
        moduleReport,
        databaseReport,
        storageReport,
        profileReport,
        preferencesReport,
        mealPlanReport,
        groceryReport,
        progressReport,
        issueSummary
      });

    return {
      version: VERSION,
      startedAt,
      completedAt:
        new Date().toISOString(),

      status:
        getHealthStatus(score),

      score,

      summary: {
        moduleCount:
          moduleReport.items.length,

        healthyModuleCount:
          moduleReport.items.filter(
            (item) =>
              item.status === "healthy"
          ).length,

        warningCount:
          issueSummary.warnings.length,

        errorCount:
          issueSummary.errors.length,

        informationCount:
          issueSummary.information.length
      },

      reports: {
        modules:
          moduleReport,

        databases:
          databaseReport,

        storage:
          storageReport,

        profile:
          profileReport,

        preferences:
          preferencesReport,

        mealPlan:
          mealPlanReport,

        grocery:
          groceryReport,

        progress:
          progressReport
      },

      issues:
        issueSummary
    };
  }

  /**
   * Inspect all expected global modules.
   *
   * @returns {object}
   */

  function inspectModules() {
    const items =
      MODULE_DEFINITIONS.map(
        inspectModule
      );

    const healthyCount =
      items.filter(
        (item) =>
          item.status === "healthy"
      ).length;

    const warningCount =
      items.filter(
        (item) =>
          item.status === "warning"
      ).length;

    const errorCount =
      items.filter(
        (item) =>
          item.status === "error"
      ).length;

    return {
      id: "modules",
      name: "JavaScript modules",

      status:
        errorCount > 0
          ? "error"
          : warningCount > 0
            ? "warning"
            : "healthy",

      metrics: {
        total:
          items.length,
        healthy:
          healthyCount,
        warnings:
          warningCount,
        errors:
          errorCount
      },

      items,

      issues:
        items.flatMap(
          (item) =>
            item.issues
        )
    };
  }

  /**
   * Inspect one global module.
   *
   * @param {object} definition
   * @returns {object}
   */

  function inspectModule(
    definition
  ) {
    const module =
      window[
        definition.globalName
      ];

    const issues = [];

    if (!module) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "module-missing",
          source:
            definition.id,
          message:
            `${definition.name} is not loaded.`,
          recommendation:
            `Confirm ${definition.globalName} is loaded before app.js.`
        })
      );

      return {
        ...definition,
        loaded: false,
        status: "error",
        availableMethods: [],
        missingMethods: [
          ...definition
            .requiredMethods
        ],
        issues
      };
    }

    const availableMethods =
      definition
        .requiredMethods
        .filter(
          (methodName) =>
            typeof module[
              methodName
            ] === "function"
        );

    const missingMethods =
      definition
        .requiredMethods
        .filter(
          (methodName) =>
            typeof module[
              methodName
            ] !== "function"
        );

    missingMethods.forEach(
      (methodName) => {
        issues.push(
          createIssue({
            severity: "error",
            code:
              "module-method-missing",
            source:
              definition.id,
            message:
              `${definition.name} is missing ${methodName}().`,
            recommendation:
              `Review the public return object in ${definition.globalName}.`
          })
        );
      }
    );

    return {
      ...definition,
      loaded: true,

      status:
        missingMethods.length > 0
          ? "error"
          : "healthy",

      availableMethods,
      missingMethods,
      issues
    };
  }

  /**
   * Inspect food and recipe databases.
   *
   * @returns {object}
   */

  function inspectDatabases() {
    const issues = [];

    const foods =
      Array.isArray(
        window.ELEVEN_FOODS
      )
        ? window.ELEVEN_FOODS
        : [];

    const recipes =
      Array.isArray(
        window.ELEVEN_RECIPES
      )
        ? window.ELEVEN_RECIPES
        : [];

    if (
      !Array.isArray(
        window.ELEVEN_FOODS
      )
    ) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "food-database-missing",
          source:
            "databases",
          message:
            "The food database is unavailable.",
          recommendation:
            "Confirm foods.js loads before modules that use food records."
        })
      );
    }

    if (
      !Array.isArray(
        window.ELEVEN_RECIPES
      )
    ) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "recipe-database-missing",
          source:
            "databases",
          message:
            "The recipe database is unavailable.",
          recommendation:
            "Confirm recipes.js loads before the planner."
        })
      );
    }

    const duplicateFoodIds =
      findDuplicateIds(
        foods
      );

    const duplicateRecipeIds =
      findDuplicateIds(
        recipes
      );

    if (
      duplicateFoodIds.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "duplicate-food-ids",
          source:
            "databases",
          message:
            `${duplicateFoodIds.length} duplicate food ID${
              duplicateFoodIds.length === 1
                ? " was"
                : "s were"
            } found.`,
          details:
            duplicateFoodIds,
          recommendation:
            "Every food must have a unique ID."
        })
      );
    }

    if (
      duplicateRecipeIds.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "duplicate-recipe-ids",
          source:
            "databases",
          message:
            `${duplicateRecipeIds.length} duplicate recipe ID${
              duplicateRecipeIds.length === 1
                ? " was"
                : "s were"
            } found.`,
          details:
            duplicateRecipeIds,
          recommendation:
            "Every recipe must have a unique ID."
        })
      );
    }

    const invalidFoods =
      foods.filter(
        (food) =>
          !food ||
          !food.id ||
          !food.name ||
          !food.category
      );

    const invalidRecipes =
      recipes.filter(
        (recipe) =>
          !recipe ||
          !recipe.id ||
          !recipe.name ||
          !recipe.mealType ||
          !Array.isArray(
            recipe.ingredients
          )
      );

    if (
      invalidFoods.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "invalid-food-records",
          source:
            "databases",
          message:
            `${invalidFoods.length} food record${
              invalidFoods.length === 1
                ? " appears"
                : "s appear"
            } incomplete.`,
          recommendation:
            "Food records should include id, name, and category."
        })
      );
    }

    if (
      invalidRecipes.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "invalid-recipe-records",
          source:
            "databases",
          message:
            `${invalidRecipes.length} recipe record${
              invalidRecipes.length === 1
                ? " appears"
                : "s appear"
            } incomplete.`,
          recommendation:
            "Recipe records should include id, name, mealType, and ingredients."
        })
      );
    }

    const customFoods =
      foods.filter(
        (food) =>
          food.isCustom
      );

    return {
      id: "databases",
      name:
        "Food and recipe databases",

      status:
        issues.some(
          (issue) =>
            issue.severity ===
            "error"
        )
          ? "error"
          : issues.length > 0
            ? "warning"
            : "healthy",

      metrics: {
        foodCount:
          foods.length,
        customFoodCount:
          customFoods.length,
        recipeCount:
          recipes.length,
        duplicateFoodCount:
          duplicateFoodIds.length,
        duplicateRecipeCount:
          duplicateRecipeIds.length,
        invalidFoodCount:
          invalidFoods.length,
        invalidRecipeCount:
          invalidRecipes.length
      },

      issues
    };
  }

  /**
   * Inspect data currently stored by Eleven.
   *
   * @returns {object}
   */

  function inspectStoredData() {
    const issues = [];

    const profile =
      safeReadStorage(
        "profile",
        () =>
          window.ELEVEN_STORAGE
            ?.getProfile?.()
      );

    const preferences =
      safeReadStorage(
        "preferences",
        () =>
          window.ELEVEN_STORAGE
            ?.getPreferences?.()
      );

    const mealPlan =
      safeReadStorage(
        "mealPlan",
        () =>
          window.ELEVEN_STORAGE
            ?.getMealPlan?.()
      );

    const groceryList =
      safeReadStorage(
        "groceryList",
        () =>
          window.ELEVEN_STORAGE
            ?.getGroceryList?.() ??
          readLocalStorageJson(
            "eleven.groceryList"
          )
      );

    [
      profile,
      preferences,
      mealPlan,
      groceryList
    ].forEach(
      (result) => {
        if (result.error) {
          issues.push(
            createIssue({
              severity: "error",
              code:
                "storage-read-failed",
              source:
                "storage",
              message:
                `${result.name} could not be read from storage.`,
              details:
                result.error,
              recommendation:
                "Inspect the stored JSON and storage access methods."
            })
          );
        }
      }
    );

    const localStorageSize =
      estimateLocalStorageSize();

    if (
      localStorageSize >
      4_000_000
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "storage-size-high",
          source:
            "storage",
          message:
            "Eleven is approaching typical browser storage limits.",
          details: {
            approximateBytes:
              localStorageSize
          },
          recommendation:
            "Consider archiving or removing unused saved plans."
        })
      );
    }

    return {
      id: "storage",
      name:
        "Browser storage",

      status:
        issues.some(
          (issue) =>
            issue.severity ===
            "error"
        )
          ? "error"
          : issues.length > 0
            ? "warning"
            : "healthy",

      metrics: {
        approximateBytes:
          localStorageSize,

        approximateKilobytes:
          roundNumber(
            localStorageSize /
            1024,
            1
          ),

        profileSaved:
          Boolean(
            profile.value &&
            Object.keys(
              profile.value
            ).length > 0
          ),

        preferencesSaved:
          Boolean(
            preferences.value
          ),

        mealPlanSaved:
          Boolean(
            mealPlan.value
          ),

        groceryListSaved:
          Boolean(
            groceryList.value
          )
      },

      data: {
        profile:
          profile.value ||
          {},

        preferences:
          preferences.value ||
          {
            selectedFoodIds: []
          },

        mealPlan:
          mealPlan.value ||
          null,

        groceryList:
          groceryList.value ||
          null
      },

      issues
    };
  }

  /**
   * Inspect saved profile.
   *
   * @param {object} profile
   * @returns {object}
   */

  function inspectProfile(
    profile
  ) {
    const issues = [];

    const requiredFields = [
      "age",
      "sex",
      "heightFeet",
      "currentWeight",
      "goalWeight",
      "activityLevel"
    ];

    const missingFields =
      requiredFields.filter(
        (fieldName) =>
          profile?.[
            fieldName
          ] === undefined ||
          profile?.[
            fieldName
          ] === null ||
          profile?.[
            fieldName
          ] === ""
      );

    if (
      missingFields.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "profile-incomplete",
          source:
            "profile",
          message:
            `The saved profile is missing ${missingFields.length} required field${
              missingFields.length === 1
                ? ""
                : "s"
            }.`,
          details:
            missingFields,
          recommendation:
            "Open Profile and save all required body and goal information."
        })
      );
    }

    const calorieTarget =
      toFiniteNumber(
        profile?.targets
          ?.calorieTarget ||
        profile?.calorieTarget
      );

    const proteinTarget =
      toFiniteNumber(
        profile?.targets
          ?.proteinTarget ||
        profile?.proteinTarget
      );

    if (
      missingFields.length === 0 &&
      calorieTarget <= 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "calorie-target-missing",
          source:
            "profile",
          message:
            "The profile is complete but has no valid calorie target.",
          recommendation:
            "Re-save the profile to recalculate nutrition targets."
        })
      );
    }

    if (
      missingFields.length === 0 &&
      proteinTarget <= 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "protein-target-missing",
          source:
            "profile",
          message:
            "The profile is complete but has no valid protein target.",
          recommendation:
            "Re-save the profile to recalculate nutrition targets."
        })
      );
    }

    return {
      id: "profile",
      name:
        "Profile data",

      status:
        issues.some(
          (issue) =>
            issue.severity ===
            "error"
        )
          ? "error"
          : issues.length > 0
            ? "warning"
            : "healthy",

      metrics: {
        missingFieldCount:
          missingFields.length,
        calorieTarget,
        proteinTarget,
        currentWeight:
          toFiniteNumber(
            profile?.currentWeight
          ),
        goalWeight:
          toFiniteNumber(
            profile?.goalWeight
          )
      },

      issues
    };
  }

  /**
   * Inspect saved preferences.
   *
   * @param {object} preferences
   * @returns {object}
   */

  function inspectPreferences(
    preferences
  ) {
    const issues = [];

    const selectedFoodIds =
      Array.isArray(
        preferences
          ?.selectedFoodIds
      )
        ? preferences
            .selectedFoodIds
        : [];

    if (
      selectedFoodIds.length === 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "preferences-empty",
          source:
            "preferences",
          message:
            "No preferred foods are currently saved.",
          recommendation:
            "Select and save foods before generating a plan."
        })
      );
    }

    const missingFoodIds =
      selectedFoodIds.filter(
        (foodId) =>
          typeof window
            .getElevenFoodById ===
            "function" &&
          !window
            .getElevenFoodById(
              foodId
            )
      );

    if (
      missingFoodIds.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "preferences-reference-missing-foods",
          source:
            "preferences",
          message:
            `${missingFoodIds.length} saved preference${
              missingFoodIds.length === 1
                ? " references"
                : "s reference"
            } food records that no longer exist.`,
          details:
            missingFoodIds,
          recommendation:
            "Re-save Food Preferences to remove stale food IDs."
        })
      );
    }

    return {
      id: "preferences",
      name:
        "Food preferences",

      status:
        issues.some(
          (issue) =>
            issue.severity ===
            "error"
        )
          ? "error"
          : issues.length > 0
            ? "warning"
            : "healthy",

      metrics: {
        selectedFoodCount:
          selectedFoodIds.length,
        excludedFoodCount:
          Array.isArray(
            preferences
              ?.excludedFoods
          )
            ? preferences
                .excludedFoods
                .length
            : 0,
        missingFoodReferenceCount:
          missingFoodIds.length
      },

      issues
    };
  }

  /**
   * Inspect saved meal plan.
   *
   * @param {object|null} mealPlan
   * @returns {object}
   */

  function inspectMealPlan(
    mealPlan
  ) {
    const issues = [];

    if (!mealPlan) {
      issues.push(
        createIssue({
          severity:
            "information",
          code:
            "meal-plan-not-generated",
          source:
            "meal-plan",
          message:
            "No meal plan is currently saved.",
          recommendation:
            "Generate a plan when ready to test the full workflow."
        })
      );

      return {
        id:
          "meal-plan",
        name:
          "Meal plan",
        status:
          "information",
        metrics: {
          dayCount: 0,
          mealCount: 0,
          ingredientCount: 0,
          score: 0
        },
        issues
      };
    }

    const days =
      Array.isArray(
        mealPlan.days
      )
        ? mealPlan.days
        : [];

    const meals =
      days.flatMap(
        (day) =>
          Array.isArray(
            day.meals
          )
            ? day.meals
            : []
      );

    const ingredients =
      meals.flatMap(
        (meal) =>
          Array.isArray(
            meal.ingredients
          )
            ? meal.ingredients
            : []
      );

    if (
      days.length !==
      toFiniteNumber(
        mealPlan
          .cycleLengthDays ||
        11
      )
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "meal-plan-day-count-mismatch",
          source:
            "meal-plan",
          message:
            `The saved plan contains ${days.length} days, but its configured cycle length is ${mealPlan.cycleLengthDays || 11}.`,
          recommendation:
            "Regenerate the plan or inspect cycle-length settings."
        })
      );
    }

    const missingRecipeMeals =
      meals.filter(
        (meal) =>
          !meal.recipeId
      );

    if (
      missingRecipeMeals.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "meal-plan-missing-recipes",
          source:
            "meal-plan",
          message:
            `${missingRecipeMeals.length} meal${
              missingRecipeMeals.length === 1
                ? " has"
                : "s have"
            } no recipe ID.`,
          recommendation:
            "Regenerate the plan and inspect planner eligibility."
        })
      );
    }

    const missingIngredients =
      meals.filter(
        (meal) =>
          !Array.isArray(
            meal.ingredients
          ) ||
          meal.ingredients
            .length === 0
      );

    if (
      missingIngredients.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "meal-plan-missing-ingredients",
          source:
            "meal-plan",
          message:
            `${missingIngredients.length} meal${
              missingIngredients.length === 1
                ? " is"
                : "s are"
            } missing ingredient-level data.`,
          recommendation:
            "Inspect mealGenerator.js materialization."
        })
      );
    }

    const invalidFoodReferences =
      ingredients.filter(
        (ingredient) =>
          ingredient.foodId &&
          typeof window
            .getElevenFoodById ===
            "function" &&
          !window
            .getElevenFoodById(
              ingredient.foodId
            )
      );

    if (
      invalidFoodReferences.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "meal-plan-invalid-food-references",
          source:
            "meal-plan",
          message:
            `${invalidFoodReferences.length} meal ingredient${
              invalidFoodReferences.length === 1
                ? " references"
                : "s reference"
            } missing foods.`,
          recommendation:
            "Regenerate the plan after repairing the food database."
        })
      );
    }

    const score =
      toFiniteNumber(
        mealPlan.score
      );

    if (
      score <= 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "meal-plan-score-missing",
          source:
            "meal-plan",
          message:
            "The saved plan does not have a valid final quality score.",
          recommendation:
            "Run final plan evaluation before saving."
        })
      );
    }

    return {
      id: "meal-plan",
      name:
        "Meal plan",

      status:
        issues.some(
          (issue) =>
            issue.severity ===
            "error"
        )
          ? "error"
          : issues.some(
                (issue) =>
                  issue.severity ===
                  "warning"
              )
            ? "warning"
            : "healthy",

      metrics: {
        dayCount:
          days.length,
        mealCount:
          meals.length,
        ingredientCount:
          ingredients.length,
        score,
        rating:
          mealPlan.rating ||
          null,
        completedDayCount:
          Array.isArray(
            mealPlan
              .completedDays
          )
            ? mealPlan
                .completedDays
                .length
            : 0
      },

      issues
    };
  }

  /**
   * Inspect saved grocery list.
   *
   * @param {object|null} groceryList
   * @param {object|null} mealPlan
   * @returns {object}
   */

  function inspectGroceryList(
    groceryList,
    mealPlan
  ) {
    const issues = [];

    if (!groceryList) {
      issues.push(
        createIssue({
          severity:
            "information",
          code:
            "grocery-list-not-generated",
          source:
            "grocery",
          message:
            "No grocery list is currently saved.",
          recommendation:
            mealPlan
              ? "Build the shopping list from the current meal plan."
              : "Generate a meal plan before creating a shopping list."
        })
      );

      return {
        id: "grocery",
        name:
          "Grocery list",
        status:
          "information",
        metrics: {
          itemCount: 0,
          departmentCount: 0,
          score: 0
        },
        issues
      };
    }

    const items =
      Array.isArray(
        groceryList.items
      )
        ? groceryList.items
        : [];

    if (
      groceryList.sourcePlanId &&
      mealPlan?.id &&
      groceryList
        .sourcePlanId !==
      mealPlan.id
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "grocery-list-stale",
          source:
            "grocery",
          message:
            "The saved grocery list was generated from a different meal plan.",
          recommendation:
            "Rebuild the grocery list from the current plan."
        })
      );
    }

    const invalidItems =
      items.filter(
        (item) =>
          !item.foodId ||
          !item.name ||
          !item.department
      );

    if (
      invalidItems.length > 0
    ) {
      issues.push(
        createIssue({
          severity: "warning",
          code:
            "grocery-items-invalid",
          source:
            "grocery",
          message:
            `${invalidItems.length} grocery item${
              invalidItems.length === 1
                ? " appears"
                : "s appear"
            } incomplete.`,
          recommendation:
            "Rebuild the grocery list and inspect ingredient consolidation."
        })
      );
    }

    return {
      id: "grocery",
      name:
        "Grocery list",

      status:
        issues.some(
          (issue) =>
            issue.severity ===
            "error"
        )
          ? "error"
          : issues.some(
                (issue) =>
                  issue.severity ===
                  "warning"
              )
            ? "warning"
            : "healthy",

      metrics: {
        itemCount:
          items.length,
        departmentCount:
          Array.isArray(
            groceryList
              .departments
          )
            ? groceryList
                .departments
                .length
            : 0,
        score:
          toFiniteNumber(
            groceryList
              .metrics
              ?.shoppingEfficiencyScore
          ),
        estimatedWastePercentage:
          toFiniteNumber(
            groceryList
              .metrics
              ?.estimatedWastePercentage
          )
      },

      issues
    };
  }

  /**
   * Inspect calendar progress.
   *
   * @param {object|null} mealPlan
   * @returns {object}
   */

  function inspectProgress(
    mealPlan
  ) {
    const issues = [];

    if (!mealPlan) {
      return {
        id: "progress",
        name:
          "Cycle progress",
        status:
          "information",
        metrics: {
          completedDays: 0,
          remainingDays: 0,
          currentDay: 1,
          percentage: 0
        },
        issues: [
          createIssue({
            severity:
              "information",
            code:
              "progress-unavailable",
            source:
              "progress",
            message:
              "Cycle progress is unavailable until a plan is generated."
          })
        ]
      };
    }

    let progress = null;

    try {
      progress =
        window
          .ELEVEN_CALENDAR_PROGRESS
          ?.calculateProgress?.(
            mealPlan
          ) ||
        null;
    } catch (error) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "progress-calculation-failed",
          source:
            "progress",
          message:
            "The cycle progress engine threw an error.",
          details:
            normalizeError(error),
          recommendation:
            "Inspect calendar/progress.js and the saved completedDays data."
        })
      );
    }

    if (!progress) {
      issues.push(
        createIssue({
          severity: "error",
          code:
            "progress-result-missing",
          source:
            "progress",
          message:
            "The cycle progress engine did not return a result.",
          recommendation:
            "Confirm ELEVEN_CALENDAR_PROGRESS is loaded and functional."
        })
      );

      progress = {
        completedDays: 0,
        remainingDays:
          Array.isArray(
            mealPlan.days
          )
            ? mealPlan.days
                .length
            : 0,
        currentDay: 1,
        percentage: 0
      };
    }

    return {
      id: "progress",
      name:
        "Cycle progress",

      status:
        issues.some(
          (issue) =>
            issue.severity ===
            "error"
        )
          ? "error"
          : issues.length > 0
            ? "warning"
            : "healthy",

      metrics: {
        completedDays:
          toFiniteNumber(
            progress
              .completedDays
          ),
        remainingDays:
          toFiniteNumber(
            progress
              .remainingDays
          ),
        currentDay:
          toFiniteNumber(
            progress.currentDay
          ),
        percentage:
          toFiniteNumber(
            progress.percentage
          ),
        isComplete:
          Boolean(
            progress.isComplete
          )
      },

      issues
    };
  }

  /**
   * Collect issues from all reports.
   *
   * @param {object[]} reports
   * @returns {object}
   */

  function collectIssues(
    reports
  ) {
    const allIssues =
      reports.flatMap(
        (report) =>
          Array.isArray(
            report.issues
          )
            ? report.issues
            : []
      );

    return {
      all:
        allIssues,

      errors:
        allIssues.filter(
          (issue) =>
            issue.severity ===
            "error"
        ),

      warnings:
        allIssues.filter(
          (issue) =>
            issue.severity ===
            "warning"
        ),

      information:
        allIssues.filter(
          (issue) =>
            issue.severity ===
            "information"
        )
    };
  }

  /**
   * Calculate the overall system-health score.
   *
   * @param {object} context
   * @returns {number}
   */

  function calculateHealthScore(
    context
  ) {
    const {
      moduleReport,
      databaseReport,
      storageReport,
      profileReport,
      preferencesReport,
      mealPlanReport,
      groceryReport,
      progressReport,
      issueSummary
    } = context;

    const reportScores = [
      scoreReport(
        moduleReport
      ),
      scoreReport(
        databaseReport
      ),
      scoreReport(
        storageReport
      ),
      scoreReport(
        profileReport
      ),
      scoreReport(
        preferencesReport
      ),
      scoreReport(
        mealPlanReport
      ),
      scoreReport(
        groceryReport
      ),
      scoreReport(
        progressReport
      )
    ];

    const baseScore =
      average(
        reportScores
      );

    const issuePenalty =
      issueSummary.errors.length *
        7 +
      issueSummary.warnings.length *
        2;

    return roundNumber(
      clamp(
        baseScore -
          issuePenalty,
        0,
        100
      ),
      1
    );
  }

  /**
   * Convert a report status into a score.
   *
   * @param {object} report
   * @returns {number}
   */

  function scoreReport(
    report
  ) {
    const statusScores = {
      healthy: 100,
      information: 92,
      warning: 75,
      error: 35
    };

    return (
      statusScores[
        report.status
      ] ?? 50
    );
  }

  /**
   * Return overall health label.
   *
   * @param {number} score
   * @returns {string}
   */

  function getHealthStatus(
    score
  ) {
    if (score >= 95) {
      return "Exceptional";
    }

    if (score >= 90) {
      return "Healthy";
    }

    if (score >= 80) {
      return "Good";
    }

    if (score >= 70) {
      return "Needs review";
    }

    if (score >= 50) {
      return "Degraded";
    }

    return "Critical";
  }

  /**
   * Create a normalized issue.
   *
   * @param {object} issue
   * @returns {object}
   */

  function createIssue(
    issue
  ) {
    return {
      id:
        createIssueId(),

      severity:
        issue.severity ||
        "information",

      code:
        issue.code ||
        "unknown",

      source:
        issue.source ||
        "system",

      message:
        issue.message ||
        "",

      details:
        issue.details ??
        null,

      recommendation:
        issue.recommendation ||
        null,

      createdAt:
        new Date()
          .toISOString()
    };
  }

  /**
   * Safely execute a storage getter.
   *
   * @param {string} name
   * @param {Function} getter
   * @returns {object}
   */

  function safeReadStorage(
    name,
    getter
  ) {
    try {
      return {
        name,
        value:
          typeof getter ===
          "function"
            ? getter()
            : null,
        error: null
      };
    } catch (error) {
      return {
        name,
        value: null,
        error:
          normalizeError(
            error
          )
      };
    }
  }

  /**
   * Read JSON from localStorage.
   *
   * @param {string} key
   * @returns {*}
   */

  function readLocalStorageJson(
    key
  ) {
    const stored =
      localStorage.getItem(
        key
      );

    return stored
      ? JSON.parse(stored)
      : null;
  }

  /**
   * Approximate localStorage usage.
   *
   * @returns {number}
   */

  function estimateLocalStorageSize() {
    let total = 0;

    for (
      let index = 0;
      index <
      localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(
          index
        );

      const value =
        localStorage.getItem(
          key
        );

      total +=
        String(key || "")
          .length * 2;

      total +=
        String(value || "")
          .length * 2;
    }

    return total;
  }

  /**
   * Find duplicate record IDs.
   *
   * @param {object[]} records
   * @returns {string[]}
   */

  function findDuplicateIds(
    records
  ) {
    const counts =
      records.reduce(
        (result, record) => {
          const id =
            record?.id;

          if (!id) {
            return result;
          }

          result[id] =
            (
              result[id] ||
              0
            ) + 1;

          return result;
        },
        {}
      );

    return Object.entries(
      counts
    )
      .filter(
        ([, count]) =>
          count > 1
      )
      .map(
        ([id]) => id
      );
  }

  /**
   * Normalize an error for reporting.
   *
   * @param {*} error
   * @returns {object}
   */

  function normalizeError(
    error
  ) {
    return {
      name:
        error?.name ||
        "Error",
      message:
        error?.message ||
        String(error),
      stack:
        error?.stack ||
        null
    };
  }

  /**
   * Utility functions.
   */

  function createIssueId() {
    return [
      "diagnostic",
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 8)
    ].join("-");
  }

  function average(values) {
    const validValues =
      values.filter(
        Number.isFinite
      );

    if (
      validValues.length ===
      0
    ) {
      return 0;
    }

    return (
      validValues.reduce(
        (total, value) =>
          total + value,
        0
      ) /
      validValues.length
    );
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
      10 **
      decimalPlaces;

    return (
      Math.round(
        (
          toFiniteNumber(
            value
          ) +
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
        toFiniteNumber(
          value
        ),
        minimum
      ),
      maximum
    );
  }

  return {
    version: VERSION,

    moduleDefinitions:
      MODULE_DEFINITIONS.map(
        (definition) => ({
          ...definition,
          requiredMethods: [
            ...definition
              .requiredMethods
          ]
        })
      ),

    runDiagnostics,
    inspectModules,
    inspectDatabases,
    inspectStoredData,
    inspectProfile,
    inspectPreferences,
    inspectMealPlan,
    inspectGroceryList,
    inspectProgress,
    getHealthStatus
  };
})();
