"use strict";

/**
 * Eleven grocery-list interface
 *
 * Responsibilities:
 *
 * - Create the Shopping List screen
 * - Generate a grocery list from the saved meal plan
 * - Restore the most recently generated list
 * - Group grocery items by department
 * - Track checked shopping items
 * - Allow likely pantry items to be shown or hidden
 * - Display shopping efficiency and estimated leftovers
 * - Refresh when the meal plan or grocery list changes
 */

window.ELEVEN_GROCERY = (() => {
  const STORAGE_KEYS = {
    groceryList:
      "eleven.groceryList",

    checkedItems:
      "eleven.groceryCheckedItems",

    settings:
      "eleven.grocerySettings"
  };

  const DEFAULT_SETTINGS = {
    hidePantryItems: false,
    hideCompletedItems: false
  };

  let initialized = false;
  let grocerySection = null;
  let groceryRoot = null;
  let currentGroceryList = null;
  let checkedItemIds = new Set();
  let settings = {
    ...DEFAULT_SETTINGS
  };

  /**
   * Initialize the grocery-list interface.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      refresh();
      return true;
    }

    grocerySection =
      findGrocerySection();

    if (!grocerySection) {
      console.warn(
        "Eleven could not find the Shopping List section."
      );

      return false;
    }

    if (
      !window.ELEVEN_GROCERY_OPTIMIZER
    ) {
      console.error(
        "The Eleven grocery optimizer is unavailable."
      );

      return false;
    }

    createGroceryRoot();
    loadSettings();
    loadCheckedItems();
    bindGlobalEvents();
    refresh();

    initialized = true;

    return true;
  }

  /**
   * Find the existing shopping-list section.
   *
   * This supports several possible IDs so the controller remains
   * compatible if the navigation label has changed.
   *
   * @returns {HTMLElement|null}
   */

  function findGrocerySection() {
    const possibleIds = [
      "shopping-list",
      "grocery-list",
      "groceries",
      "shopping"
    ];

    for (
      const sectionId of
      possibleIds
    ) {
      const section =
        document.getElementById(
          sectionId
        );

      if (section) {
        return section;
      }
    }

    return null;
  }

  /**
   * Create the grocery application root.
   */

  function createGroceryRoot() {
    groceryRoot =
      document.getElementById(
        "eleven-grocery-root"
      );

    if (groceryRoot) {
      return;
    }

    groceryRoot =
      document.createElement("div");

    groceryRoot.id =
      "eleven-grocery-root";

    groceryRoot.className =
      "eleven-grocery-root";

    Array.from(
      grocerySection.children
    ).forEach((child) => {
      child.hidden = true;
      child.dataset
        .elevenLegacyGrocery =
        "true";
    });

    grocerySection.appendChild(
      groceryRoot
    );
  }

  /**
   * Bind document-level data events.
   */

  function bindGlobalEvents() {
    document.addEventListener(
      "eleven:meal-plan-updated",
      handleMealPlanUpdated
    );

    document.addEventListener(
      "eleven:grocery-list-updated",
      (event) => {
        currentGroceryList =
          event.detail
            ?.groceryList ||
          loadSavedGroceryList();

        synchronizeCheckedItems();
        render();
      }
    );

    window.addEventListener(
      "storage",
      handleStorageEvent
    );
  }

  /**
   * Refresh all grocery data and UI.
   */

  function refresh() {
    currentGroceryList =
      loadSavedGroceryList();

    synchronizeCheckedItems();
    render();
  }

  /**
   * Regenerate after the meal plan changes.
   */

  function handleMealPlanUpdated() {
    currentGroceryList = null;
    checkedItemIds.clear();

    saveCheckedItems();

    render();
  }

  /**
   * Respond to cross-tab storage changes.
   *
   * @param {StorageEvent} event
   */

  function handleStorageEvent(event) {
    if (
      event.key ===
      STORAGE_KEYS.groceryList
    ) {
      currentGroceryList =
        loadSavedGroceryList();

      synchronizeCheckedItems();
      render();
    }

    if (
      event.key ===
      STORAGE_KEYS.checkedItems
    ) {
      loadCheckedItems();
      render();
    }

    if (
      event.key ===
      STORAGE_KEYS.settings
    ) {
      loadSettings();
      render();
    }
  }

  /**
   * Render the correct screen state.
   */

  function render() {
    if (!groceryRoot) {
      return;
    }

    const mealPlan =
      getSavedMealPlan();

    if (!mealPlan) {
      renderNoPlanState();
      return;
    }

    if (!currentGroceryList) {
      renderReadyState(
        mealPlan
      );
      return;
    }

    renderGroceryList(
      currentGroceryList
    );
  }

  /**
   * Render the state shown before a meal plan exists.
   */

  function renderNoPlanState() {
    groceryRoot.innerHTML = `
      <section class="grocery-empty-state">
        <div class="grocery-empty-icon">
          🛒
        </div>

        <p class="eyebrow">
          Shopping List
        </p>

        <h1>
          Generate a meal plan first
        </h1>

        <p>
          Eleven creates your grocery list from the actual ingredients
          and portions used throughout your optimized nutrition cycle.
        </p>

        <button
          type="button"
          class="button"
          data-grocery-target="meal-plan"
        >
          Open meal planner
        </button>
      </section>
    `;

    bindNavigationActions();
  }

  /**
   * Render the state shown when a plan exists but the grocery list
   * has not yet been generated.
   *
   * @param {object} mealPlan
   */

  function renderReadyState(
    mealPlan
  ) {
    const totalMeals =
      countPlanMeals(
        mealPlan
      );

    groceryRoot.innerHTML = `
      <section class="grocery-ready-card">
        <div class="grocery-ready-content">
          <p class="eyebrow">
            Grocery Optimizer
          </p>

          <h1>
            Your plan is ready for shopping
          </h1>

          <p>
            Eleven will consolidate all ${totalMeals} meals in your
            ${mealPlan.days.length}-day cycle, combine duplicate
            ingredients, estimate practical purchase quantities,
            and identify likely leftovers.
          </p>

          <div class="grocery-ready-highlights">
            <span>
              <strong>
                ${mealPlan.days.length}
              </strong>
              plan days
            </span>

            <span>
              <strong>
                ${totalMeals}
              </strong>
              meals
            </span>

            <span>
              <strong>
                ${escapeHtml(
                  mealPlan.rating ||
                  "Optimized"
                )}
              </strong>
              plan quality
            </span>
          </div>

          <button
            type="button"
            class="button"
            id="generate-grocery-list-button"
          >
            Build shopping list
          </button>
        </div>

        <div class="grocery-ready-visual">
          <span>
            🛍️
          </span>

          <strong>
            Consolidate
          </strong>

          <small>
            Optimize quantities
          </small>
        </div>
      </section>
    `;

    document
      .getElementById(
        "generate-grocery-list-button"
      )
      ?.addEventListener(
        "click",
        generateGroceryList
      );
  }

  /**
   * Generate and save the grocery list.
   */

  function generateGroceryList() {
    const button =
      document.getElementById(
        "generate-grocery-list-button"
      );

    if (button) {
      button.disabled = true;
      button.textContent =
        "Optimizing shopping list…";
    }

    window.setTimeout(() => {
      const result =
        window
          .ELEVEN_GROCERY_OPTIMIZER
          .generateFromSavedPlan({
            includePantryItems:
              true
          });

      if (
        !result.success ||
        !result.groceryList
      ) {
        renderErrorState(
          result.errors?.[0] ||
          "Eleven could not generate the grocery list."
        );

        return;
      }

      currentGroceryList =
        result.groceryList;

      checkedItemIds.clear();
      saveCheckedItems();
      render();
    }, 50);
  }

  /**
   * Render a generated grocery list.
   *
   * @param {object} groceryList
   */

  function renderGroceryList(
    groceryList
  ) {
    const visibleDepartments =
      createVisibleDepartments(
        groceryList
      );

    const completion =
      calculateCompletion(
        groceryList.items
      );

    groceryRoot.innerHTML = `
      ${createGroceryHeroHtml({
        groceryList,
        completion
      })}

      ${createGroceryControlsHtml({
        groceryList,
        completion
      })}

      <div class="grocery-layout">
        <main class="grocery-departments">
          ${
            visibleDepartments.length > 0
              ? visibleDepartments
                  .map(
                    createDepartmentHtml
                  )
                  .join("")
              : createNoVisibleItemsHtml()
          }
        </main>

        <aside class="grocery-sidebar">
          ${createShoppingSummaryHtml(
            groceryList
          )}

          ${createWasteSummaryHtml(
            groceryList
          )}

          ${createDecisionLogHtml(
            groceryList
          )}
        </aside>
      </div>
    `;

    bindGroceryActions();
  }

  /**
   * Create the grocery hero.
   *
   * @param {object} context
   * @returns {string}
   */

  function createGroceryHeroHtml(
    context
  ) {
    const {
      groceryList,
      completion
    } = context;

    const score =
      toFiniteNumber(
        groceryList.metrics
          ?.shoppingEfficiencyScore
      );

    return `
      <section class="grocery-hero">
        <div class="grocery-hero-content">
          <p class="grocery-hero-kicker">
            Eleven Grocery Optimizer
          </p>

          <h1>
            Your shopping list is ready.
          </h1>

          <p>
            ${groceryList.metrics.uniqueItemCount} items have been
            consolidated across ${groceryList.metrics.departmentCount}
            grocery departments for your
            ${groceryList.cycleLengthDays}-day cycle.
          </p>

          <div class="grocery-hero-progress">
            <div>
              <strong>
                ${completion.checkedCount}
              </strong>

              <span>
                checked
              </span>
            </div>

            <div class="grocery-completion-track">
              <span
                style="width: ${completion.percentage}%"
              ></span>
            </div>

            <div>
              <strong>
                ${completion.remainingCount}
              </strong>

              <span>
                remaining
              </span>
            </div>
          </div>
        </div>

        <div class="grocery-score-card">
          <strong>
            ${score.toFixed(1)}
          </strong>

          <span>
            Shopping score
          </span>

          <small>
            ${escapeHtml(
              groceryList.metrics
                ?.rating ||
              "Optimized"
            )}
          </small>
        </div>
      </section>
    `;
  }

  /**
   * Create toolbar controls.
   *
   * @param {object} context
   * @returns {string}
   */

  function createGroceryControlsHtml(
    context
  ) {
    const {
      groceryList,
      completion
    } = context;

    return `
      <section class="grocery-toolbar">
        <div class="grocery-toolbar-summary">
          <strong>
            ${completion.percentage}% complete
          </strong>

          <span>
            ${completion.remainingCount} item${
              completion.remainingCount === 1
                ? ""
                : "s"
            } left to shop
          </span>
        </div>

        <div class="grocery-toolbar-actions">
          <label class="grocery-toggle">
            <input
              type="checkbox"
              id="hide-pantry-items-toggle"
              ${
                settings.hidePantryItems
                  ? "checked"
                  : ""
              }
            >

            <span>
              Hide pantry items
            </span>
          </label>

          <label class="grocery-toggle">
            <input
              type="checkbox"
              id="hide-completed-items-toggle"
              ${
                settings.hideCompletedItems
                  ? "checked"
                  : ""
              }
            >

            <span>
              Hide checked items
            </span>
          </label>

          <button
            type="button"
            class="button button-secondary"
            id="clear-grocery-checks-button"
            ${
              completion.checkedCount === 0
                ? "disabled"
                : ""
            }
          >
            Clear checks
          </button>

          <button
            type="button"
            class="button"
            id="regenerate-grocery-list-button"
          >
            Rebuild list
          </button>
        </div>
      </section>
    `;
  }

  /**
   * Return departments after applying current display filters.
   *
   * @param {object} groceryList
   * @returns {object[]}
   */

  function createVisibleDepartments(
    groceryList
  ) {
    return groceryList.departments
      .map((department) => {
        const items =
          department.items.filter(
            (item) => {
              if (
                settings.hidePantryItems &&
                item.isLikelyPantryItem
              ) {
                return false;
              }

              if (
                settings.hideCompletedItems &&
                checkedItemIds.has(
                  item.foodId
                )
              ) {
                return false;
              }

              return true;
            }
          );

        return {
          ...department,
          items,
          itemCount:
            items.length
        };
      })
      .filter(
        (department) =>
          department.items.length >
          0
      );
  }

  /**
   * Create one grocery department.
   *
   * @param {object} department
   * @returns {string}
   */

  function createDepartmentHtml(
    department
  ) {
    const completedCount =
      department.items.filter(
        (item) =>
          checkedItemIds.has(
            item.foodId
          )
      ).length;

    return `
      <section
        class="grocery-department-card"
        data-department-id="${escapeHtml(
          department.id
        )}"
      >
        <div class="grocery-department-header">
          <div>
            <span class="grocery-department-icon">
              ${getDepartmentIcon(
                department.id
              )}
            </span>

            <div>
              <p class="eyebrow">
                Grocery department
              </p>

              <h2>
                ${escapeHtml(
                  department.name
                )}
              </h2>
            </div>
          </div>

          <span class="grocery-department-count">
            ${completedCount} / ${department.itemCount}
          </span>
        </div>

        <div class="grocery-item-list">
          ${department.items
            .map(
              createGroceryItemHtml
            )
            .join("")}
        </div>
      </section>
    `;
  }

  /**
   * Create one grocery item row.
   *
   * @param {object} item
   * @returns {string}
   */

  function createGroceryItemHtml(
    item
  ) {
    const checked =
      checkedItemIds.has(
        item.foodId
      );

    const useLabel =
      `${item.useCount} meal${
        item.useCount === 1
          ? ""
          : "s"
      }`;

    const leftoverLabel =
      createLeftoverLabel(
        item
      );

    return `
      <article
        class="grocery-item ${
          checked
            ? "is-checked"
            : ""
        }"
        data-grocery-item="${escapeHtml(
          item.foodId
        )}"
      >
        <label class="grocery-item-check">
          <input
            type="checkbox"
            data-grocery-checkbox="${escapeHtml(
              item.foodId
            )}"
            ${
              checked
                ? "checked"
                : ""
            }
          >

          <span aria-hidden="true">
            ✓
          </span>
        </label>

        <div class="grocery-item-content">
          <div class="grocery-item-heading">
            <div>
              <h3>
                ${escapeHtml(
                  item.name
                )}
              </h3>

              ${
                item.brand
                  ? `
                    <p>
                      ${escapeHtml(
                        item.brand
                      )}
                    </p>
                  `
                  : ""
              }
            </div>

            <strong>
              ${escapeHtml(
                item.purchaseRecommendation ||
                ""
              )}
            </strong>
          </div>

          <div class="grocery-item-metadata">
            <span>
              Required:
              ${escapeHtml(
                createRequiredQuantityLabel(
                  item
                )
              )}
            </span>

            <span>
              Used in ${useLabel}
            </span>

            ${
              item.isLikelyPantryItem
                ? `
                  <span class="is-pantry">
                    Check pantry first
                  </span>
                `
                : ""
            }

            ${
              leftoverLabel
                ? `
                  <span>
                    ${escapeHtml(
                      leftoverLabel
                    )}
                  </span>
                `
                : ""
            }
          </div>

          <details class="grocery-item-uses">
            <summary>
              View planned uses
            </summary>

            <ul>
              ${item.uses
                .map(
                  (use) => `
                    <li>
                      <span>
                        Day ${use.day} ·
                        ${escapeHtml(
                          capitalize(
                            use.mealType
                          )
                        )}
                      </span>

                      <strong>
                        ${escapeHtml(
                          use.mealName ||
                          "Planned meal"
                        )}
                      </strong>
                    </li>
                  `
                )
                .join("")}
            </ul>
          </details>
        </div>
      </article>
    `;
  }

  /**
   * Create the summary sidebar card.
   *
   * @param {object} groceryList
   * @returns {string}
   */

  function createShoppingSummaryHtml(
    groceryList
  ) {
    const metrics =
      groceryList.metrics;

    return `
      <section class="grocery-summary-card">
        <p class="eyebrow">
          Shopping summary
        </p>

        <h2>
          Cycle requirements
        </h2>

        <div class="grocery-summary-stat-grid">
          <div>
            <span>
              Unique items
            </span>

            <strong>
              ${metrics.uniqueItemCount}
            </strong>
          </div>

          <div>
            <span>
              Departments
            </span>

            <strong>
              ${metrics.departmentCount}
            </strong>
          </div>

          <div>
            <span>
              Fresh items
            </span>

            <strong>
              ${metrics.freshItemCount}
            </strong>
          </div>

          <div>
            <span>
              Pantry items
            </span>

            <strong>
              ${metrics.pantryItemCount}
            </strong>
          </div>
        </div>

        <div class="grocery-reuse-stat">
          <span>
            Average ingredient reuse
          </span>

          <strong>
            ${formatNumber(
              metrics.averageUsesPerItem
            )} meals
          </strong>
        </div>
      </section>
    `;
  }

  /**
   * Create waste and leftover summary.
   *
   * @param {object} groceryList
   * @returns {string}
   */

  function createWasteSummaryHtml(
    groceryList
  ) {
    const metrics =
      groceryList.metrics;

    const highWasteItems =
      groceryList.items
        .filter(
          (item) =>
            item.wastePercentage >=
            20
        )
        .sort(
          (first, second) =>
            second.wastePercentage -
            first.wastePercentage
        )
        .slice(0, 4);

    return `
      <section class="grocery-summary-card">
        <p class="eyebrow">
          Package efficiency
        </p>

        <h2>
          Estimated leftovers
        </h2>

        <div class="grocery-waste-score">
          <strong>
            ${formatNumber(
              metrics
                .estimatedWastePercentage
            )}%
          </strong>

          <span>
            estimated package remainder
          </span>
        </div>

        <p class="grocery-summary-copy">
          Approximately
          ${formatWeight(
            metrics.totalLeftoverGrams
          )}
          may remain after completing this cycle.
        </p>

        ${
          highWasteItems.length > 0
            ? `
              <div class="grocery-leftover-list">
                ${highWasteItems
                  .map(
                    (item) => `
                      <div>
                        <span>
                          ${escapeHtml(
                            item.name
                          )}
                        </span>

                        <strong>
                          ${formatNumber(
                            item.wastePercentage
                          )}%
                        </strong>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `
              <p class="grocery-positive-message">
                Package quantities are closely aligned with the meal plan.
              </p>
            `
        }
      </section>
    `;
  }

  /**
   * Create the optimizer decision log.
   *
   * @param {object} groceryList
   * @returns {string}
   */

  function createDecisionLogHtml(
    groceryList
  ) {
    const entries =
      Array.isArray(
        groceryList.decisionLog
      )
        ? groceryList.decisionLog
        : [];

    return `
      <section class="grocery-summary-card">
        <p class="eyebrow">
          Eleven analysis
        </p>

        <h2>
          Why this list works
        </h2>

        <div class="grocery-decision-list">
          ${entries
            .slice(0, 4)
            .map(
              (entry) => `
                <article class="grocery-decision-item ${escapeHtml(
                  entry.type ||
                  "information"
                )}">
                  <span>
                    ${getDecisionIcon(
                      entry.type
                    )}
                  </span>

                  <div>
                    <strong>
                      ${escapeHtml(
                        entry.title
                      )}
                    </strong>

                    <p>
                      ${escapeHtml(
                        entry.message
                      )}
                    </p>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  /**
   * Create the state shown when filters hide every item.
   *
   * @returns {string}
   */

  function createNoVisibleItemsHtml() {
    return `
      <section class="grocery-filter-empty">
        <span>
          ✓
        </span>

        <h2>
          No visible items
        </h2>

        <p>
          Every item is either checked or hidden by your current
          shopping-list filters.
        </p>

        <button
          type="button"
          class="button button-secondary"
          id="reset-grocery-filters-button"
        >
          Reset filters
        </button>
      </section>
    `;
  }

  /**
   * Bind all controls created during grocery-list rendering.
   */

  function bindGroceryActions() {
    groceryRoot
      .querySelectorAll(
        "[data-grocery-checkbox]"
      )
      .forEach((checkbox) => {
        checkbox.addEventListener(
          "change",
          () => {
            toggleGroceryItem(
              checkbox.dataset
                .groceryCheckbox,
              checkbox.checked
            );
          }
        );
      });

    document
      .getElementById(
        "hide-pantry-items-toggle"
      )
      ?.addEventListener(
        "change",
        (event) => {
          settings.hidePantryItems =
            event.target.checked;

          saveSettings();
          render();
        }
      );

    document
      .getElementById(
        "hide-completed-items-toggle"
      )
      ?.addEventListener(
        "change",
        (event) => {
          settings
            .hideCompletedItems =
            event.target.checked;

          saveSettings();
          render();
        }
      );

    document
      .getElementById(
        "clear-grocery-checks-button"
      )
      ?.addEventListener(
        "click",
        clearCheckedItems
      );

    document
      .getElementById(
        "regenerate-grocery-list-button"
      )
      ?.addEventListener(
        "click",
        confirmRegenerate
      );

    document
      .getElementById(
        "reset-grocery-filters-button"
      )
      ?.addEventListener(
        "click",
        () => {
          settings = {
            ...DEFAULT_SETTINGS
          };

          saveSettings();
          render();
        }
      );
  }

  /**
   * Bind navigation actions in empty states.
   */

  function bindNavigationActions() {
    groceryRoot
      .querySelectorAll(
        "[data-grocery-target]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            navigateToSection(
              button.dataset
                .groceryTarget
            );
          }
        );
      });
  }

  /**
   * Mark or unmark a grocery item.
   *
   * @param {string} foodId
   * @param {boolean} checked
   */

  function toggleGroceryItem(
    foodId,
    checked
  ) {
    if (!foodId) {
      return;
    }

    if (checked) {
      checkedItemIds.add(
        foodId
      );
    } else {
      checkedItemIds.delete(
        foodId
      );
    }

    saveCheckedItems();
    render();

    document.dispatchEvent(
      new CustomEvent(
        "eleven:grocery-progress-updated",
        {
          detail: {
            checkedItemIds:
              Array.from(
                checkedItemIds
              )
          }
        }
      )
    );
  }

  /**
   * Clear all checked grocery items.
   */

  function clearCheckedItems() {
    checkedItemIds.clear();
    saveCheckedItems();
    render();
  }

  /**
   * Confirm and rebuild grocery quantities from the current plan.
   */

  function confirmRegenerate() {
    const confirmed =
      window.confirm(
        "Rebuild the shopping list from your current meal plan? Checked items will be cleared."
      );

    if (!confirmed) {
      return;
    }

    currentGroceryList = null;
    checkedItemIds.clear();

    saveCheckedItems();
    removeSavedGroceryList();
    renderReadyState(
      getSavedMealPlan()
    );
  }

  /**
   * Keep checked IDs aligned with the current grocery list.
   */

  function synchronizeCheckedItems() {
    if (
      !currentGroceryList ||
      !Array.isArray(
        currentGroceryList.items
      )
    ) {
      checkedItemIds.clear();
      return;
    }

    const validIds =
      new Set(
        currentGroceryList.items
          .map(
            (item) =>
              item.foodId
          )
          .filter(Boolean)
      );

    checkedItemIds =
      new Set(
        Array.from(
          checkedItemIds
        ).filter(
          (foodId) =>
            validIds.has(foodId)
        )
      );

    saveCheckedItems();
  }

  /**
   * Calculate shopping completion.
   *
   * @param {object[]} items
   * @returns {object}
   */

  function calculateCompletion(
    items
  ) {
    const totalCount =
      Array.isArray(items)
        ? items.length
        : 0;

    const checkedCount =
      items.filter(
        (item) =>
          checkedItemIds.has(
            item.foodId
          )
      ).length;

    return {
      totalCount,
      checkedCount,

      remainingCount:
        Math.max(
          0,
          totalCount -
            checkedCount
        ),

      percentage:
        totalCount > 0
          ? Math.round(
              checkedCount /
                totalCount *
                100
            )
          : 0
    };
  }

  /**
   * Load the saved grocery list.
   *
   * @returns {object|null}
   */

  function loadSavedGroceryList() {
    if (
      window.ELEVEN_STORAGE &&
      typeof window
        .ELEVEN_STORAGE
        .getGroceryList ===
        "function"
    ) {
      return window
        .ELEVEN_STORAGE
        .getGroceryList();
    }

    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEYS.groceryList
        );

      return stored
        ? JSON.parse(stored)
        : null;
    } catch (error) {
      console.error(
        "Eleven could not load the grocery list.",
        error
      );

      return null;
    }
  }

  /**
   * Remove the saved grocery list.
   */

  function removeSavedGroceryList() {
    if (
      window.ELEVEN_STORAGE &&
      typeof window
        .ELEVEN_STORAGE
        .clearGroceryList ===
        "function"
    ) {
      window.ELEVEN_STORAGE
        .clearGroceryList();

      return;
    }

    localStorage.removeItem(
      STORAGE_KEYS.groceryList
    );
  }

  /**
   * Load checked grocery items.
   */

  function loadCheckedItems() {
    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEYS.checkedItems
        );

      const values =
        stored
          ? JSON.parse(stored)
          : [];

      checkedItemIds =
        new Set(
          Array.isArray(values)
            ? values
            : []
        );
    } catch (error) {
      console.error(
        "Eleven could not load checked grocery items.",
        error
      );

      checkedItemIds =
        new Set();
    }
  }

  /**
   * Save checked grocery items.
   */

  function saveCheckedItems() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.checkedItems,
        JSON.stringify(
          Array.from(
            checkedItemIds
          )
        )
      );
    } catch (error) {
      console.error(
        "Eleven could not save checked grocery items.",
        error
      );
    }
  }

  /**
   * Load grocery display settings.
   */

  function loadSettings() {
    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEYS.settings
        );

      settings = stored
        ? {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(stored)
          }
        : {
            ...DEFAULT_SETTINGS
          };
    } catch (error) {
      settings = {
        ...DEFAULT_SETTINGS
      };
    }
  }

  /**
   * Save grocery display settings.
   */

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(
          settings
        )
      );
    } catch (error) {
      console.error(
        "Eleven could not save grocery settings.",
        error
      );
    }
  }

  /**
   * Render an error.
   *
   * @param {string} message
   */

  function renderErrorState(
    message
  ) {
    groceryRoot.innerHTML = `
      <section class="grocery-empty-state is-error">
        <div class="grocery-empty-icon">
          !
        </div>

        <p class="eyebrow">
          Grocery Optimizer
        </p>

        <h1>
          Shopping list stopped
        </h1>

        <p>
          ${escapeHtml(message)}
        </p>

        <button
          type="button"
          class="button"
          id="retry-grocery-list-button"
        >
          Try again
        </button>
      </section>
    `;

    document
      .getElementById(
        "retry-grocery-list-button"
      )
      ?.addEventListener(
        "click",
        generateGroceryList
      );
  }

  /**
   * Return the current meal plan.
   *
   * @returns {object|null}
   */

  function getSavedMealPlan() {
    return window
      .ELEVEN_STORAGE
      ?.getMealPlan?.() ||
      null;
  }

  /**
   * Navigate using Eleven's existing navigation.
   *
   * @param {string} sectionId
   */

  function navigateToSection(
    sectionId
  ) {
    const navigationLink =
      document.querySelector(
        `[data-section="${sectionId}"], [data-target="${sectionId}"], a[href="#${sectionId}"]`
      );

    if (navigationLink) {
      navigationLink.click();
      return;
    }

    window.location.hash =
      sectionId;

    document
      .getElementById(
        sectionId
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }

  /**
   * Quantity labels.
   */

  function createRequiredQuantityLabel(
    item
  ) {
    if (
      item.requiredGrams > 0
    ) {
      return formatWeight(
        item.requiredGrams
      );
    }

    return `${formatNumber(
      item.requiredServings
    )} × ${item.servingDescription}`;
  }

  function createLeftoverLabel(
    item
  ) {
    if (
      item.leftoverGrams >= 1
    ) {
      return `${formatWeight(
        item.leftoverGrams
      )} estimated leftover`;
    }

    if (
      item.leftoverServings >=
      0.25
    ) {
      return `${formatNumber(
        item.leftoverServings
      )} serving${
        item.leftoverServings === 1
          ? ""
          : "s"
      } estimated leftover`;
    }

    return "";
  }

  /**
   * Department and decision icons.
   */

  function getDepartmentIcon(
    departmentId
  ) {
    const icons = {
      produce: "🥬",
      "meat-seafood": "🥩",
      "dairy-eggs": "🥛",
      bakery: "🍞",
      frozen: "❄️",
      pantry: "🥫",
      beverages: "🥤",
      other: "🛍️"
    };

    return (
      icons[departmentId] ||
      "🛍️"
    );
  }

  function getDecisionIcon(type) {
    const icons = {
      positive: "✓",
      warning: "!",
      summary: "★",
      information: "i"
    };

    return icons[type] || "i";
  }

  /**
   * Plan utilities.
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
   * Formatting utilities.
   */

  function formatWeight(
    grams
  ) {
    const value =
      toFiniteNumber(grams);

    if (value >= 1000) {
      return `${formatNumber(
        value / 1000
      )} kg`;
    }

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
    init,
    refresh,
    generateGroceryList
  };
})();
