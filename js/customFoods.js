"use strict";

/**
 * Eleven custom food controller
 *
 * Responsibilities:
 *
 * - Store user-created foods in localStorage
 * - Add stored custom foods to ELEVEN_FOODS
 * - Inject the custom-food interface
 * - Create, edit, and delete custom foods
 * - Validate manually entered nutrition information
 *
 * Custom foods are stored only in the current browser.
 */

window.ELEVEN_CUSTOM_FOODS = (() => {
  const STORAGE_KEY = "eleven:custom-foods";

  const VALID_CATEGORIES = [
    "protein",
    "vegetable",
    "fruit",
    "carbohydrate",
    "fat",
    "dairy"
  ];

  const VALID_MEAL_TYPES = [
    "breakfast",
    "lunch",
    "dinner",
    "snack"
  ];

  let customFoods = [];
  let initialized = false;
  let editingFoodId = null;

  let modal = null;
  let form = null;
  let messageElement = null;

  /**
   * Load custom foods immediately.
   *
   * This runs before the application initializes so saved custom foods
   * can be included when the Food Preferences controller renders.
   */

  loadStoredFoodsIntoDatabase();

  /**
   * Initialize the custom-food interface.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      return true;
    }

    if (!window.ELEVEN_STORAGE) {
      console.error(
        "Eleven storage is unavailable for custom foods."
      );

      return false;
    }

    injectCustomFoodButton();
    injectCustomFoodModal();
    bindEvents();

    initialized = true;

    return true;
  }

  /**
   * Load stored custom foods and merge them into ELEVEN_FOODS.
   */

  function loadStoredFoodsIntoDatabase() {
    try {
      const storedValue =
        window.localStorage.getItem(STORAGE_KEY);

      if (!storedValue) {
        customFoods = [];
        return;
      }

      const parsedValue =
        JSON.parse(storedValue);

      const storedFoods =
        Array.isArray(parsedValue)
          ? parsedValue
          : Array.isArray(parsedValue?.value)
            ? parsedValue.value
            : [];

      customFoods = storedFoods
        .map(normalizeStoredFood)
        .filter(Boolean);

      mergeCustomFoodsIntoDatabase();
    } catch (error) {
      console.error(
        "Unable to load Eleven custom foods.",
        error
      );

      customFoods = [];
    }
  }

  /**
   * Add custom foods to the global food database.
   */

  function mergeCustomFoodsIntoDatabase() {
    if (!Array.isArray(window.ELEVEN_FOODS)) {
      return;
    }

    customFoods.forEach((customFood) => {
      const existingIndex =
        window.ELEVEN_FOODS.findIndex(
          (food) => food.id === customFood.id
        );

      if (existingIndex >= 0) {
        window.ELEVEN_FOODS[existingIndex] =
          cloneValue(customFood);
      } else {
        window.ELEVEN_FOODS.push(
          cloneValue(customFood)
        );
      }
    });
  }

  /**
   * Inject the Add custom food button into Food Preferences.
   */

  function injectCustomFoodButton() {
    const header =
      document.querySelector(
        "#preferences .page-header"
      );

    if (!header) {
      return;
    }

    let actions =
      header.querySelector(
        ".header-actions"
      );

    if (!actions) {
      actions =
        document.createElement("div");

      actions.className =
        "header-actions";

      header.appendChild(actions);
    }

    if (
      document.getElementById(
        "add-custom-food-button"
      )
    ) {
      return;
    }

    const button =
      document.createElement("button");

    button.id =
      "add-custom-food-button";

    button.className =
      "button button-primary";

    button.type = "button";

    button.innerHTML = `
      <span aria-hidden="true">+</span>
      Add custom food
    `;

    actions.prepend(button);
  }

  /**
   * Inject the custom-food modal.
   */

  function injectCustomFoodModal() {
    if (
      document.getElementById(
        "custom-food-modal"
      )
    ) {
      modal =
        document.getElementById(
          "custom-food-modal"
        );

      form =
        document.getElementById(
          "custom-food-form"
        );

      messageElement =
        document.getElementById(
          "custom-food-form-message"
        );

      return;
    }

    const modalElement =
      document.createElement("div");

    modalElement.id =
      "custom-food-modal";

    modalElement.className =
      "custom-food-modal";

    modalElement.hidden = true;

    modalElement.setAttribute(
      "role",
      "dialog"
    );

    modalElement.setAttribute(
      "aria-modal",
      "true"
    );

    modalElement.setAttribute(
      "aria-labelledby",
      "custom-food-modal-title"
    );

    modalElement.innerHTML = `
      <div
        class="custom-food-modal-backdrop"
        data-close-custom-food-modal
      ></div>

      <div class="custom-food-dialog">
        <div class="custom-food-dialog-header">
          <div>
            <p class="eyebrow">
              Personal food database
            </p>

            <h2 id="custom-food-modal-title">
              Add custom food
            </h2>

            <p>
              Enter the nutrition information exactly as it appears on
              the product label.
            </p>
          </div>

          <button
            class="custom-food-close-button"
            type="button"
            aria-label="Close custom food form"
            data-close-custom-food-modal
          >
            ×
          </button>
        </div>

        <form id="custom-food-form">
          <div class="custom-food-form-grid">
            <div class="form-field">
              <label for="custom-food-name">
                Product name
              </label>

              <input
                id="custom-food-name"
                name="name"
                type="text"
                maxlength="100"
                placeholder="Chocolate Protein Shake"
                required
              >
            </div>

            <div class="form-field">
              <label for="custom-food-brand">
                Brand
              </label>

              <input
                id="custom-food-brand"
                name="brand"
                type="text"
                maxlength="100"
                placeholder="Kirkland Signature"
              >
            </div>

            <div class="form-field">
              <label for="custom-food-category">
                Category
              </label>

              <select
                id="custom-food-category"
                name="category"
                required
              >
                <option value="">
                  Select a category
                </option>

                <option value="protein">
                  Protein
                </option>

                <option value="vegetable">
                  Vegetable
                </option>

                <option value="fruit">
                  Fruit
                </option>

                <option value="carbohydrate">
                  Carbohydrate
                </option>

                <option value="fat">
                  Healthy fat
                </option>

                <option value="dairy">
                  Dairy or alternative
                </option>
              </select>
            </div>

            <div class="form-field">
              <label for="custom-food-serving">
                Serving description
              </label>

              <input
                id="custom-food-serving"
                name="servingDescription"
                type="text"
                maxlength="100"
                placeholder="1 bottle, 325 mL"
                required
              >
            </div>

            <div class="form-field">
              <label for="custom-food-serving-grams">
                Serving weight
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-serving-grams"
                  name="servingGrams"
                  type="number"
                  min="0"
                  max="5000"
                  step="0.1"
                  placeholder="325"
                >

                <span>g or mL</span>
              </div>
            </div>

            <div class="form-field">
              <label for="custom-food-calories">
                Calories
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-calories"
                  name="calories"
                  type="number"
                  min="0"
                  max="5000"
                  step="1"
                  placeholder="160"
                  required
                >

                <span>kcal</span>
              </div>
            </div>

            <div class="form-field">
              <label for="custom-food-protein">
                Protein
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-protein"
                  name="protein"
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  placeholder="30"
                  required
                >

                <span>g</span>
              </div>
            </div>

            <div class="form-field">
              <label for="custom-food-carbohydrates">
                Carbohydrates
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-carbohydrates"
                  name="carbohydrates"
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  placeholder="6"
                  required
                >

                <span>g</span>
              </div>
            </div>

            <div class="form-field">
              <label for="custom-food-sugar">
                Sugar
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-sugar"
                  name="sugar"
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  placeholder="1"
                >

                <span>g</span>
              </div>
            </div>

            <div class="form-field">
              <label for="custom-food-fat">
                Fat
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-fat"
                  name="fat"
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  placeholder="3"
                  required
                >

                <span>g</span>
              </div>
            </div>

            <div class="form-field">
              <label for="custom-food-fibre">
                Fibre
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-fibre"
                  name="fibre"
                  type="number"
                  min="0"
                  max="200"
                  step="0.1"
                  placeholder="1"
                >

                <span>g</span>
              </div>
            </div>

            <div class="form-field">
              <label for="custom-food-sodium">
                Sodium
              </label>

              <div class="input-with-unit">
                <input
                  id="custom-food-sodium"
                  name="sodium"
                  type="number"
                  min="0"
                  max="20000"
                  step="1"
                  placeholder="230"
                >

                <span>mg</span>
              </div>
            </div>

            <div class="form-field form-field-wide">
              <label>
                Suitable eating occasions
              </label>

              <div class="custom-food-meal-types">
                <label>
                  <input
                    type="checkbox"
                    name="mealTypes"
                    value="breakfast"
                  >
                  Breakfast
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="mealTypes"
                    value="lunch"
                    checked
                  >
                  Lunch
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="mealTypes"
                    value="dinner"
                    checked
                  >
                  Dinner
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="mealTypes"
                    value="snack"
                    checked
                  >
                  Snack
                </label>
              </div>
            </div>

            <div class="form-field form-field-wide">
              <label for="custom-food-barcode">
                Barcode or UPC
                <span class="optional-label">
                  Optional
                </span>
              </label>

              <input
                id="custom-food-barcode"
                name="barcode"
                type="text"
                inputmode="numeric"
                maxlength="30"
                placeholder="Enter the barcode for future lookup support"
              >
            </div>

            <div class="form-field form-field-wide">
              <label for="custom-food-notes">
                Notes
                <span class="optional-label">
                  Optional
                </span>
              </label>

              <textarea
                id="custom-food-notes"
                name="notes"
                rows="3"
                maxlength="500"
                placeholder="For example: Purchased at Costco Canada"
              ></textarea>
            </div>
          </div>

          <div class="custom-food-verification">
            <label>
              <input
                id="custom-food-verified"
                name="verifiedByUser"
                type="checkbox"
                required
              >

              <span>
                I reviewed these values against the nutrition label.
              </span>
            </label>
          </div>

          <p
            class="form-message"
            id="custom-food-form-message"
            role="status"
            aria-live="polite"
          ></p>

          <div class="custom-food-form-actions">
            <button
              class="button button-secondary"
              type="button"
              data-close-custom-food-modal
            >
              Cancel
            </button>

            <button
              class="button button-primary"
              type="submit"
            >
              Save custom food
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(
      modalElement
    );

    modal = modalElement;

    form =
      document.getElementById(
        "custom-food-form"
      );

    messageElement =
      document.getElementById(
        "custom-food-form-message"
      );
  }

  /**
   * Bind custom-food events.
   */

  function bindEvents() {
    const addButton =
      document.getElementById(
        "add-custom-food-button"
      );

    if (addButton) {
      addButton.addEventListener(
        "click",
        openCreateForm
      );
    }

    if (form) {
      form.addEventListener(
        "submit",
        handleFormSubmit
      );

      form.addEventListener(
        "input",
        clearMessage
      );

      form.addEventListener(
        "change",
        clearMessage
      );
    }

    document
      .querySelectorAll(
        "[data-close-custom-food-modal]"
      )
      .forEach((element) => {
        element.addEventListener(
          "click",
          closeModal
        );
      });

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.addEventListener(
      "click",
      handleCustomFoodAction
    );
  }

  /**
   * Open the blank custom-food form.
   */

  function openCreateForm() {
    editingFoodId = null;

    if (form) {
      form.reset();

      setDefaultMealTypes();
    }

    setModalTitle(
      "Add custom food"
    );

    clearMessage();
    openModal();
  }

  /**
   * Open the form to edit an existing custom food.
   *
   * @param {string} foodId
   */

  function openEditForm(foodId) {
    const food =
      getCustomFoodById(foodId);

    if (!food || !form) {
      return;
    }

    editingFoodId = food.id;

    form.elements.name.value =
      food.name || "";

    form.elements.brand.value =
      food.brand || "";

    form.elements.category.value =
      food.category || "";

    form.elements.servingDescription.value =
      food.servingDescription || "";

    form.elements.servingGrams.value =
      food.servingGrams || "";

    form.elements.calories.value =
      food.calories ?? "";

    form.elements.protein.value =
      food.protein ?? "";

    form.elements.carbohydrates.value =
      food.carbohydrates ?? "";

    form.elements.sugar.value =
      food.sugar ?? "";

    form.elements.fat.value =
      food.fat ?? "";

    form.elements.fibre.value =
      food.fibre ?? "";

    form.elements.sodium.value =
      food.sodium ?? "";

    form.elements.barcode.value =
      food.source?.barcode || "";

    form.elements.notes.value =
      food.notes || "";

    form.elements.verifiedByUser.checked =
      Boolean(
        food.source?.verifiedByUser
      );

    form
      .querySelectorAll(
        'input[name="mealTypes"]'
      )
      .forEach((input) => {
        input.checked =
          food.mealTypes.includes(
            input.value
          );
      });

    setModalTitle(
      "Edit custom food"
    );

    clearMessage();
    openModal();
  }

  /**
   * Handle custom-food form submission.
   *
   * @param {SubmitEvent} event
   */

  function handleFormSubmit(event) {
    event.preventDefault();

    const food =
      getFoodFromForm();

    const validation =
      validateFood(food);

    if (!validation.isValid) {
      showMessage(
        validation.message,
        true
      );

      focusField(
        validation.fieldName
      );

      return;
    }

    if (editingFoodId) {
      updateCustomFood(
        editingFoodId,
        food
      );
    } else {
      createCustomFood(food);
    }
  }

  /**
   * Read and normalize form values.
   *
   * @returns {object}
   */

  function getFoodFromForm() {
    const formData =
      new FormData(form);

    const mealTypes =
      formData
        .getAll("mealTypes")
        .filter((mealType) =>
          VALID_MEAL_TYPES.includes(
            mealType
          )
        );

    const name =
      cleanText(
        formData.get("name")
      );

    const brand =
      cleanText(
        formData.get("brand")
      );

    return {
      id:
        editingFoodId ||
        createFoodId(
          brand,
          name
        ),

      name,
      shortName: name,
      brand,

      icon:
        getCategoryIcon(
          formData.get("category")
        ),

      category:
        cleanText(
          formData.get("category")
        ),

      servingDescription:
        cleanText(
          formData.get(
            "servingDescription"
          )
        ),

      servingGrams:
        toFiniteNumber(
          formData.get(
            "servingGrams"
          )
        ),

      calories:
        toFiniteNumber(
          formData.get("calories")
        ),

      protein:
        toFiniteNumber(
          formData.get("protein")
        ),

      carbohydrates:
        toFiniteNumber(
          formData.get(
            "carbohydrates"
          )
        ),

      sugar:
        toFiniteNumber(
          formData.get("sugar")
        ),

      fat:
        toFiniteNumber(
          formData.get("fat")
        ),

      fibre:
        toFiniteNumber(
          formData.get("fibre")
        ),

      sodium:
        toFiniteNumber(
          formData.get("sodium")
        ),

      mealTypes,

      preparationMethods: [
        "packaged"
      ],

      mealPrepFriendly: true,

      tags: [
        "custom-food",
        "user-entered"
      ],

      notes:
        cleanText(
          formData.get("notes")
        ),

      isCustom: true,

      source: {
        type: "manual",
        provider: null,
        externalId: null,
        barcode:
          cleanText(
            formData.get("barcode")
          ) || null,
        verifiedByUser:
          formData.get(
            "verifiedByUser"
          ) === "on"
      },

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };
  }

  /**
   * Validate a custom food.
   *
   * @param {object} food
   * @returns {object}
   */

  function validateFood(food) {
    if (!food.name) {
      return invalidResult(
        "Enter a product name.",
        "name"
      );
    }

    if (
      !VALID_CATEGORIES.includes(
        food.category
      )
    ) {
      return invalidResult(
        "Select a food category.",
        "category"
      );
    }

    if (
      !food.servingDescription
    ) {
      return invalidResult(
        "Enter the serving description shown on the label.",
        "servingDescription"
      );
    }

    if (food.calories < 0) {
      return invalidResult(
        "Calories cannot be negative.",
        "calories"
      );
    }

    if (food.protein < 0) {
      return invalidResult(
        "Protein cannot be negative.",
        "protein"
      );
    }

    if (
      food.carbohydrates < 0
    ) {
      return invalidResult(
        "Carbohydrates cannot be negative.",
        "carbohydrates"
      );
    }

    if (food.fat < 0) {
      return invalidResult(
        "Fat cannot be negative.",
        "fat"
      );
    }

    if (
      food.sugar >
      food.carbohydrates
    ) {
      return invalidResult(
        "Sugar cannot be greater than total carbohydrates.",
        "sugar"
      );
    }

    if (
      food.mealTypes.length === 0
    ) {
      return invalidResult(
        "Select at least one suitable eating occasion.",
        "mealTypes"
      );
    }

    if (
      !food.source
        .verifiedByUser
    ) {
      return invalidResult(
        "Confirm that you reviewed the values against the nutrition label.",
        "verifiedByUser"
      );
    }

    return {
      isValid: true,
      message: "",
      fieldName: null
    };
  }

  /**
   * Create a custom food.
   *
   * @param {object} food
   */

  function createCustomFood(food) {
    const duplicate =
      customFoods.find(
        (existingFood) =>
          existingFood.name
            .toLowerCase() ===
            food.name.toLowerCase() &&
          existingFood.brand
            .toLowerCase() ===
            food.brand.toLowerCase()
      );

    if (duplicate) {
      showMessage(
        "This custom product already exists. Edit the existing entry instead.",
        true
      );

      return;
    }

    customFoods.push(food);

    const saved =
      saveCustomFoods();

    if (!saved) {
      showMessage(
        "The custom food could not be saved.",
        true
      );

      return;
    }

    finishSuccessfulSave(
      `${food.name} was added successfully.`
    );
  }

  /**
   * Update an existing custom food.
   *
   * @param {string} foodId
   * @param {object} food
   */

  function updateCustomFood(
    foodId,
    food
  ) {
    const index =
      customFoods.findIndex(
        (existingFood) =>
          existingFood.id === foodId
      );

    if (index === -1) {
      showMessage(
        "The custom food could not be found.",
        true
      );

      return;
    }

    const originalFood =
      customFoods[index];

    customFoods[index] = {
      ...food,
      id: originalFood.id,
      createdAt:
        originalFood.createdAt,
      updatedAt:
        new Date().toISOString()
    };

    const saved =
      saveCustomFoods();

    if (!saved) {
      showMessage(
        "The custom food could not be updated.",
        true
      );

      return;
    }

    finishSuccessfulSave(
      `${food.name} was updated successfully.`
    );
  }

  /**
   * Delete a custom food.
   *
   * @param {string} foodId
   */

  function deleteCustomFood(foodId) {
    const food =
      getCustomFoodById(foodId);

    if (!food) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${food.name} from your custom foods?`
      );

    if (!confirmed) {
      return;
    }

    customFoods =
      customFoods.filter(
        (customFood) =>
          customFood.id !== foodId
      );

    const saved =
      saveCustomFoods();

    if (!saved) {
      window.alert(
        "The custom food could not be deleted."
      );

      return;
    }

    removeFoodFromPreferences(
      foodId
    );

    reloadApplication();
  }

  /**
   * Complete a successful create or edit operation.
   *
   * @param {string} message
   */

  function finishSuccessfulSave(message) {
    showMessage(message);

    window.setTimeout(() => {
      closeModal();
      reloadApplication();
    }, 500);
  }

  /**
   * Save custom foods to browser storage.
   *
   * @returns {boolean}
   */

  function saveCustomFoods() {
    try {
      const storageValue = {
        value: customFoods,
        savedAt:
          new Date().toISOString(),
        storageVersion: 1
      };

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(storageValue)
      );

      return true;
    } catch (error) {
      console.error(
        "Unable to save Eleven custom foods.",
        error
      );

      return false;
    }
  }

  /**
   * Remove a deleted custom food from saved preferences.
   *
   * @param {string} foodId
   */

  function removeFoodFromPreferences(
    foodId
  ) {
    if (!window.ELEVEN_STORAGE) {
      return;
    }

    const preferences =
      window.ELEVEN_STORAGE
        .getPreferences();

    const selectedFoodIds =
      preferences.selectedFoodIds
        .filter(
          (selectedId) =>
            selectedId !== foodId
        );

    window.ELEVEN_STORAGE
      .savePreferences({
        selectedFoodIds,
        excludedFoods:
          preferences.excludedFoods
      });
  }

  /**
   * Handle edit and delete buttons placed on custom cards.
   *
   * @param {MouseEvent} event
   */

  function handleCustomFoodAction(event) {
    const editButton =
      event.target.closest(
        "[data-edit-custom-food]"
      );

    if (editButton) {
      event.preventDefault();
      event.stopPropagation();

      openEditForm(
        editButton.dataset
          .editCustomFood
      );

      return;
    }

    const deleteButton =
      event.target.closest(
        "[data-delete-custom-food]"
      );

    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();

      deleteCustomFood(
        deleteButton.dataset
          .deleteCustomFood
      );
    }
  }

  /**
   * Open the modal.
   */

  function openModal() {
    if (!modal) {
      return;
    }

    modal.hidden = false;

    document.body.classList.add(
      "custom-food-modal-open"
    );

    window.setTimeout(() => {
      form?.elements.name?.focus();
    }, 50);
  }

  /**
   * Close the modal.
   */

  function closeModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;

    document.body.classList.remove(
      "custom-food-modal-open"
    );

    editingFoodId = null;
    clearMessage();
  }

  /**
   * Handle Escape key.
   *
   * @param {KeyboardEvent} event
   */

  function handleKeyDown(event) {
    if (
      event.key === "Escape" &&
      modal &&
      !modal.hidden
    ) {
      closeModal();
    }
  }

  /**
   * Set default meal types for a new custom food.
   */

  function setDefaultMealTypes() {
    if (!form) {
      return;
    }

    form
      .querySelectorAll(
        'input[name="mealTypes"]'
      )
      .forEach((input) => {
        input.checked = [
          "lunch",
          "dinner",
          "snack"
        ].includes(input.value);
      });
  }

  /**
   * Return one custom food.
   *
   * @param {string} foodId
   * @returns {object|null}
   */

  function getCustomFoodById(
    foodId
  ) {
    return (
      customFoods.find(
        (food) =>
          food.id === foodId
      ) || null
    );
  }

  /**
   * Return all custom foods.
   *
   * @returns {object[]}
   */

  function getCustomFoods() {
    return cloneValue(
      customFoods
    );
  }

  /**
   * Normalize a stored custom food.
   *
   * @param {object} food
   * @returns {object|null}
   */

  function normalizeStoredFood(food) {
    if (
      !food ||
      typeof food !== "object" ||
      !food.id ||
      !food.name ||
      !VALID_CATEGORIES.includes(
        food.category
      )
    ) {
      return null;
    }

    return {
      ...food,
      isCustom: true,
      icon:
        food.icon ||
        getCategoryIcon(
          food.category
        ),
      mealTypes:
        Array.isArray(
          food.mealTypes
        )
          ? food.mealTypes.filter(
              (mealType) =>
                VALID_MEAL_TYPES.includes(
                  mealType
                )
            )
          : ["snack"],
      tags:
        Array.isArray(food.tags)
          ? [
              ...new Set([
                ...food.tags,
                "custom-food"
              ])
            ]
          : [
              "custom-food",
              "user-entered"
            ],
      source: {
        type:
          food.source?.type ||
          "manual",
        provider:
          food.source?.provider ||
          null,
        externalId:
          food.source
            ?.externalId ||
          null,
        barcode:
          food.source?.barcode ||
          null,
        verifiedByUser:
          Boolean(
            food.source
              ?.verifiedByUser
          )
      }
    };
  }

  /**
   * Reload the page so the Food Preferences grid is rebuilt.
   */

  function reloadApplication() {
    window.location.reload();
  }

  /**
   * Create a unique custom-food ID.
   *
   * @param {string} brand
   * @param {string} name
   * @returns {string}
   */

  function createFoodId(
    brand,
    name
  ) {
    const slug = [
      brand,
      name
    ]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(0, 60);

    return [
      "custom",
      slug || "food",
      Date.now()
    ].join("-");
  }

  /**
   * Return an icon for a category.
   *
   * @param {string} category
   * @returns {string}
   */

  function getCategoryIcon(category) {
    const icons = {
      protein: "🥤",
      vegetable: "🥦",
      fruit: "🍎",
      carbohydrate: "🍚",
      fat: "🥑",
      dairy: "🥛"
    };

    return icons[category] || "🍽️";
  }

  /**
   * Update modal heading.
   *
   * @param {string} title
   */

  function setModalTitle(title) {
    const titleElement =
      document.getElementById(
        "custom-food-modal-title"
      );

    if (titleElement) {
      titleElement.textContent =
        title;
    }
  }

  /**
   * Focus a form field.
   *
   * @param {string} fieldName
   */

  function focusField(fieldName) {
    if (!form || !fieldName) {
      return;
    }

    let field =
      form.elements[fieldName];

    if (
      field &&
      typeof field.focus ===
        "function"
    ) {
      field.focus();
    }
  }

  /**
   * Show a form message.
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
   * Clear form message.
   */

  function clearMessage() {
    showMessage("", false);
  }

  /**
   * Return a validation failure.
   *
   * @param {string} message
   * @param {string} fieldName
   * @returns {object}
   */

  function invalidResult(
    message,
    fieldName
  ) {
    return {
      isValid: false,
      message,
      fieldName
    };
  }

  /**
   * Convert a value into clean text.
   *
   * @param {*} value
   * @returns {string}
   */

  function cleanText(value) {
    return String(
      value ?? ""
    ).trim();
  }

  /**
   * Convert a value into a finite number.
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
   * Clone a serializable value.
   *
   * @param {*} value
   * @returns {*}
   */

  function cloneValue(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  return {
    init,
    openCreateForm,
    openEditForm,
    deleteCustomFood,
    getCustomFoodById,
    getCustomFoods,
    reloadFoods:
      loadStoredFoodsIntoDatabase
  };
})();
