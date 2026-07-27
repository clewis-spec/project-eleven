"use strict";

/**
 * Eleven calendar day card
 *
 * Responsibilities:
 *
 * - Render one selected cycle day
 * - Display daily nutrition and target alignment
 * - Display all meals in meal order
 * - Display ingredients, instructions, and preparation details
 * - Support expandable meal details
 * - Emit a day-completion toggle event
 *
 * This module does not save completion state directly.
 * The calendar controller will handle storage and refreshes.
 */

window.ELEVEN_CALENDAR_DAY_CARD = (() => {
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

  const MEAL_ICONS = {
    breakfast: "🥣",
    lunch: "🥗",
    dinner: "🍽️",
    snack: "🥤"
  };

  /**
   * Render a selected day.
   *
   * @param {HTMLElement} container
   * @param {object} mealPlan
   * @param {number} dayNumber
   * @param {object} options
   * @returns {object}
   */

  function render(
    container,
    mealPlan,
    dayNumber,
    options = {}
  ) {
    if (!(container instanceof HTMLElement)) {
      return createFailureResult(
        "A valid day-card container is required."
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

    const day =
      findPlanDay(
        mealPlan,
        dayNumber
      );

    if (!day) {
      container.innerHTML =
        createMissingDayHtml(
          dayNumber
        );

      return createFailureResult(
        `Day ${dayNumber} could not be found in the current plan.`
      );
    }

    const dayState =
      createDayState(
        mealPlan,
        day,
        options
      );

    container.innerHTML =
      createDayCardHtml(
        dayState
      );

    bindDayCardEvents(
      container,
      dayState
    );

    return {
      success: true,
      errors: [],
      state: dayState
    };
  }

  /**
   * Create normalized state for a selected day.
   *
   * @param {object} mealPlan
   * @param {object} day
   * @param {object} options
   * @returns {object}
   */

  function createDayState(
    mealPlan,
    day,
    options = {}
  ) {
    const dayNumber =
      Number(day.day);

    const completedDayNumbers =
      getCompletedDayNumbers(
        mealPlan
      );

    const meals =
      sortMeals(
        Array.isArray(day.meals)
          ? day.meals
          : []
      );

    const macros =
      normalizeMacros(
        day.macros
      );

    const targets =
      normalizeMacros(
        day.targets
      );

    const alignment =
      createNutritionAlignment({
        macros,
        targets
      });

    return {
      dayNumber,

      completed:
        completedDayNumbers.includes(
          dayNumber
        ),

      meals,

      mealCount:
        meals.length,

      macros,
      targets,
      alignment,

      planningNotes:
        Array.isArray(
          day.planningNotes
        )
          ? [...day.planningNotes]
          : [],

      showSelectionReasons:
        options
          .showSelectionReasons !==
        false,

      planName:
        mealPlan.name ||
        "Eleven 11-Day Cycle"
    };
  }

  /**
   * Create the selected-day HTML.
   *
   * @param {object} state
   * @returns {string}
   */

  function createDayCardHtml(
    state
  ) {
    return `
      <section
        class="calendar-day-detail ${
          state.completed
            ? "is-completed"
            : ""
        }"
        data-calendar-detail-day="${state.dayNumber}"
      >
        ${createDayHeaderHtml(
          state
        )}

        ${createDayNutritionHtml(
          state
        )}

        ${
          state.planningNotes.length > 0
            ? createPlanningNotesHtml(
                state.planningNotes
              )
            : ""
        }

        <div class="calendar-day-meals">
          ${state.meals
            .map((meal) =>
              createMealCardHtml(
                meal,
                state
              )
            )
            .join("")}
        </div>

        ${createDayFooterHtml(
          state
        )}
      </section>
    `;
  }

  /**
   * Create the selected-day heading.
   *
   * @param {object} state
   * @returns {string}
   */

  function createDayHeaderHtml(
    state
  ) {
    return `
      <header class="calendar-day-detail-header">
        <div>
          <p class="eyebrow">
            ${escapeHtml(
              state.planName
            )}
          </p>

          <h2>
            Day ${state.dayNumber}
          </h2>

          <p>
            ${state.mealCount}
            planned meal${
              state.mealCount === 1
                ? ""
                : "s"
            }
            with approximately
            ${formatCalories(
              state.macros.calories
            )}
            and
            ${formatMacro(
              state.macros.protein
            )}
            of protein.
          </p>
        </div>

        <div class="calendar-day-status">
          <span
            class="${
              state.completed
                ? "is-complete"
                : "is-ready"
            }"
          >
            ${
              state.completed
                ? "Completed"
                : "Ready"
            }
          </span>

          <strong>
            ${state.dayNumber}
          </strong>
        </div>
      </header>
    `;
  }

  /**
   * Create the daily macro summary.
   *
   * @param {object} state
   * @returns {string}
   */

  function createDayNutritionHtml(
    state
  ) {
    const nutritionCards = [
      {
        label: "Calories",
        value:
          formatCalories(
            state.macros.calories
          ),
        target:
          state.targets.calories,
        difference:
          state.alignment
            .caloriesDifference,
        unit: "kcal"
      },

      {
        label: "Protein",
        value:
          formatMacro(
            state.macros.protein
          ),
        target:
          state.targets.protein,
        difference:
          state.alignment
            .proteinDifference,
        unit: "g"
      },

      {
        label: "Carbohydrates",
        value:
          formatMacro(
            state.macros
              .carbohydrates
          ),
        target:
          state.targets
            .carbohydrates,
        difference:
          state.alignment
            .carbohydratesDifference,
        unit: "g"
      },

      {
        label: "Fat",
        value:
          formatMacro(
            state.macros.fat
          ),
        target:
          state.targets.fat,
        difference:
          state.alignment
            .fatDifference,
        unit: "g"
      },

      {
        label: "Fibre",
        value:
          formatMacro(
            state.macros.fibre
          ),
        target:
          state.targets.fibre,
        difference:
          state.alignment
            .fibreDifference,
        unit: "g"
      }
    ];

    return `
      <section class="calendar-day-nutrition">
        ${nutritionCards
          .map(
            createNutritionMetricHtml
          )
          .join("")}
      </section>
    `;
  }

  /**
   * Create one nutrition metric.
   *
   * @param {object} metric
   * @returns {string}
   */

  function createNutritionMetricHtml(
    metric
  ) {
    const targetLabel =
      metric.target > 0
        ? `Target ${formatNumber(
            metric.target
          )} ${metric.unit}`
        : "No target set";

    const differenceLabel =
      metric.target > 0
        ? createDifferenceLabel(
            metric.difference,
            metric.unit
          )
        : "Plan value";

    return `
      <article class="calendar-nutrition-metric">
        <span>
          ${escapeHtml(
            metric.label
          )}
        </span>

        <strong>
          ${escapeHtml(
            metric.value
          )}
        </strong>

        <small>
          ${escapeHtml(
            targetLabel
          )}
        </small>

        <p class="${
          Math.abs(
            metric.difference
          ) <= 5
            ? "is-aligned"
            : ""
        }">
          ${escapeHtml(
            differenceLabel
          )}
        </p>
      </article>
    `;
  }

  /**
   * Create planning notes.
   *
   * @param {string[]} notes
   * @returns {string}
   */

  function createPlanningNotesHtml(
    notes
  ) {
    return `
      <section class="calendar-planning-notes">
        <div>
          <span>
            ✦
          </span>

          <div>
            <p class="eyebrow">
              Eleven planning notes
            </p>

            <ul>
              ${notes
                .map(
                  (note) => `
                    <li>
                      ${escapeHtml(
                        note
                      )}
                    </li>
                  `
                )
                .join("")}
            </ul>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Create a meal card.
   *
   * @param {object} meal
   * @param {object} dayState
   * @returns {string}
   */

  function createMealCardHtml(
    meal,
    dayState
  ) {
    const mealType =
      meal.mealType ||
      "meal";

    const mealLabel =
      MEAL_LABELS[
        mealType
      ] ||
      capitalize(mealType);

    const icon =
      meal.icon ||
      MEAL_ICONS[
        mealType
      ] ||
      "🍽️";

    const ingredients =
      Array.isArray(
        meal.ingredients
      )
        ? meal.ingredients
        : [];

    const instructions =
      Array.isArray(
        meal.instructions
      )
        ? meal.instructions
        : [];

    const reasons =
      Array.isArray(
        meal.reasons
      )
        ? meal.reasons
        : [];

    const macros =
      normalizeMacros(
        meal.macros
      );

    return `
      <article
        class="calendar-meal-card"
        data-calendar-meal="${escapeHtml(
          mealType
        )}"
      >
        <div class="calendar-meal-card-header">
          <div class="calendar-meal-title">
            <span class="calendar-meal-icon">
              ${escapeHtml(icon)}
            </span>

            <div>
              <small>
                ${escapeHtml(
                  mealLabel
                )}
              </small>

              <h3>
                ${escapeHtml(
                  meal.name ||
                  "Planned meal"
                )}
              </h3>
            </div>
          </div>

          <div class="calendar-meal-badges">
            ${
              meal
                .preparationTimeMinutes
                ? `
                  <span>
                    ⏱
                    ${formatNumber(
                      meal
                        .preparationTimeMinutes
                    )}
                    min
                  </span>
                `
                : ""
            }

            ${
              meal.mealPrepFriendly
                ? `
                  <span class="is-meal-prep">
                    Meal-prep friendly
                  </span>
                `
                : ""
            }
          </div>
        </div>

        ${
          meal.description
            ? `
              <p class="calendar-meal-description">
                ${escapeHtml(
                  meal.description
                )}
              </p>
            `
            : ""
        }

        <div class="calendar-meal-macro-grid">
          <span>
            <strong>
              ${formatCalories(
                macros.calories
              )}
            </strong>
            Calories
          </span>

          <span>
            <strong>
              ${formatMacro(
                macros.protein
              )}
            </strong>
            Protein
          </span>

          <span>
            <strong>
              ${formatMacro(
                macros
                  .carbohydrates
              )}
            </strong>
            Carbs
          </span>

          <span>
            <strong>
              ${formatMacro(
                macros.fat
              )}
            </strong>
            Fat
          </span>
        </div>

        <details class="calendar-meal-details">
          <summary>
            View meal details
          </summary>

          <div class="calendar-meal-details-content">
            ${createIngredientSectionHtml(
              ingredients
            )}

            ${
              instructions.length > 0
                ? createInstructionSectionHtml(
                    instructions
                  )
                : ""
            }

            ${
              dayState
                .showSelectionReasons &&
              reasons.length > 0
                ? createReasonSectionHtml(
                    reasons
                  )
                : ""
            }
          </div>
        </details>
      </article>
    `;
  }

  /**
   * Create the ingredient section.
   *
   * @param {object[]} ingredients
   * @returns {string}
   */

  function createIngredientSectionHtml(
    ingredients
  ) {
    if (ingredients.length === 0) {
      return `
        <section class="calendar-meal-detail-section">
          <h4>
            Ingredients
          </h4>

          <p>
            Ingredient details are unavailable for this meal.
          </p>
        </section>
      `;
    }

    return `
      <section class="calendar-meal-detail-section">
        <h4>
          Ingredients
        </h4>

        <ul class="calendar-ingredient-list">
          ${ingredients
            .map(
              (ingredient) => `
                <li>
                  <div>
                    <strong>
                      ${escapeHtml(
                        ingredient.name ||
                        getFoodName(
                          ingredient.foodId
                        )
                      )}
                    </strong>

                    ${
                      ingredient.brand
                        ? `
                          <small>
                            ${escapeHtml(
                              ingredient.brand
                            )}
                          </small>
                        `
                        : ""
                    }
                  </div>

                  <span>
                    ${escapeHtml(
                      createIngredientQuantityLabel(
                        ingredient
                      )
                    )}
                  </span>
                </li>
              `
            )
            .join("")}
        </ul>
      </section>
    `;
  }

  /**
   * Create preparation instructions.
   *
   * @param {string[]} instructions
   * @returns {string}
   */

  function createInstructionSectionHtml(
    instructions
  ) {
    return `
      <section class="calendar-meal-detail-section">
        <h4>
          Preparation
        </h4>

        <ol class="calendar-instruction-list">
          ${instructions
            .map(
              (instruction) => `
                <li>
                  ${escapeHtml(
                    instruction
                  )}
                </li>
              `
            )
            .join("")}
        </ol>
      </section>
    `;
  }

  /**
   * Create planner selection reasons.
   *
   * @param {string[]} reasons
   * @returns {string}
   */

  function createReasonSectionHtml(
    reasons
  ) {
    return `
      <section class="calendar-meal-detail-section calendar-meal-reasons">
        <h4>
          Why Eleven selected this meal
        </h4>

        <ul>
          ${reasons
            .slice(0, 4)
            .map(
              (reason) => `
                <li>
                  <span>
                    ✓
                  </span>

                  ${escapeHtml(
                    reason
                  )}
                </li>
              `
            )
            .join("")}
        </ul>
      </section>
    `;
  }

  /**
   * Create completion controls.
   *
   * @param {object} state
   * @returns {string}
   */

  function createDayFooterHtml(
    state
  ) {
    return `
      <footer class="calendar-day-detail-footer">
        <div>
          <strong>
            ${
              state.completed
                ? `Day ${state.dayNumber} is complete`
                : `Ready to complete Day ${state.dayNumber}?`
            }
          </strong>

          <p>
            ${
              state.completed
                ? "This day is included in your current cycle progress."
                : "Mark the day complete after finishing your planned meals."
            }
          </p>
        </div>

        <button
          type="button"
          class="button ${
            state.completed
              ? "button-secondary"
              : ""
          }"
          data-calendar-toggle-complete="${state.dayNumber}"
          aria-pressed="${
            state.completed
              ? "true"
              : "false"
          }"
        >
          ${
            state.completed
              ? "Mark as incomplete"
              : "Complete this day"
          }
        </button>
      </footer>
    `;
  }

  /**
   * Bind selected-day interactions.
   *
   * @param {HTMLElement} container
   * @param {object} dayState
   */

  function bindDayCardEvents(
    container,
    dayState
  ) {
    const completionButton =
      container.querySelector(
        "[data-calendar-toggle-complete]"
      );

    completionButton
      ?.addEventListener(
        "click",
        () => {
          document.dispatchEvent(
            new CustomEvent(
              "eleven:calendar-day-completion-requested",
              {
                detail: {
                  day:
                    dayState
                      .dayNumber,

                  completed:
                    !dayState
                      .completed
                }
              }
            )
          );
        }
      );
  }

  /**
   * Sort meals by standard meal order.
   *
   * @param {object[]} meals
   * @returns {object[]}
   */

  function sortMeals(meals) {
    return [...meals].sort(
      (first, second) => {
        const firstIndex =
          MEAL_ORDER.indexOf(
            first.mealType
          );

        const secondIndex =
          MEAL_ORDER.indexOf(
            second.mealType
          );

        return (
          normalizeSortIndex(
            firstIndex
          ) -
          normalizeSortIndex(
            secondIndex
          )
        );
      }
    );
  }

  /**
   * Create nutrition-target alignment.
   *
   * @param {object} context
   * @returns {object}
   */

  function createNutritionAlignment(
    context
  ) {
    const {
      macros,
      targets
    } = context;

    return {
      caloriesDifference:
        macros.calories -
        targets.calories,

      proteinDifference:
        macros.protein -
        targets.protein,

      carbohydratesDifference:
        macros
          .carbohydrates -
        targets
          .carbohydrates,

      fatDifference:
        macros.fat -
        targets.fat,

      fibreDifference:
        macros.fibre -
        targets.fibre
    };
  }

  /**
   * Find one day in a plan.
   *
   * @param {object} mealPlan
   * @param {number} dayNumber
   * @returns {object|null}
   */

  function findPlanDay(
    mealPlan,
    dayNumber
  ) {
    return (
      mealPlan.days.find(
        (day) =>
          Number(day.day) ===
          Number(dayNumber)
      ) ||
      null
    );
  }

  /**
   * Get normalized completed day numbers.
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
              ? Number(value.day)
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
    ];
  }

  /**
   * Create ingredient quantity label.
   *
   * @param {object} ingredient
   * @returns {string}
   */

  function createIngredientQuantityLabel(
    ingredient
  ) {
    if (
      ingredient
        .displayQuantity
    ) {
      return ingredient
        .displayQuantity;
    }

    const quantity =
      toFiniteNumber(
        ingredient.quantity
      );

    const servingDescription =
      ingredient
        .servingDescription ||
      "serving";

    const servingGrams =
      toFiniteNumber(
        ingredient.servingGrams
      );

    if (
      servingGrams > 0 &&
      quantity > 0
    ) {
      return `${formatNumber(
        servingGrams *
          quantity
      )} g`;
    }

    if (quantity === 1) {
      return servingDescription;
    }

    return `${formatNumber(
      quantity
    )} × ${servingDescription}`;
  }

  /**
   * Return a food name from the food database.
   *
   * @param {string} foodId
   * @returns {string}
   */

  function getFoodName(foodId) {
    if (
      typeof window
        .getElevenFoodById ===
      "function"
    ) {
      return (
        window
          .getElevenFoodById(
            foodId
          )?.name ||
        "Ingredient"
      );
    }

    return "Ingredient";
  }

  /**
   * Create a difference label.
   *
   * @param {number} difference
   * @param {string} unit
   * @returns {string}
   */

  function createDifferenceLabel(
    difference,
    unit
  ) {
    const value =
      toFiniteNumber(
        difference
      );

    if (Math.abs(value) < 1) {
      return "On target";
    }

    return `${value > 0 ? "+" : ""}${formatNumber(
      value
    )} ${unit}`;
  }

  /**
   * Normalize macro values.
   *
   * @param {object} macros
   * @returns {object}
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
   * Validate plan structure.
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
   * Create missing-day message.
   *
   * @param {number} dayNumber
   * @returns {string}
   */

  function createMissingDayHtml(
    dayNumber
  ) {
    return `
      <section class="calendar-day-missing">
        <span>
          !
        </span>

        <h2>
          Day ${escapeHtml(
            dayNumber
          )} is unavailable
        </h2>

        <p>
          Select another day from the cycle timeline.
        </p>
      </section>
    `;
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
      errors: [message],
      state: null
    };
  }

  /**
   * Utility functions.
   */

  function normalizeSortIndex(
    index
  ) {
    return index === -1
      ? Number.MAX_SAFE_INTEGER
      : index;
  }

  function formatCalories(value) {
    return `${Math.round(
      toFiniteNumber(value)
    ).toLocaleString(
      "en-CA"
    )} kcal`;
  }

  function formatMacro(value) {
    return `${formatNumber(
      value
    )} g`;
  }

  function formatNumber(value) {
    return toFiniteNumber(
      value
    ).toLocaleString(
      "en-CA",
      {
        maximumFractionDigits: 1
      }
    );
  }

  function toFiniteNumber(value) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function capitalize(value) {
    const text =
      String(value || "");

    return text
      ? text.charAt(0)
          .toUpperCase() +
          text.slice(1)
      : "";
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
    createDayState,
    findPlanDay,
    sortMeals,
    createNutritionAlignment
  };
})();
