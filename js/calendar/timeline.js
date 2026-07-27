"use strict";

/**
 * Eleven cycle timeline
 *
 * Responsibilities:
 *
 * - Render the 11-day cycle navigation
 * - Show completed, current, and upcoming days
 * - Allow the user to select a day
 * - Calculate cycle completion status
 * - Emit a calendar day-selection event
 *
 * This module does not render meal details.
 */

window.ELEVEN_CALENDAR_TIMELINE = (() => {
  const DEFAULT_OPTIONS = {
    selectedDay: null,
    showCompletionLabels: true
  };

  /**
   * Render a cycle timeline.
   *
   * @param {HTMLElement} container
   * @param {object} mealPlan
   * @param {object} options
   * @returns {object}
   */

  function render(
    container,
    mealPlan,
    options = {}
  ) {
    if (!(container instanceof HTMLElement)) {
      return createFailureResult(
        "A valid timeline container is required."
      );
    }

    const validation =
      validateMealPlan(mealPlan);

    if (!validation.isValid) {
      container.innerHTML = "";

      return createFailureResult(
        validation.errors[0]
      );
    }

    const normalizedOptions = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    const timelineState =
      createTimelineState(
        mealPlan,
        normalizedOptions
      );

    container.innerHTML =
      createTimelineHtml(
        timelineState,
        normalizedOptions
      );

    bindTimelineEvents(
      container,
      timelineState
    );

    return {
      success: true,
      errors: [],
      state: timelineState
    };
  }

  /**
   * Create timeline state.
   *
   * @param {object} mealPlan
   * @param {object} options
   * @returns {object}
   */

  function createTimelineState(
    mealPlan,
    options = {}
  ) {
    const days =
      Array.isArray(mealPlan.days)
        ? mealPlan.days
        : [];

    const completedDayNumbers =
      getCompletedDayNumbers(
        mealPlan
      );

    const selectedDay =
      resolveSelectedDay({
        days,
        completedDayNumbers,
        requestedDay:
          options.selectedDay
      });

    const currentDay =
      resolveCurrentDay({
        days,
        completedDayNumbers
      });

    const dayStates =
      days.map((day) =>
        createDayState({
          day,
          selectedDay,
          currentDay,
          completedDayNumbers
        })
      );

    return {
      totalDays: days.length,
      selectedDay,
      currentDay,

      completedDays:
        completedDayNumbers.length,

      remainingDays:
        Math.max(
          0,
          days.length -
            completedDayNumbers.length
        ),

      percentage:
        days.length > 0
          ? Math.round(
              completedDayNumbers.length /
                days.length *
                100
            )
          : 0,

      days: dayStates
    };
  }

  /**
   * Create state for one day.
   *
   * @param {object} context
   * @returns {object}
   */

  function createDayState(context) {
    const {
      day,
      selectedDay,
      currentDay,
      completedDayNumbers
    } = context;

    const dayNumber =
      Number(day.day);

    const completed =
      completedDayNumbers.includes(
        dayNumber
      );

    const isCurrent =
      dayNumber === currentDay;

    const isSelected =
      dayNumber === selectedDay;

    let status = "upcoming";
    let statusLabel = "Ready";

    if (completed) {
      status = "completed";
      statusLabel = "Completed";
    } else if (isCurrent) {
      status = "current";
      statusLabel = "Current";
    }

    return {
      dayNumber,
      completed,
      isCurrent,
      isSelected,
      status,
      statusLabel,

      calories:
        toFiniteNumber(
          day.macros?.calories ||
          day.targets?.calories
        ),

      protein:
        toFiniteNumber(
          day.macros?.protein ||
          day.targets?.protein
        ),

      mealCount:
        Array.isArray(day.meals)
          ? day.meals.length
          : 0
    };
  }

  /**
   * Create timeline HTML.
   *
   * @param {object} timelineState
   * @param {object} options
   * @returns {string}
   */

  function createTimelineHtml(
    timelineState,
    options
  ) {
    return `
      <section class="cycle-timeline-shell">
        <div class="cycle-timeline-heading">
          <div>
            <p class="eyebrow">
              Eleven cycle
            </p>

            <h2>
              ${timelineState.completedDays}
              of
              ${timelineState.totalDays}
              days complete
            </h2>
          </div>

          <strong class="cycle-timeline-percentage">
            ${timelineState.percentage}%
          </strong>
        </div>

        <div
          class="cycle-timeline-progress"
          aria-label="${timelineState.percentage}% of the cycle completed"
        >
          <span
            style="width: ${clamp(
              timelineState.percentage,
              0,
              100
            )}%"
          ></span>
        </div>

        <div
          class="cycle-timeline-days"
          role="tablist"
          aria-label="Eleven cycle days"
        >
          ${timelineState.days
            .map((day) =>
              createDayButtonHtml(
                day,
                options
              )
            )
            .join("")}
        </div>
      </section>
    `;
  }

  /**
   * Create one day-selection button.
   *
   * @param {object} day
   * @param {object} options
   * @returns {string}
   */

  function createDayButtonHtml(
    day,
    options
  ) {
    const classes = [
      "cycle-day-button",
      `is-${day.status}`
    ];

    if (day.isSelected) {
      classes.push("is-selected");
    }

    return `
      <button
        type="button"
        class="${classes.join(" ")}"
        data-calendar-day="${day.dayNumber}"
        role="tab"
        aria-selected="${
          day.isSelected
            ? "true"
            : "false"
        }"
      >
        <span class="cycle-day-status-icon">
          ${getStatusIcon(day)}
        </span>

        <span class="cycle-day-number">
          Day ${day.dayNumber}
        </span>

        ${
          options.showCompletionLabels
            ? `
              <small>
                ${escapeHtml(
                  day.statusLabel
                )}
              </small>
            `
            : ""
        }

        <span class="cycle-day-macros">
          ${Math.round(
            day.calories
          )} kcal
          ·
          ${Math.round(
            day.protein
          )} g
        </span>
      </button>
    `;
  }

  /**
   * Bind day-selection controls.
   *
   * @param {HTMLElement} container
   * @param {object} timelineState
   */

  function bindTimelineEvents(
    container,
    timelineState
  ) {
    container
      .querySelectorAll(
        "[data-calendar-day]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const selectedDay =
              Number(
                button.dataset
                  .calendarDay
              );

            setSelectedButton(
              container,
              selectedDay
            );

            document.dispatchEvent(
              new CustomEvent(
                "eleven:calendar-day-selected",
                {
                  detail: {
                    day:
                      selectedDay,

                    timelineState
                  }
                }
              )
            );
          }
        );
      });
  }

  /**
   * Update the selected button visually.
   *
   * @param {HTMLElement} container
   * @param {number} selectedDay
   */

  function setSelectedButton(
    container,
    selectedDay
  ) {
    container
      .querySelectorAll(
        "[data-calendar-day]"
      )
      .forEach((button) => {
        const isSelected =
          Number(
            button.dataset
              .calendarDay
          ) === selectedDay;

        button.classList.toggle(
          "is-selected",
          isSelected
        );

        button.setAttribute(
          "aria-selected",
          String(isSelected)
        );
      });
  }

  /**
   * Determine which day should initially be selected.
   *
   * @param {object} context
   * @returns {number}
   */

  function resolveSelectedDay(context) {
    const {
      days,
      requestedDay,
      completedDayNumbers
    } = context;

    const validDayNumbers =
      days.map((day) =>
        Number(day.day)
      );

    const numericRequestedDay =
      Number(requestedDay);

    if (
      validDayNumbers.includes(
        numericRequestedDay
      )
    ) {
      return numericRequestedDay;
    }

    return resolveCurrentDay({
      days,
      completedDayNumbers
    });
  }

  /**
   * Determine the current cycle day.
   *
   * Current day is the first incomplete day.
   *
   * @param {object} context
   * @returns {number}
   */

  function resolveCurrentDay(context) {
    const {
      days,
      completedDayNumbers
    } = context;

    const firstIncomplete =
      days.find(
        (day) =>
          !completedDayNumbers.includes(
            Number(day.day)
          )
      );

    if (firstIncomplete) {
      return Number(
        firstIncomplete.day
      );
    }

    return Number(
      days.at(-1)?.day || 1
    );
  }

  /**
   * Normalize completed day values.
   *
   * @param {object} mealPlan
   * @returns {number[]}
   */

  function getCompletedDayNumbers(
    mealPlan
  ) {
    const values =
      Array.isArray(
        mealPlan.completedDays
      )
        ? mealPlan.completedDays
        : [];

    return [
      ...new Set(
        values
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
   * Get the visual status icon.
   *
   * @param {object} day
   * @returns {string}
   */

  function getStatusIcon(day) {
    if (day.completed) {
      return "✓";
    }

    if (day.isCurrent) {
      return "●";
    }

    return day.dayNumber;
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
   * Create a failure result.
   *
   * @param {string} message
   * @returns {object}
   */

  function createFailureResult(
    message
  ) {
    return {
      success: false,
      errors: [message],
      state: null
    };
  }

  /**
   * Utility functions.
   */

  function toFiniteNumber(value) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
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

  return {
    render,
    createTimelineState,
    getCompletedDayNumbers,
    resolveCurrentDay
  };
})();
