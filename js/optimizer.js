"use strict";

/**
 * Eleven plan optimizer
 *
 * The optimizer repeatedly asks the planner to create a cycle strategy,
 * evaluates each candidate, and keeps the strongest result.
 *
 * Responsibilities:
 *
 * - Support fast, balanced, and thorough optimization modes
 * - Generate multiple candidate strategies
 * - Score candidate strategies before final meal construction
 * - Retain the highest-scoring candidate
 * - Stop early when a target score is reached
 * - Report optimization progress
 * - Explain why the winning candidate was selected
 *
 * The optimizer currently evaluates planning strategies using projected
 * recipe and rotation quality. The future meal generator will perform a
 * second, ingredient-level validation after portions are calculated.
 */

window.ELEVEN_OPTIMIZER = (() => {
  const OPTIMIZATION_MODES = {
    fast: {
      id: "fast",
      name: "Fast",
      description:
        "Creates a good plan quickly with limited optimization.",
      maximumAttempts: 10,
      targetScore: 84,
      randomVariation: 7
    },

    balanced: {
      id: "balanced",
      name: "Balanced",
      description:
        "Balances planning speed with stronger variety and nutrition.",
      maximumAttempts: 40,
      targetScore: 90,
      randomVariation: 5
    },

    thorough: {
      id: "thorough",
      name: "Thorough",
      description:
        "Searches more combinations to find the strongest available plan.",
      maximumAttempts: 100,
      targetScore: 94,
      randomVariation: 4
    }
  };

  const DEFAULT_OPTIONS = {
    mode: "balanced",
    maximumAttempts: null,
    targetScore: null,
    minimumImprovementToReport: 0.5,
    stopWhenTargetReached: true,
    preserveCandidates: false,
    candidateHistoryLimit: 20,
    onProgress: null
  };

  /**
   * Optimize an Eleven planning strategy.
   *
   * @param {object} profile
   * @param {object|string[]} preferences
   * @param {object} suppliedConstraints
   * @param {object} suppliedOptions
   * @returns {Promise<object>}
   */

  async function optimizeCycle(
    profile,
    preferences,
    suppliedConstraints = {},
    suppliedOptions = {}
  ) {
    const options =
      normalizeOptions(suppliedOptions);

    const mode =
      OPTIMIZATION_MODES[options.mode];

    const maximumAttempts =
      options.maximumAttempts ??
      mode.maximumAttempts;

    const targetScore =
      options.targetScore ??
      mode.targetScore;

    const startedAt =
      new Date().toISOString();

    const startedTime =
      performance.now();

    const candidateHistory = [];

    let bestCandidate = null;
    let completedAttempts = 0;
    let failedAttempts = 0;
    let stopReason =
      "maximum-attempts";

    for (
      let attemptNumber = 1;
      attemptNumber <= maximumAttempts;
      attemptNumber += 1
    ) {
      await yieldToBrowser();

      const attempt =
        createOptimizationAttempt({
          attemptNumber,
          profile,
          preferences,
          suppliedConstraints,
          options,
          mode
        });

      completedAttempts += 1;

      if (!attempt.success) {
        failedAttempts += 1;

        reportProgress(options, {
          status: "attempt-failed",
          attemptNumber,
          maximumAttempts,
          targetScore,
          bestScore:
            bestCandidate?.score ?? 0,
          attemptScore: 0,
          message:
            attempt.errors[0] ||
            "The planning attempt could not be completed."
        });

        if (
          !bestCandidate &&
          attemptNumber ===
          maximumAttempts
        ) {
          return createFailureResult({
            errors: attempt.errors,
            warnings: attempt.warnings,
            completedAttempts,
            failedAttempts,
            startedAt,
            startedTime,
            mode,
            maximumAttempts,
            targetScore
          });
        }

        continue;
      }

      const candidate =
        attempt.candidate;

      const previousBestScore =
        bestCandidate?.score ?? 0;

      const isNewBest =
        !bestCandidate ||
        candidate.score >
          bestCandidate.score;

      if (isNewBest) {
        bestCandidate = candidate;
      }

      addCandidateToHistory(
        candidateHistory,
        candidate,
        options
      );

      reportProgress(options, {
        status:
          isNewBest
            ? "new-best"
            : "attempt-complete",

        attemptNumber,
        maximumAttempts,
        targetScore,
        attemptScore:
          candidate.score,
        bestScore:
          bestCandidate.score,

        improvement:
          roundNumber(
            bestCandidate.score -
            previousBestScore,
            1
          ),

        message:
          isNewBest
            ? `New best plan: ${candidate.score} out of 100.`
            : `Attempt ${attemptNumber} scored ${candidate.score}.`
      });

      if (
        shouldStopEarly({
          bestCandidate,
          targetScore,
          attemptNumber,
          maximumAttempts,
          options
        })
      ) {
        stopReason =
          "target-score-reached";

        break;
      }
    }

    if (!bestCandidate) {
      return createFailureResult({
        errors: [
          "Eleven could not create a valid planning candidate."
        ],
        warnings: [],
        completedAttempts,
        failedAttempts,
        startedAt,
        startedTime,
        mode,
        maximumAttempts,
        targetScore
      });
    }

    const completedAt =
      new Date().toISOString();

    const durationMilliseconds =
      Math.round(
        performance.now() -
        startedTime
      );

    const comparison =
      compareCandidateHistory(
        candidateHistory,
        bestCandidate
      );

    const optimizationLog =
      buildOptimizationLog({
        bestCandidate,
        candidateHistory,
        completedAttempts,
        failedAttempts,
        targetScore,
        stopReason,
        mode,
        durationMilliseconds,
        comparison
      });

    reportProgress(options, {
      status: "complete",
      attemptNumber:
        completedAttempts,
      maximumAttempts,
      targetScore,
      attemptScore:
        bestCandidate.score,
      bestScore:
        bestCandidate.score,
      message:
        `Optimization complete. Best score: ${bestCandidate.score}.`
    });

    return {
      success: true,
      errors: [],
      warnings:
        bestCandidate.warnings || [],

      optimization: {
        id: createOptimizationId(),
        mode: mode.id,
        modeName: mode.name,
        startedAt,
        completedAt,
        durationMilliseconds,
        completedAttempts,
        failedAttempts,
        maximumAttempts,
        targetScore,
        achievedTarget:
          bestCandidate.score >=
          targetScore,
        stopReason
      },

      bestCandidate,
      comparison,
      optimizationLog,

      candidates:
        options.preserveCandidates
          ? candidateHistory
          : candidateHistory.map(
              createCandidateSummary
            )
    };
  }

  /**
   * Create one planning candidate.
   *
   * @param {object} context
   * @returns {object}
   */

  function createOptimizationAttempt(
    context
  ) {
    const {
      attemptNumber,
      profile,
      preferences,
      suppliedConstraints,
      options,
      mode
    } = context;

    try {
      const planningResult =
        window.ELEVEN_PLANNER
          .createCycleStrategy(
            profile,
            preferences,
            suppliedConstraints,
            {
              randomVariation:
                options.randomVariation ??
                mode.randomVariation,

              cycleLengthDays:
                suppliedConstraints
                  .cycleLengthDays ??
                11,

              prioritizeMealPrep:
                options
                  .prioritizeMealPrep ??
                true,

              prioritizeVariety:
                options
                  .prioritizeVariety ??
                true,

              useCalorieShifting:
                options
                  .useCalorieShifting ??
                true
            }
          );

      if (
        !planningResult.success ||
        !planningResult.strategy
      ) {
        return {
          success: false,
          errors:
            planningResult.errors || [
              "The planner did not return a strategy."
            ],
          warnings:
            planningResult.warnings || []
        };
      }

      const strategy =
        planningResult.strategy;

      const evaluation =
        evaluateStrategy(
          strategy,
          profile,
          suppliedConstraints
        );

      const candidate = {
        id: createCandidateId(
          attemptNumber
        ),

        attemptNumber,

        createdAt:
          new Date().toISOString(),

        score:
          evaluation.score,

        rating:
          getScoreRating(
            evaluation.score
          ),

        strategy,

        evaluation,

        warnings:
          planningResult.warnings || [],

        fingerprint:
          createStrategyFingerprint(
            strategy
          )
      };

      return {
        success: true,
        errors: [],
        warnings:
          planningResult.warnings || [],
        candidate
      };
    } catch (error) {
      console.error(
        `Eleven optimization attempt ${attemptNumber} failed.`,
        error
      );

      return {
        success: false,
        errors: [
          error instanceof Error
            ? error.message
            : "An unexpected optimization error occurred."
        ],
        warnings: []
      };
    }
  }

  /**
   * Evaluate a planning strategy before ingredient-level generation.
   *
   * @param {object} strategy
   * @param {object} profile
   * @param {object} suppliedConstraints
   * @returns {object}
   */

  function evaluateStrategy(
    strategy,
    profile,
    suppliedConstraints
  ) {
    const constraints =
      window.ELEVEN_CONSTRAINTS
        .createConstraints(
          suppliedConstraints
        );

    const componentScores = {
      recipeQuality:
        scoreRecipeCandidates(
          strategy
        ),

      recipeVariety:
        scoreRecipeVariety(
          strategy,
          constraints
        ),

      foodVariety:
        scoreFoodVariety(
          strategy,
          constraints
        ),

      proteinRotation:
        scoreProteinRotation(
          strategy
        ),

      specialFrequency:
        scoreSpecialFrequencies(
          strategy,
          constraints
        ),

      mealPrep:
        scoreMealPrep(
          strategy
        ),

      dailyCoverage:
        scoreDailyCoverage(
          strategy
        ),

      nutritionProjection:
        scoreNutritionProjection(
          strategy
        )
    };

    const weights = {
      recipeQuality: 0.18,
      recipeVariety: 0.16,
      foodVariety: 0.15,
      proteinRotation: 0.15,
      specialFrequency: 0.12,
      mealPrep: 0.08,
      dailyCoverage: 0.08,
      nutritionProjection: 0.08
    };

    const score =
      calculateWeightedScore(
        componentScores,
        weights
      );

    const issues =
      identifyStrategyIssues({
        strategy,
        constraints,
        componentScores
      });

    const adjustedScore =
      clamp(
        score -
        issues.penalty,
        0,
        100
      );

    return {
      score:
        roundNumber(
          adjustedScore,
          1
        ),

      rating:
        getScoreRating(
          adjustedScore
        ),

      componentScores:
        mapRoundedValues(
          componentScores
        ),

      issues:
        issues.items,

      penalty:
        issues.penalty,

      summary:
        createEvaluationSummary(
          componentScores,
          issues.items
        ),

      profileSnapshot: {
        calorieTarget:
          profile.targets
            ?.calorieTarget ??
          null,

        proteinTarget:
          profile.targets
            ?.proteinTarget ??
          null
      }
    };
  }

  /**
   * Score selected recipe-candidate quality.
   *
   * @param {object} strategy
   * @returns {number}
   */

  function scoreRecipeCandidates(
    strategy
  ) {
    const meals =
      getStrategyMeals(strategy);

    if (meals.length === 0) {
      return 0;
    }

    return average(
      meals.map(
        (meal) =>
          toFiniteNumber(
            meal.candidateScore
          )
      )
    );
  }

  /**
   * Score recipe variety.
   *
   * @param {object} strategy
   * @param {object} constraints
   * @returns {number}
   */

  function scoreRecipeVariety(
    strategy,
    constraints
  ) {
    const meals =
      getStrategyMeals(strategy);

    if (meals.length === 0) {
      return 0;
    }

    const recipeIds =
      meals
        .map(
          (meal) =>
            meal.recipeId
        )
        .filter(Boolean);

    const uniqueRecipeCount =
      new Set(recipeIds).size;

    const minimumUnique =
      constraints.repetition
        .minimumUniqueRecipesPerCycle;

    const uniqueScore =
      minimumTargetScore(
        uniqueRecipeCount,
        minimumUnique
      );

    const recipeCounts =
      countValues(recipeIds);

    const repetitionPenalty =
      Object.values(
        recipeCounts
      ).reduce(
        (penalty, count) => {
          const excess =
            Math.max(
              0,
              count -
                constraints
                  .repetition
                  .maximumSameRecipePerCycle
            );

          return (
            penalty +
            excess * 6
          );
        },
        0
      );

    return clamp(
      uniqueScore -
        repetitionPenalty,
      0,
      100
    );
  }

  /**
   * Score food variety.
   *
   * @param {object} strategy
   * @param {object} constraints
   * @returns {number}
   */

  function scoreFoodVariety(
    strategy,
    constraints
  ) {
    const meals =
      getStrategyMeals(strategy);

    const vegetableIds =
      new Set(
        meals.flatMap(
          (meal) =>
            meal.vegetableIds || []
        )
      );

    const fruitIds =
      new Set(
        meals.flatMap(
          (meal) =>
            meal.fruitIds || []
        )
      );

    const carbohydrateIds =
      new Set(
        meals.flatMap(
          (meal) =>
            meal.carbohydrateIds ||
            []
        )
      );

    const vegetableScore =
      minimumTargetScore(
        vegetableIds.size,
        constraints.repetition
          .minimumUniqueVegetablesPerCycle
      );

    const fruitScore =
      minimumTargetScore(
        fruitIds.size,
        constraints.repetition
          .minimumUniqueFruitsPerCycle
      );

    const carbohydrateScore =
      minimumTargetScore(
        carbohydrateIds.size,
        3
      );

    return (
      vegetableScore * 0.5 +
      fruitScore * 0.3 +
      carbohydrateScore * 0.2
    );
  }

  /**
   * Score primary-protein rotation.
   *
   * @param {object} strategy
   * @returns {number}
   */

  function scoreProteinRotation(
    strategy
  ) {
    const days =
      Array.isArray(
        strategy?.days
      )
        ? strategy.days
        : [];

    if (days.length === 0) {
      return 0;
    }

    let repeatedDayCount = 0;
    let priorProteinIds = [];

    const uniqueProteinIds =
      new Set();

    days.forEach((day) => {
      const proteinIds =
        new Set(
          day.meals.flatMap(
            (meal) =>
              meal
                .primaryProteinIds ||
              []
          )
        );

      proteinIds.forEach(
        (foodId) =>
          uniqueProteinIds.add(
            foodId
          )
      );

      const repeated =
        Array.from(
          proteinIds
        ).some((foodId) =>
          priorProteinIds.includes(
            foodId
          )
        );

      if (repeated) {
        repeatedDayCount += 1;
      }

      priorProteinIds =
        Array.from(proteinIds);
    });

    const varietyScore =
      minimumTargetScore(
        uniqueProteinIds.size,
        6
      );

    const repetitionPenalty =
      repeatedDayCount * 5;

    return clamp(
      varietyScore -
        repetitionPenalty,
      0,
      100
    );
  }

  /**
   * Score special food-frequency constraints.
   *
   * @param {object} strategy
   * @param {object} constraints
   * @returns {number}
   */

  function scoreSpecialFrequencies(
    strategy,
    constraints
  ) {
    const counts =
      strategy.rotationSummary
        ?.specialCounts || {};

    let score = 100;

    const steakExcess =
      Math.max(
        0,
        toFiniteNumber(
          counts.steak
        ) -
          constraints.foodFrequency
            .maximumSteakMealsPerCycle
      );

    score -=
      steakExcess * 15;

    const fishShortfall =
      Math.max(
        0,
        constraints.foodFrequency
          .minimumFishMealsPerCycle -
          toFiniteNumber(
            counts.fish
          )
      );

    score -=
      fishShortfall * 14;

    const eggExcess =
      Math.max(
        0,
        toFiniteNumber(
          counts.eggBreakfasts
        ) -
          constraints.foodFrequency
            .maximumEggBreakfastsPerCycle
      );

    score -=
      eggExcess * 10;

    const shakeExcess =
      Math.max(
        0,
        toFiniteNumber(
          counts.shakes
        ) -
          constraints.foodFrequency
            .maximumProteinShakesPerCycle
      );

    score -=
      shakeExcess * 16;

    return clamp(
      score,
      0,
      100
    );
  }

  /**
   * Score meal-prep compatibility.
   *
   * @param {object} strategy
   * @returns {number}
   */

  function scoreMealPrep(
    strategy
  ) {
    const meals =
      getStrategyMeals(strategy);

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
   * Score daily meal coverage.
   *
   * @param {object} strategy
   * @returns {number}
   */

  function scoreDailyCoverage(
    strategy
  ) {
    const days =
      Array.isArray(
        strategy?.days
      )
        ? strategy.days
        : [];

    if (days.length === 0) {
      return 0;
    }

    const expectedTypes = [
      "breakfast",
      "lunch",
      "dinner",
      "snack"
    ];

    const scores =
      days.map((day) => {
        const availableTypes =
          new Set(
            day.meals
              .map(
                (meal) =>
                  meal.mealType
              )
              .filter(Boolean)
          );

        const foundCount =
          expectedTypes.filter(
            (mealType) =>
              availableTypes.has(
                mealType
              )
          ).length;

        const validRecipeCount =
          day.meals.filter(
            (meal) =>
              Boolean(
                meal.recipeId
              )
          ).length;

        return (
          foundCount /
            expectedTypes.length *
            60 +
          validRecipeCount /
            expectedTypes.length *
            40
        );
      });

    return average(scores);
  }

  /**
   * Score projected meal nutrition.
   *
   * @param {object} strategy
   * @returns {number}
   */

  function scoreNutritionProjection(
    strategy
  ) {
    const meals =
      getStrategyMeals(strategy);

    if (meals.length === 0) {
      return 0;
    }

    return average(
      meals.map((meal) => {
        const actual =
          meal.estimatedMacros || {};

        const target =
          meal.target || {};

        const calorieScore =
          targetMatchScore(
            actual.calories,
            target.calories
          );

        const proteinScore =
          targetMatchScore(
            actual.protein,
            target.protein
          );

        return (
          calorieScore * 0.55 +
          proteinScore * 0.45
        );
      })
    );
  }

  /**
   * Identify issues that should reduce the score.
   *
   * @param {object} context
   * @returns {object}
   */

  function identifyStrategyIssues(
    context
  ) {
    const {
      strategy,
      constraints,
      componentScores
    } = context;

    const items = [];
    let penalty = 0;

    const meals =
      getStrategyMeals(strategy);

    const missingRecipeCount =
      meals.filter(
        (meal) =>
          !meal.recipeId
      ).length;

    if (missingRecipeCount > 0) {
      const amount =
        missingRecipeCount * 12;

      penalty += amount;

      items.push({
        code:
          "missing-recipes",
        severity: "error",
        penalty: amount,
        message:
          `${missingRecipeCount} meal slots do not have an eligible recipe.`
      });
    }

    const duplicateDayFingerprints =
      countDuplicateDayPatterns(
        strategy
      );

    if (
      duplicateDayFingerprints > 0
    ) {
      const amount =
        duplicateDayFingerprints * 4;

      penalty += amount;

      items.push({
        code:
          "duplicate-day-patterns",
        severity: "warning",
        penalty: amount,
        message:
          `${duplicateDayFingerprints} day pattern${
            duplicateDayFingerprints ===
            1
              ? " is"
              : "s are"
          } repeated.`
      });
    }

    if (
      componentScores
        .proteinRotation < 70
    ) {
      penalty += 5;

      items.push({
        code:
          "weak-protein-rotation",
        severity: "warning",
        penalty: 5,
        message:
          "Primary-protein rotation is weaker than preferred."
      });
    }

    if (
      componentScores
        .foodVariety < 70
    ) {
      penalty += 5;

      items.push({
        code:
          "weak-food-variety",
        severity: "warning",
        penalty: 5,
        message:
          "Food variety is weaker than preferred."
      });
    }

    const shakeCount =
      strategy.rotationSummary
        ?.specialCounts?.shakes ??
      0;

    if (
      shakeCount >
      constraints.foodFrequency
        .maximumProteinShakesPerCycle
    ) {
      penalty += 10;

      items.push({
        code:
          "shake-limit",
        severity: "error",
        penalty: 10,
        message:
          "The cycle exceeds the protein-shake limit."
      });
    }

    return {
      penalty,
      items
    };
  }

  /**
   * Determine whether optimization should stop early.
   *
   * @param {object} context
   * @returns {boolean}
   */

  function shouldStopEarly(
    context
  ) {
    const {
      bestCandidate,
      targetScore,
      attemptNumber,
      maximumAttempts,
      options
    } = context;

    if (
      !options.stopWhenTargetReached
    ) {
      return false;
    }

    if (
      bestCandidate.score <
      targetScore
    ) {
      return false;
    }

    const minimumAttempts =
      Math.min(
        5,
        maximumAttempts
      );

    return (
      attemptNumber >=
      minimumAttempts
    );
  }

  /**
   * Add a candidate to retained history.
   *
   * @param {object[]} history
   * @param {object} candidate
   * @param {object} options
   */

  function addCandidateToHistory(
    history,
    candidate,
    options
  ) {
    const duplicateIndex =
      history.findIndex(
        (existingCandidate) =>
          existingCandidate
            .fingerprint ===
          candidate.fingerprint
      );

    if (duplicateIndex >= 0) {
      if (
        candidate.score >
        history[duplicateIndex]
          .score
      ) {
        history[duplicateIndex] =
          candidate;
      }

      return;
    }

    history.push(candidate);

    history.sort(
      (first, second) =>
        second.score -
        first.score
    );

    if (
      history.length >
      options.candidateHistoryLimit
    ) {
      history.length =
        options.candidateHistoryLimit;
    }
  }

  /**
   * Compare the winning candidate against other retained candidates.
   *
   * @param {object[]} history
   * @param {object} bestCandidate
   * @returns {object}
   */

  function compareCandidateHistory(
    history,
    bestCandidate
  ) {
    const scores =
      history.map(
        (candidate) =>
          candidate.score
      );

    const averageScore =
      average(scores);

    const lowestScore =
      scores.length > 0
        ? Math.min(...scores)
        : bestCandidate.score;

    const secondBest =
      history.find(
        (candidate) =>
          candidate.id !==
          bestCandidate.id
      );

    return {
      retainedCandidateCount:
        history.length,

      bestScore:
        bestCandidate.score,

      secondBestScore:
        secondBest?.score ??
        null,

      lowestRetainedScore:
        roundNumber(
          lowestScore,
          1
        ),

      averageRetainedScore:
        roundNumber(
          averageScore,
          1
        ),

      improvementOverAverage:
        roundNumber(
          bestCandidate.score -
            averageScore,
          1
        ),

      improvementOverSecondBest:
        secondBest
          ? roundNumber(
              bestCandidate.score -
                secondBest.score,
              1
            )
          : null
    };
  }

  /**
   * Build the optimization decision log.
   *
   * @param {object} context
   * @returns {object[]}
   */

  function buildOptimizationLog(
    context
  ) {
    const {
      bestCandidate,
      completedAttempts,
      failedAttempts,
      targetScore,
      stopReason,
      mode,
      durationMilliseconds,
      comparison
    } = context;

    const entries = [
      {
        type: "summary",
        title:
          "Optimization complete",
        message:
          `Eleven evaluated ${completedAttempts} planning attempt${
            completedAttempts === 1
              ? ""
              : "s"
          } and selected a ${bestCandidate.rating.toLowerCase()} plan scoring ${bestCandidate.score} out of 100.`
      },

      {
        type: "information",
        title:
          "Optimization mode",
        message:
          `${mode.name} mode completed in ${formatDuration(
            durationMilliseconds
          )}.`
      }
    ];

    if (
      bestCandidate.score >=
      targetScore
    ) {
      entries.push({
        type: "positive",
        title:
          "Target score achieved",
        message:
          `The selected plan met the optimization target of ${targetScore}.`
      });
    } else {
      entries.push({
        type: "warning",
        title:
          "Target score not reached",
        message:
          `The strongest available plan scored ${bestCandidate.score}, below the preferred target of ${targetScore}.`
      });
    }

    const strongestComponents =
      getStrongestComponents(
        bestCandidate.evaluation
          .componentScores
      );

    if (
      strongestComponents.length >
      0
    ) {
      entries.push({
        type: "positive",
        title:
          "Why this plan won",
        message:
          `Its strongest qualities were ${strongestComponents
            .map(
              formatComponentName
            )
            .join(", ")}.`
      });
    }

    if (
      comparison.improvementOverSecondBest !==
        null &&
      comparison.improvementOverSecondBest >
        0
    ) {
      entries.push({
        type: "information",
        title:
          "Candidate comparison",
        message:
          `The winning candidate scored ${comparison.improvementOverSecondBest} points higher than the next-best retained plan.`
      });
    }

    if (failedAttempts > 0) {
      entries.push({
        type: "warning",
        title:
          "Skipped attempts",
        message:
          `${failedAttempts} attempt${
            failedAttempts === 1
              ? " was"
              : "s were"
          } skipped because a valid strategy could not be created.`
      });
    }

    entries.push({
      type: "information",
      title:
        "Stopping condition",
      message:
        stopReason ===
        "target-score-reached"
          ? "Optimization stopped after reaching the requested quality target."
          : "Optimization completed the maximum permitted attempts."
    });

    return entries;
  }

  /**
   * Create an evaluation summary.
   *
   * @param {object} componentScores
   * @param {object[]} issues
   * @returns {string[]}
   */

  function createEvaluationSummary(
    componentScores,
    issues
  ) {
    const summary = [];

    const strongest =
      getStrongestComponents(
        componentScores
      );

    const weakest =
      getWeakestComponents(
        componentScores
      );

    if (strongest.length > 0) {
      summary.push(
        `Strongest areas: ${strongest
          .map(
            formatComponentName
          )
          .join(", ")}.`
      );
    }

    if (weakest.length > 0) {
      summary.push(
        `Areas with room for improvement: ${weakest
          .map(
            formatComponentName
          )
          .join(", ")}.`
      );
    }

    if (issues.length === 0) {
      summary.push(
        "No significant planning issues were identified."
      );
    } else {
      summary.push(
        `${issues.length} planning consideration${
          issues.length === 1
            ? " was"
            : "s were"
        } identified.`
      );
    }

    return summary;
  }

  /**
   * Create a strategy fingerprint.
   *
   * @param {object} strategy
   * @returns {string}
   */

  function createStrategyFingerprint(
    strategy
  ) {
    return strategy.days
      .map((day) =>
        day.meals
          .map(
            (meal) =>
              meal.recipeId ||
              "none"
          )
          .join("|")
      )
      .join("::");
  }

  /**
   * Count duplicate daily recipe patterns.
   *
   * @param {object} strategy
   * @returns {number}
   */

  function countDuplicateDayPatterns(
    strategy
  ) {
    const fingerprints =
      strategy.days.map((day) =>
        day.meals
          .map(
            (meal) =>
              meal.recipeId ||
              "none"
          )
          .join("|")
      );

    const counts =
      countValues(
        fingerprints
      );

    return Object.values(counts)
      .reduce(
        (total, count) =>
          total +
          Math.max(
            0,
            count - 1
          ),
        0
      );
  }

  /**
   * Return all strategy meals.
   *
   * @param {object} strategy
   * @returns {object[]}
   */

  function getStrategyMeals(
    strategy
  ) {
    return Array.isArray(
      strategy?.days
    )
      ? strategy.days.flatMap(
          (day) =>
            Array.isArray(
              day?.meals
            )
              ? day.meals
              : []
        )
      : [];
  }

  /**
   * Report progress to the caller.
   *
   * @param {object} options
   * @param {object} progress
   */

  function reportProgress(
    options,
    progress
  ) {
    if (
      typeof options.onProgress !==
      "function"
    ) {
      return;
    }

    try {
      options.onProgress({
        timestamp:
          new Date().toISOString(),
        ...progress
      });
    } catch (error) {
      console.warn(
        "Eleven optimization progress callback failed.",
        error
      );
    }
  }

  /**
   * Create a failure result.
   *
   * @param {object} context
   * @returns {object}
   */

  function createFailureResult(
    context
  ) {
    const {
      errors,
      warnings,
      completedAttempts,
      failedAttempts,
      startedAt,
      startedTime,
      mode,
      maximumAttempts,
      targetScore
    } = context;

    return {
      success: false,
      errors,
      warnings,

      optimization: {
        id: createOptimizationId(),
        mode: mode.id,
        modeName: mode.name,
        startedAt,
        completedAt:
          new Date().toISOString(),

        durationMilliseconds:
          Math.round(
            performance.now() -
            startedTime
          ),

        completedAttempts,
        failedAttempts,
        maximumAttempts,
        targetScore,
        achievedTarget: false,
        stopReason:
          "no-valid-candidate"
      },

      bestCandidate: null,
      comparison: null,
      optimizationLog: [],
      candidates: []
    };
  }

  /**
   * Create a lightweight candidate summary.
   *
   * @param {object} candidate
   * @returns {object}
   */

  function createCandidateSummary(
    candidate
  ) {
    return {
      id: candidate.id,
      attemptNumber:
        candidate.attemptNumber,
      createdAt:
        candidate.createdAt,
      score:
        candidate.score,
      rating:
        candidate.rating,
      fingerprint:
        candidate.fingerprint,
      componentScores:
        candidate.evaluation
          .componentScores,
      issueCount:
        candidate.evaluation
          .issues.length
    };
  }

  /**
   * Normalize optimizer options.
   *
   * @param {object} suppliedOptions
   * @returns {object}
   */

  function normalizeOptions(
    suppliedOptions
  ) {
    const mode =
      OPTIMIZATION_MODES[
        suppliedOptions.mode
      ]
        ? suppliedOptions.mode
        : DEFAULT_OPTIONS.mode;

    return {
      ...DEFAULT_OPTIONS,
      ...suppliedOptions,
      mode,

      maximumAttempts:
        suppliedOptions
          .maximumAttempts ===
        null ||
        suppliedOptions
          .maximumAttempts ===
        undefined
          ? null
          : clampInteger(
              suppliedOptions
                .maximumAttempts,
              1,
              500
            ),

      targetScore:
        suppliedOptions
          .targetScore === null ||
        suppliedOptions
          .targetScore ===
          undefined
          ? null
          : clamp(
              suppliedOptions
                .targetScore,
              0,
              100
            ),

      candidateHistoryLimit:
        clampInteger(
          suppliedOptions
            .candidateHistoryLimit ??
            DEFAULT_OPTIONS
              .candidateHistoryLimit,
          1,
          100
        )
    };
  }

  /**
   * Return optimizer mode details.
   *
   * @param {string} modeId
   * @returns {object|null}
   */

  function getOptimizationMode(
    modeId
  ) {
    const mode =
      OPTIMIZATION_MODES[modeId];

    return mode
      ? { ...mode }
      : null;
  }

  /**
   * Return all optimizer modes.
   *
   * @returns {object[]}
   */

  function getOptimizationModes() {
    return Object.values(
      OPTIMIZATION_MODES
    ).map(
      (mode) => ({
        ...mode
      })
    );
  }

  /**
   * Calculate a weighted score.
   *
   * @param {object} scores
   * @param {object} weights
   * @returns {number}
   */

  function calculateWeightedScore(
    scores,
    weights
  ) {
    const totalWeight =
      Object.values(weights)
        .reduce(
          (total, weight) =>
            total +
            toFiniteNumber(
              weight
            ),
          0
        );

    if (totalWeight <= 0) {
      return 0;
    }

    return Object.entries(
      weights
    ).reduce(
      (total, [key, weight]) =>
        total +
        toFiniteNumber(
          scores[key]
        ) *
          (
            toFiniteNumber(
              weight
            ) /
            totalWeight
          ),
      0
    );
  }

  /**
   * Calculate minimum-target attainment.
   *
   * @param {number} actual
   * @param {number} target
   * @returns {number}
   */

  function minimumTargetScore(
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
   * Calculate target closeness.
   *
   * @param {number} actual
   * @param {number} target
   * @returns {number}
   */

  function targetMatchScore(
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
   * Return strongest score components.
   *
   * @param {object} componentScores
   * @returns {string[]}
   */

  function getStrongestComponents(
    componentScores
  ) {
    return Object.entries(
      componentScores
    )
      .filter(
        ([, value]) =>
          value >= 88
      )
      .sort(
        (first, second) =>
          second[1] -
          first[1]
      )
      .slice(0, 3)
      .map(
        ([key]) => key
      );
  }

  /**
   * Return weakest score components.
   *
   * @param {object} componentScores
   * @returns {string[]}
   */

  function getWeakestComponents(
    componentScores
  ) {
    return Object.entries(
      componentScores
    )
      .filter(
        ([, value]) =>
          value < 75
      )
      .sort(
        (first, second) =>
          first[1] -
          second[1]
      )
      .slice(0, 3)
      .map(
        ([key]) => key
      );
  }

  /**
   * Format a component key.
   *
   * @param {string} key
   * @returns {string}
   */

  function formatComponentName(
    key
  ) {
    const names = {
      recipeQuality:
        "recipe quality",
      recipeVariety:
        "recipe variety",
      foodVariety:
        "food variety",
      proteinRotation:
        "protein rotation",
      specialFrequency:
        "food-frequency balance",
      mealPrep:
        "meal-prep efficiency",
      dailyCoverage:
        "daily meal structure",
      nutritionProjection:
        "projected nutrition"
    };

    return names[key] || key;
  }

  /**
   * Return plan rating.
   *
   * @param {number} score
   * @returns {string}
   */

  function getScoreRating(
    score
  ) {
    if (
      window.ELEVEN_CONSTRAINTS &&
      typeof window
        .ELEVEN_CONSTRAINTS
        .getPlanScoreRating ===
        "function"
    ) {
      return window
        .ELEVEN_CONSTRAINTS
        .getPlanScoreRating(
          score
        );
    }

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

    return "Regenerate";
  }

  /**
   * Count array values.
   *
   * @param {string[]} values
   * @returns {object}
   */

  function countValues(values) {
    return values.reduce(
      (counts, value) => {
        counts[value] =
          (
            counts[value] || 0
          ) + 1;

        return counts;
      },
      {}
    );
  }

  /**
   * Return average.
   *
   * @param {number[]} values
   * @returns {number}
   */

  function average(values) {
    const safeValues =
      values
        .map(toFiniteNumber)
        .filter(
          Number.isFinite
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
   * Map object values to rounded values.
   *
   * @param {object} values
   * @returns {object}
   */

  function mapRoundedValues(
    values
  ) {
    return Object.fromEntries(
      Object.entries(values)
        .map(
          ([key, value]) => [
            key,
            roundNumber(
              value,
              1
            )
          ]
        )
    );
  }

  /**
   * Yield control so progress UI can repaint.
   *
   * @returns {Promise<void>}
   */

  function yieldToBrowser() {
    return new Promise(
      (resolve) => {
        window.setTimeout(
          resolve,
          0
        );
      }
    );
  }

  /**
   * Format elapsed time.
   *
   * @param {number} milliseconds
   * @returns {string}
   */

  function formatDuration(
    milliseconds
  ) {
    if (
      milliseconds < 1000
    ) {
      return `${milliseconds} ms`;
    }

    return `${(
      milliseconds / 1000
    ).toFixed(1)} seconds`;
  }

  /**
   * Create optimizer ID.
   *
   * @returns {string}
   */

  function createOptimizationId() {
    return [
      "optimization",
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 9)
    ].join("-");
  }

  /**
   * Create candidate ID.
   *
   * @param {number} attemptNumber
   * @returns {string}
   */

  function createCandidateId(
    attemptNumber
  ) {
    return [
      "candidate",
      attemptNumber,
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 8)
    ].join("-");
  }

  /**
   * Convert value to finite number.
   *
   * @param {*} value
   * @returns {number}
   */

  function toFiniteNumber(value) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  /**
   * Clamp numeric value.
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
   * Clamp integer value.
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
          toFiniteNumber(value) +
          Number.EPSILON
        ) *
          multiplier
      ) /
      multiplier
    );
  }

  return {
    modes:
      getOptimizationModes(),

    defaults: {
      ...DEFAULT_OPTIONS
    },

    optimizeCycle,
    evaluateStrategy,
    getOptimizationMode,
    getOptimizationModes,
    getScoreRating
  };
})();
