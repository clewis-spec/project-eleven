"use strict";

/**
 * Eleven food preference controller
 *
 * Responsibilities:
 *
 * - Render built-in foods as selectable cards
 * - Restore saved selections
 * - Track selected-food counts
 * - Save food preferences and exclusions
 * - Validate category variety
 * - Notify the rest of the application when preferences change
 */

window.ELEVEN_PREFERENCES = (() => {
  const GRID_IDS = {
    protein: "protein-food-grid",
    vegetable: "vegetable-food-grid",
    fruit: "fruit-food-grid",
    carbohydrate: "carbohydrate-food-grid",
    fat: "fat-food-grid",
    dairy: "dairy-food-grid"
  };

  const DEFAULT_SELECTED_FOOD_IDS = [
    "chicken-breast",
    "turkey-breast",
    "lean-ground-beef",
    "sirloin-steak",
    "salmon",
    "cod",
    "shrimp",
    "whole-eggs",
    "egg-whites",

    "broccoli",
    "spinach",
    "green-beans",
    "asparagus",
    "bell-peppers",
    "cauliflower",
    "zucchini",
    "cucumber",
    "tomatoes",
    "mixed-greens",

    "apple",
    "banana",
    "blueberries",
    "strawberries",
    "orange",

    "rolled-oats",
    "jasmine-rice",
    "brown-rice",
    "white-potato",
    "sweet-potato",
    "whole-grain-bread",
    "whole-wheat-wrap",

    "avocado",
    "almonds",
    "natural-peanut-butter",
    "olive-oil",
    "chia-seeds",

    "greek-yogurt",
    "cottage-cheese",
    "skim-milk",
    "unsweetened-almond-milk",
    "whey-protein"
  ];

  let initialized = false;

  let selectedFoodIds = new Set();

  let selectAllButton = null;
  let clearButton = null;
  let saveButton = null;
  let exclusionsField = null;
  let messageElement = null;

  /**
   * Initialize the food preference controller.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      return true;
    }

    if (
      !Array.isArray(window.ELEVEN_FOODS) ||
      !Array.isArray(window.ELEVEN_FOOD_CATEGORIES)
    ) {
      console.error(
        "Eleven food data is unavailable."
      );

      return false;
    }

    if (!window.ELEVEN_STORAGE) {
      console.error(
        "Eleven storage is unavailable."
      );

      return false;
    }

    cacheElements();
    renderAllFoodCategories();
    restorePreferences();
    bindEvents();
    updateInterface();

    initialized = true;

    return true;
  }

  /**
   * Cache page controls.
   */

  function cacheElements() {
    selectAllButton =
      document.getElementById(
        "select-all-foods-button"
      );

    clearButton =
      document.getElementById(
        "clear-foods-button"
      );

    saveButton =
      document.getElementById(
        "save-preferences-button"
      );

    exclusionsField =
      document.getElementById(
        "excluded-foods"
      );

    messageElement =
      document.getElementById(
        "preference-form-message"
      );
  }

  /**
   * Bind preference controls.
   */

  function bindEvents() {
    if (selectAllButton) {
      selectAllButton.addEventListener(
        "click",
        selectAllFoods
      );
    }

    if (clearButton) {
      clearButton.addEventListener(
        "click",
        clearAllFoods
      );
    }

    if (saveButton) {
      saveButton.addEventListener(
        "click",
        savePreferences
      );
    }

    if (exclusionsField) {
      exclusionsField.addEventListener(
        "input",
        clearMessage
      );
    }
  }

  /**
   * Render all category grids.
   */

  function renderAllFoodCategories() {
    Object.entries(GRID_IDS).forEach(
      ([categoryId, gridId]) => {
        renderFoodCategory(
          categoryId,
          gridId
        );
      }
    );
  }

  /**
   * Render one food category.
   *
   * @param {string} categoryId
   * @param {string} gridId
   */

  function renderFoodCategory(
    categoryId,
    gridId
  ) {
    const grid =
      document.getElementById(gridId);

    if (!grid) {
      return;
    }

    const foods =
      window.ELEVEN_FOODS.filter(
        (food) =>
          food.category === categoryId
      );

    grid.innerHTML = "";

    if (foods.length === 0) {
      grid.innerHTML = `
        <p class="empty-state">
          No foods are available in this category.
        </p>
      `;

      return;
    }

    foods.forEach((food) => {
      grid.appendChild(
        createFoodCard(food)
      );
    });

    const categoryStatus =
      document.createElement("p");

    categoryStatus.className =
      "category-selection-status";

    categoryStatus.dataset.categoryStatus =
      categoryId;

    grid.insertAdjacentElement(
      "afterend",
      categoryStatus
    );
  }

  /**
   * Create one selectable food card.
   *
   * @param {object} food
   * @returns {HTMLLabelElement}
   */

  function createFoodCard(food) {
    const label =
      document.createElement("label");

    label.className = "food-card";
    label.dataset.foodId = food.id;
    label.dataset.category =
      food.category;

    const input =
      document.createElement("input");

    input.type = "checkbox";
    input.name = "preferredFoods";
    input.value = food.id;
    input.setAttribute(
      "aria-label",
      `Select ${food.name}`
    );

    input.addEventListener(
      "change",
      handleFoodSelectionChange
    );

    const content =
      document.createElement("span");

    content.className =
      "food-card-content";

    const icon =
      document.createElement("span");

    icon.className = "food-card-icon";
    icon.setAttribute(
      "aria-hidden",
      "true"
    );

    icon.textContent =
      food.icon || "•";

    const name =
      document.createElement("strong");

    name.className = "food-card-name";
    name.textContent = food.name;

    const serving =
      document.createElement("small");

    serving.className =
      "food-card-serving";

    serving.textContent =
      food.servingDescription;

    const nutrition =
      document.createElement("span");

    nutrition.className =
      "food-card-nutrition";

    nutrition.innerHTML = `
      <span>
        ${formatCalories(food.calories)}
      </span>

      <span>
        ${formatProtein(food.protein)}
      </span>
    `;

    const selectedIndicator =
      document.createElement("span");

    selectedIndicator.className =
      "food-card-selected-indicator";

    selectedIndicator.setAttribute(
      "aria-hidden",
      "true"
    );

    selectedIndicator.textContent = "✓";

    content.append(
      icon,
      name,
      serving,
      nutrition,
      selectedIndicator
    );

    label.append(
      input,
      content
    );

    return label;
  }

  /**
   * Restore saved preferences.
   *
   * First-time users receive a practical default selection.
   */

  function restorePreferences() {
    const preferences =
      window.ELEVEN_STORAGE
        .getPreferences();

    const hasSavedPreferences =
      Boolean(preferences.updatedAt);

    const restoredIds =
      hasSavedPreferences
        ? preferences.selectedFoodIds
        : DEFAULT_SELECTED_FOOD_IDS;

    selectedFoodIds = new Set(
      restoredIds.filter(
        isValidFoodId
      )
    );

    if (exclusionsField) {
      exclusionsField.value =
        preferences.excludedFoods.join(
          ", "
        );
    }

    synchronizeCheckboxes();
  }

  /**
   * Handle one food being selected or deselected.
   *
   * @param {Event} event
   */

  function handleFoodSelectionChange(
    event
  ) {
    const input = event.target;
    const foodId = input.value;

    if (input.checked) {
      selectedFoodIds.add(foodId);
    } else {
      selectedFoodIds.delete(foodId);
    }

    clearMessage();
    updateInterface();
  }

  /**
   * Select every built-in food.
   */

  function selectAllFoods() {
    window.ELEVEN_FOODS.forEach(
      (food) => {
        selectedFoodIds.add(food.id);
      }
    );

    synchronizeCheckboxes();
    clearMessage();
    updateInterface();
  }

  /**
   * Clear every selected food.
   */

  function clearAllFoods() {
    if (selectedFoodIds.size === 0) {
      return;
    }

    const confirmed =
      window.confirm(
        "Clear all selected foods?"
      );

    if (!confirmed) {
      return;
    }

    selectedFoodIds.clear();

    synchronizeCheckboxes();
    clearMessage();
    updateInterface();
  }

  /**
   * Save the current preference selections.
   */

  function savePreferences() {
    const validation =
      validateSelections();

    if (!validation.isValid) {
      showMessage(
        validation.message,
        true
      );

      if (validation.categoryId) {
        scrollToCategory(
          validation.categoryId
        );
      }

      return;
    }

    const exclusions =
      exclusionsField
        ? exclusionsField.value
        : "";

    const preferences = {
      selectedFoodIds:
        Array.from(selectedFoodIds),
      excludedFoods: exclusions
    };

    const saved =
      window.ELEVEN_STORAGE
        .savePreferences(preferences);

    if (!saved) {
      showMessage(
        "Your browser could not save the food preferences.",
        true
      );

      return;
    }

    showMessage(
      `${selectedFoodIds.size} foods saved successfully.`
    );

    document.dispatchEvent(
      new CustomEvent(
        "eleven:preferences-updated",
        {
          detail: {
            preferences:
              window.ELEVEN_STORAGE
                .getPreferences()
          }
        }
      )
    );
  }

  /**
   * Validate category coverage.
   *
   * We allow saving below the recommended quantities, but
   * require enough core foods for the future generator.
   *
   * @returns {object}
   */

  function validateSelections() {
    if (selectedFoodIds.size === 0) {
      return {
        isValid: false,
        categoryId: "protein",
        message:
          "Select some foods before saving your preferences."
      };
    }

    const minimumRequirements = {
      protein: 3,
      vegetable: 3,
      fruit: 2,
      carbohydrate: 2,
      fat: 1,
      dairy: 1
    };

    for (
      const [categoryId, minimum]
      of Object.entries(
        minimumRequirements
      )
    ) {
      const count =
        getSelectedCountForCategory(
          categoryId
        );

      if (count < minimum) {
        const category =
          getCategoryById(
            categoryId
          );

        return {
          isValid: false,
          categoryId,
          message:
            `Select at least ${minimum} ${
              category?.name.toLowerCase() ||
              categoryId
            } option${
              minimum === 1 ? "" : "s"
            } so Eleven can build a varied plan.`
        };
      }
    }

    return {
      isValid: true,
      categoryId: null,
      message: ""
    };
  }

  /**
   * Update all preference interface elements.
   */

  function updateInterface() {
    updateFoodCount();
    updateCategoryStatuses();
    updateCardStates();
  }

  /**
   * Synchronize checkbox values with the selection set.
   */

  function synchronizeCheckboxes() {
    document
      .querySelectorAll(
        'input[name="preferredFoods"]'
      )
      .forEach((input) => {
        input.checked =
          selectedFoodIds.has(
            input.value
          );
      });
  }

  /**
   * Update card classes and accessibility state.
   */

  function updateCardStates() {
    document
      .querySelectorAll(
        ".food-card"
      )
      .forEach((card) => {
        const foodId =
          card.dataset.foodId;

        const selected =
          selectedFoodIds.has(foodId);

        card.classList.toggle(
          "is-selected",
          selected
        );

        card.setAttribute(
          "aria-selected",
          String(selected)
        );
      });
  }

  /**
   * Update the total selected-food count.
   */

  function updateFoodCount() {
    setText(
      "preference-food-count",
      String(selectedFoodIds.size)
    );

    setText(
      "dashboard-food-count",
      String(selectedFoodIds.size)
    );
  }

  /**
   * Update every category's recommendation message.
   */

  function updateCategoryStatuses() {
    window.ELEVEN_FOOD_CATEGORIES
      .forEach((category) => {
        const status =
          document.querySelector(
            `[data-category-status="${category.id}"]`
          );

        if (!status) {
          return;
        }

        const count =
          getSelectedCountForCategory(
            category.id
          );

        const recommended =
          category.minimumRecommendedSelections;

        status.classList.toggle(
          "is-ready",
          count >= recommended
        );

        if (count >= recommended) {
          status.textContent =
            `${count} selected — good variety.`;
        } else {
          const remaining =
            recommended - count;

          status.textContent =
            `${count} selected — choose ${remaining} more for better variety.`;
        }
      });
  }

  /**
   * Return selected-food count for one category.
   *
   * @param {string} categoryId
   * @returns {number}
   */

  function getSelectedCountForCategory(
    categoryId
  ) {
    return window.ELEVEN_FOODS.filter(
      (food) =>
        food.category === categoryId &&
        selectedFoodIds.has(food.id)
    ).length;
  }

  /**
   * Return the category configuration.
   *
   * @param {string} categoryId
   * @returns {object|null}
   */

  function getCategoryById(
    categoryId
  ) {
    return (
      window.ELEVEN_FOOD_CATEGORIES
        .find(
          (category) =>
            category.id === categoryId
        ) || null
    );
  }

  /**
   * Check whether a food ID exists.
   *
   * @param {string} foodId
   * @returns {boolean}
   */

  function isValidFoodId(foodId) {
    return window.ELEVEN_FOODS.some(
      (food) => food.id === foodId
    );
  }

  /**
   * Scroll to a category.
   *
   * @param {string} categoryId
   */

  function scrollToCategory(categoryId) {
    const gridId =
      GRID_IDS[categoryId];

    const grid =
      document.getElementById(gridId);

    const categoryCard =
      grid?.closest(
        ".food-category-card"
      );

    categoryCard?.scrollIntoView({
      behavior:
        prefersReducedMotion()
          ? "auto"
          : "smooth",
      block: "start"
    });
  }

  /**
   * Show a save or validation message.
   *
   * @param {string} message
   * @param {boolean} isError
   */

  function showMessage(
    message,
    isError = false
  ) {
    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      message;

    messageElement.classList.toggle(
      "is-error",
      isError
    );
  }

  /**
   * Clear the status message.
   */

  function clearMessage() {
    showMessage("", false);
  }

  /**
   * Format food calories.
   *
   * @param {number} calories
   * @returns {string}
   */

  function formatCalories(calories) {
    return `${Math.round(
      Number(calories) || 0
    )} kcal`;
  }

  /**
   * Format food protein.
   *
   * @param {number} protein
   * @returns {string}
   */

  function formatProtein(protein) {
    const value =
      Number(protein) || 0;

    return `${Number.isInteger(value)
      ? value
      : value.toFixed(1)} g protein`;
  }

  /**
   * Set text on an element.
   *
   * @param {string} elementId
   * @param {string} value
   */

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
        value;
    }
  }

  /**
   * Detect reduced-motion preferences.
   *
   * @returns {boolean}
   */

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    );
  }

  /**
   * Return selected food IDs.
   *
   * @returns {string[]}
   */

  function getSelectedFoodIds() {
    return Array.from(
      selectedFoodIds
    );
  }

  return {
    init,
    restorePreferences,
    savePreferences,
    selectAllFoods,
    clearAllFoods,
    getSelectedFoodIds,
    getSelectedCountForCategory,
    validateSelections
  };
})();
