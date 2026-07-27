"use strict";

/**
 * Eleven calendar progress engine
 *
 * Responsibilities:
 *
 * - Read and normalize completed cycle days
 * - Mark a day complete or incomplete
 * - Save completion state in the current meal plan
 * - Calculate cycle progress and current day
 * - Record completion timestamps
 * - Emit progress events for the calendar and dashboard
 * - Reset cycle completion when requested
 *
 * The progress engine does not render the calendar interface.
 */

window.ELEVEN_CALENDAR_PROGRESS = (() => {
  const VERSION = 1;

  /**
   * Return progress for the current saved meal plan.
   *
   * @returns {object}
   */

  function getCurrentProgress() {
    const mealPlan =
      getSavedMealPlan();

    if (!mealPlan) {
      return createEmptyProgress();
    }

    return calculateProgress(
      mealPlan
    );
  }

  /**
   * Calculate progress for a meal plan.
   *
   * @param {object} mealPlan
   * @returns {object}
   */

  function calculateProgress(
    mealPlan
  ) {
    const validation =
      validateMealPlan(mealPlan);

    if (!validation.isValid) {
      return {
        ...createEmptyProgress(),
        isValid: false,
        errors:
          validation.errors
      };
    }

    const dayNumbers =
      getValidDayNumbers(
        mealPlan
      );

    const completedDayNumbers =
      getCompletedDayNumbers(
        mealPlan
      ).filter(
        (dayNumber) =>
          dayNumbers.includes(
            dayNumber
          )
      );

    const totalDays =
      dayNumbers.length;

    const completedDays =
      completedDayNumbers.length;

    const remainingDays =
      Math.max(
        0,
        totalDays -
          completedDays
      );

    const currentDay =
      resolveCurrentDay({
        dayNumbers,
        completedDayNumbers
      });

    const percentage =
      totalDays > 0
        ? Math.round(
            completedDays /
              totalDays *
              100
          )
        : 0;

    return {
      isValid: true,
      errors: [],

      totalDays,
      completedDays,
      remainingDays,
      currentDay,
      percentage,

      isComplete:
        totalDays > 0 &&
        completedDays ===
          totalDays,

      completedDayNumbers,

      nextIncompleteDay:
        findNextIncompleteDay({
          dayNumbers,
          completedDayNumbers,
          startingDay:
            currentDay
        }),

      previousCompletedDay:
        findPreviousCompletedDay({
          completedDayNumbers,
          currentDay
        }),

      completionRecords:
        getCompletionRecords(
          mealPlan
        )
    };
  }

  /**
   * Mark one day complete or incomplete.
   *
   * @param {number} dayNumber
   * @param {boolean} completed
   * @returns {object}
   */

  function setDayCompletion(
    dayNumber,
    completed
  ) {
    const mealPlan =
      getSavedMealPlan();

    if (!mealPlan) {
      return createFailureResult(
        "Generate a meal plan before tracking cycle progress."
      );
    }

    const validation =
      validateDayNumber(
        mealPlan,
        dayNumber
      );

    if (!validation.isValid) {
      return createFailureResult(
        validation.errors[0]
      );
    }

    const normalizedDay =
      Number(dayNumber);

    const shouldComplete =
      Boolean(completed);

    const completedDays =
      new Set(
        getCompletedDayNumbers(
          mealPlan
        )
      );

    const completionRecords =
      getCompletionRecords(
        mealPlan
      );

    if (shouldComplete) {
      completedDays.add(
        normalizedDay
      );

      completionRecords[
        normalizedDay
      ] = {
        day:
          normalizedDay,

        completedAt:
          new Date()
            .toISOString(),

        status:
          "completed"
      };
    } else {
      completedDays.delete(
        normalizedDay
      );

      delete completionRecords[
        normalizedDay
      ];
    }

    const updatedPlan = {
      ...mealPlan,

      completedDays:
        Array.from(
          completedDays
        ).sort(
          (first, second) =>
            first - second
        ),

      completionRecords,

      currentDay:
        resolveCurrentDay({
          dayNumbers:
            getValidDayNumbers(
              mealPlan
            ),

          completedDayNumbers:
            Array.from(
              completedDays
            )
        }),

      updatedAt:
        new Date()
          .toISOString()
    };

    const saved =
      saveMealPlan(
        updatedPlan
      );

    if (!saved) {
      return createFailureResult(
        "Eleven could not save the updated cycle progress."
      );
    }

    const progress =
      calculateProgress(
        updatedPlan
      );

    emitProgressEvents({
      mealPlan:
        updatedPlan,

      progress,

      changedDay:
        normalizedDay,

      completed:
        shouldComplete,

      action:
        shouldComplete
          ? "completed"
          : "reopened"
    });

    return {
      success: true,
      errors: [],
      mealPlan:
        updatedPlan,
      progress
    };
  }

  /**
   * Toggle one day's completion state.
   *
   * @param {number} dayNumber
   * @returns {object}
   */

  function toggleDayCompletion(
    dayNumber
  ) {
    const mealPlan =
      getSavedMealPlan();

    if (!mealPlan) {
      return createFailureResult(
        "Generate a meal plan before tracking cycle progress."
      );
    }

    const normalizedDay =
      Number(dayNumber);

    const isCompleted =
      getCompletedDayNumbers(
        mealPlan
      ).includes(
        normalizedDay
      );

    return setDayCompletion(
      normalizedDay,
      !isCompleted
    );
  }

  /**
   * Reset every completed day in the current cycle.
   *
   * @returns {object}
   */

  function resetCycleProgress() {
    const mealPlan =
      getSavedMealPlan();

    if (!mealPlan) {
      return createFailureResult(
        "There is no saved meal plan to reset."
      );
    }

    const updatedPlan = {
      ...mealPlan,

      completedDays: [],

      completionRecords: {},

      currentDay:
        getValidDayNumbers(
          mealPlan
        )[0] || 1,

      cycleStartedAt: null,

      cycleCompletedAt: null,

      updatedAt:
        new Date()
          .toISOString()
    };

    const saved =
      saveMealPlan(
        updatedPlan
      );

    if (!saved) {
      return createFailureResult(
        "Eleven could not reset the cycle progress."
      );
    }

    const progress =
      calculateProgress(
        updatedPlan
      );

    emitProgressEvents({
      mealPlan:
        updatedPlan,

      progress,

      changedDay: null,

      completed: false,

      action:
        "reset"
    });

    return {
      success: true,
      errors: [],
      mealPlan:
        updatedPlan,
      progress
    };
  }

  /**
   * Complete every day in the current cycle.
   *
   * Primarily useful during testing.
   *
   * @returns {object}
   */

  function completeEntireCycle() {
    const mealPlan =
      getSavedMealPlan();

    if (!mealPlan) {
      return createFailureResult(
        "There is no saved meal plan to complete."
      );
    }

    const completedAt =
      new Date()
        .toISOString();

    const dayNumbers =
      getValidDayNumbers(
        mealPlan
      );

    const completionRecords =
      Object.fromEntries(
        dayNumbers.map(
          (dayNumber) => [
            dayNumber,
            {
              day:
                dayNumber,

              completedAt,

              status:
                "completed"
            }
          ]
        )
      );

    const updatedPlan = {
      ...mealPlan,

      completedDays: [
        ...dayNumbers
      ],

      completionRecords,

      currentDay:
        dayNumbers.at(-1) ||
        1,

      cycleCompletedAt:
        completedAt,

      updatedAt:
        completedAt
    };

    const saved =
      saveMealPlan(
        updatedPlan
      );

    if (!saved) {
      return createFailureResult(
        "Eleven could not complete the current cycle."
      );
    }

    const progress =
      calculateProgress(
        updatedPlan
      );

    emitProgressEvents({
      mealPlan:
        updatedPlan,

      progress,

      changedDay: null,

      completed: true,

      action:
        "cycle-completed"
    });

    return {
      success: true,
      errors: [],
      mealPlan:
        updatedPlan,
      progress
    };
  }

  /**
   * Return whether one day is complete.
   *
   * @param {number} dayNumber
   * @param {object|null} suppliedMealPlan
   * @returns {boolean}
   */

  function isDayComplete(
    dayNumber,
    suppliedMealPlan = null
  ) {
    const mealPlan =
      suppliedMealPlan ||
      getSavedMealPlan();

    if (!mealPlan) {
      return false;
    }

    return getCompletedDayNumbers(
      mealPlan
    ).includes(
      Number(dayNumber)
    );
  }

  /**
   * Return normalized completed day numbers.
   *
   * @param {object} mealPlan
   * @returns {number[]}
   */

  function getCompletedDayNumbers(
    mealPlan
  ) {
    if (
      window
        .ELEVEN_CALENDAR_TIMELINE &&
      typeof window
        .ELEVEN_CALENDAR_TIMELINE
        .getCompletedDayNumbers ===
        "function"
    ) {
      return window
        .ELEVEN_CALENDAR_TIMELINE
        .getCompletedDayNumbers(
          mealPlan
        );
    }

    const completedDays =
      Array.isArray(
        mealPlan?.completedDays
      )
        ? mealPlan.completedDays
        : [];

    return [
      ...new Set(
        completedDays
          .map((value) =>
            typeof value ===
              "object"
              ? Number(
                  value.day
                )
              : Number(value)
          )
          .filter(
            (value) =>
              Number.isInteger(
                value
              ) &&
              value > 0
          )
      )
    ].sort(
      (first, second) =>
        first - second
    );
  }

  /**
   * Return normalized completion records.
   *
   * @param {object} mealPlan
   * @returns {object}
   */

  function getCompletionRecords(
    mealPlan
  ) {
    const storedRecords =
      mealPlan
        ?.completionRecords;

    if (
      storedRecords &&
      typeof storedRecords ===
        "object" &&
      !Array.isArray(
        storedRecords
      )
    ) {
      return {
        ...storedRecords
      };
    }

    const records = {};

    getCompletedDayNumbers(
      mealPlan
    ).forEach(
      (dayNumber) => {
        records[
          dayNumber
        ] = {
          day:
            dayNumber,

          completedAt: null,

          status:
            "completed"
        };
      }
    );

    return records;
  }

  /**
   * Return valid plan day numbers.
   *
   * @param {object} mealPlan
   * @returns {number[]}
   */

  function getValidDayNumbers(
    mealPlan
  ) {
    return Array.isArray(
      mealPlan?.days
    )
      ? mealPlan.days
          .map(
            (day) =>
              Number(day.day)
          )
          .filter(
            (dayNumber) =>
              Number.isInteger(
                dayNumber
              ) &&
              dayNumber > 0
          )
          .sort(
            (first, second) =>
              first - second
          )
      : [];
  }

  /**
   * Determine the active cycle day.
   *
   * Current day is the first incomplete day.
   *
   * @param {object} context
   * @returns {number}
   */

  function resolveCurrentDay(
    context
  ) {
    const {
      dayNumbers,
      completedDayNumbers
    } = context;

    if (
      !Array.isArray(
        dayNumbers
      ) ||
      dayNumbers.length === 0
    ) {
      return 1;
    }

    const completedSet =
      new Set(
        completedDayNumbers
      );

    const firstIncomplete =
      dayNumbers.find(
        (dayNumber) =>
          !completedSet.has(
            dayNumber
          )
      );

    return (
      firstIncomplete ||
      dayNumbers.at(-1) ||
      1
    );
  }

  /**
   * Find the next incomplete day.
   *
   * @param {object} context
   * @returns {number|null}
   */

  function findNextIncompleteDay(
    context
  ) {
    const {
      dayNumbers,
      completedDayNumbers,
      startingDay
    } = context;

    const completedSet =
      new Set(
        completedDayNumbers
      );

    const laterIncomplete =
      dayNumbers.find(
        (dayNumber) =>
          dayNumber >
            startingDay &&
          !completedSet.has(
            dayNumber
          )
      );

    if (laterIncomplete) {
      return laterIncomplete;
    }

    const anyIncomplete =
      dayNumbers.find(
        (dayNumber) =>
          !completedSet.has(
            dayNumber
          )
      );

    return (
      anyIncomplete ||
      null
    );
  }

  /**
   * Find the nearest completed day before the current day.
   *
   * @param {object} context
   * @returns {number|null}
   */

  function findPreviousCompletedDay(
    context
  ) {
    const {
      completedDayNumbers,
      currentDay
    } = context;

    const earlierDays =
      completedDayNumbers.filter(
        (dayNumber) =>
          dayNumber <
          currentDay
      );

    return (
      earlierDays.at(-1) ||
      null
    );
  }

  /**
   * Validate a meal plan.
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
        "The meal plan does not contain any cycle days."
      );
    }

    return {
      isValid:
        errors.length === 0,
      errors
    };
  }

  /**
   * Validate a requested day number.
   *
   * @param {object} mealPlan
   * @param {number} dayNumber
   * @returns {object}
   */

  function validateDayNumber(
    mealPlan,
    dayNumber
  ) {
    const errors = [];

    const normalizedDay =
      Number(dayNumber);

    if (
      !Number.isInteger(
        normalizedDay
      ) ||
      normalizedDay < 1
    ) {
      errors.push(
        "A valid cycle day is required."
      );
    }

    if (
      !getValidDayNumbers(
        mealPlan
      ).includes(
        normalizedDay
      )
    ) {
      errors.push(
        `Day ${normalizedDay} is not part of the current cycle.`
      );
    }

    return {
      isValid:
        errors.length === 0,
      errors
    };
  }

  /**
   * Save the updated meal plan.
   *
   * @param {object} mealPlan
   * @returns {boolean}
   */

  function saveMealPlan(
    mealPlan
  ) {
    if (
      window.ELEVEN_STORAGE &&
      typeof window
        .ELEVEN_STORAGE
        .saveMealPlan ===
        "function"
    ) {
      return Boolean(
        window
          .ELEVEN_STORAGE
          .saveMealPlan(
            mealPlan
          )
      );
    }

    try {
      localStorage.setItem(
        "eleven.mealPlan",
        JSON.stringify(
          mealPlan
        )
      );

      return true;
    } catch (error) {
      console.error(
        "Eleven could not save calendar progress.",
        error
      );

      return false;
    }
  }

  /**
   * Return the saved meal plan.
   *
   * @returns {object|null}
   */

  function getSavedMealPlan() {
    if (
      window.ELEVEN_STORAGE &&
      typeof window
        .ELEVEN_STORAGE
        .getMealPlan ===
        "function"
    ) {
      return window
        .ELEVEN_STORAGE
        .getMealPlan();
    }

    try {
      const stored =
        localStorage.getItem(
          "eleven.mealPlan"
        );

      return stored
        ? JSON.parse(stored)
        : null;
    } catch (error) {
      console.error(
        "Eleven could not load calendar progress.",
        error
      );

      return null;
    }
  }

  /**
   * Notify dependent modules.
   *
   * @param {object} context
   */

  function emitProgressEvents(
    context
  ) {
    const {
      mealPlan,
      progress,
      changedDay,
      completed,
      action
    } = context;

    const detail = {
      version:
        VERSION,

      mealPlan,
      progress,
      changedDay,
      completed,
      action,

      timestamp:
        new Date()
          .toISOString()
    };

    document.dispatchEvent(
      new CustomEvent(
        "eleven:calendar-progress-updated",
        {
          detail
        }
      )
    );

    document.dispatchEvent(
      new CustomEvent(
        "eleven:progress-updated",
        {
          detail
        }
      )
    );

    document.dispatchEvent(
      new CustomEvent(
        "eleven:meal-plan-updated",
        {
          detail: {
            mealPlan,
            source:
              "calendar-progress"
          }
        }
      )
    );
  }

  /**
   * Create an empty progress object.
   *
   * @returns {object}
   */

  function createEmptyProgress() {
    return {
      isValid: false,
      errors: [],

      totalDays: 0,
      completedDays: 0,
      remainingDays: 0,
      currentDay: 1,
      percentage: 0,

      isComplete: false,

      completedDayNumbers: [],

      nextIncompleteDay: null,

      previousCompletedDay: null,

      completionRecords: {}
    };
  }

  /**
   * Create failure result.
   *
   * @param {string} message
   * @returns {object}
   */

  function createFailureResult(
    message
  ) {
    return {
      success: false,
      errors: [
        message
      ],
      mealPlan: null,
      progress:
        getCurrentProgress()
    };
  }

  return {
    version: VERSION,

    getCurrentProgress,
    calculateProgress,
    setDayCompletion,
    toggleDayCompletion,
    resetCycleProgress,
    completeEntireCycle,
    isDayComplete,
    getCompletedDayNumbers,
    getCompletionRecords,
    getValidDayNumbers,
    resolveCurrentDay
  };
})();
