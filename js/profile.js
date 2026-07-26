"use strict";

/**
 * Eleven profile controller
 *
 * Connects the profile form to:
 *
 * - ELEVEN_NUTRITION
 * - ELEVEN_STORAGE
 * - Dashboard profile summaries
 *
 * This module exposes its public methods through
 * window.ELEVEN_PROFILE.
 */

window.ELEVEN_PROFILE = (() => {
  const DEFAULT_PROFILE = {
    profileName: "Chris",
    age: 55,
    sex: "male",
    heightFeet: 6,
    heightInches: 0,
    currentWeight: 210,
    goalWeight: 175,
    activityLevel: "sedentary",
    lossRate: "moderate"
  };

  const FIELD_IDS = {
    profileName: "profile-name",
    age: "age",
    sex: "sex",
    heightFeet: "height-feet",
    heightInches: "height-inches",
    currentWeight: "current-weight",
    goalWeight: "goal-weight",
    activityLevel: "activity-level"
  };

  const DASHBOARD_IDS = {
    profileName: "sidebar-profile-name",
    calories: "dashboard-calorie-target",
    protein: "dashboard-protein-target",
    progressStartingWeight:
      "progress-starting-weight",
    progressCurrentWeight:
      "progress-current-weight",
    progressGoalWeight:
      "progress-goal-weight",
    progressTotalChange:
      "progress-total-change"
  };

  const PREVIEW_IDS = {
    calories: "profile-calorie-preview",
    protein: "profile-protein-preview",
    maintenance:
      "profile-maintenance-preview"
  };

  let profileForm = null;
  let formMessage = null;
  let resetButton = null;
  let initialized = false;

  /**
   * Initialize the profile controller.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      return true;
    }

    profileForm =
      document.getElementById("profile-form");

    formMessage =
      document.getElementById(
        "profile-form-message"
      );

    resetButton =
      document.getElementById(
        "reset-profile-button"
      );

    if (!profileForm) {
      console.warn(
        "Eleven profile form was not found."
      );

      return false;
    }

    if (
      !window.ELEVEN_NUTRITION ||
      !window.ELEVEN_STORAGE
    ) {
      console.error(
        "Eleven profile dependencies are unavailable."
      );

      return false;
    }

    bindEvents();
    restoreProfile();
    updateLivePreview();
    updateProfileDisplays();

    initialized = true;

    return true;
  }

  /**
   * Bind profile form events.
   */

  function bindEvents() {
    profileForm.addEventListener(
      "submit",
      handleFormSubmit
    );

    profileForm.addEventListener(
      "input",
      handleProfileInput
    );

    profileForm.addEventListener(
      "change",
      handleProfileInput
    );

    if (resetButton) {
      resetButton.addEventListener(
        "click",
        handleResetButtonClick
      );
    }
  }

  /**
   * Handle profile input changes.
   */

  function handleProfileInput() {
    clearMessage();
    updateLivePreview();
  }

  /**
   * Handle profile form submission.
   *
   * @param {SubmitEvent} event
   */

  function handleFormSubmit(event) {
    event.preventDefault();

    clearMessage();

    const profile = getProfileFromForm();

    const validation =
      validateProfile(profile);

    if (!validation.isValid) {
      showMessage(
        validation.message,
        true
      );

      focusField(validation.fieldName);

      return;
    }

    const targets =
      window.ELEVEN_NUTRITION
        .calculateProfileTargets(profile);

    if (!targets) {
      showMessage(
        "Eleven could not calculate your nutrition targets. Please review the form.",
        true
      );

      return;
    }

    const existingProfile =
      window.ELEVEN_STORAGE.getProfile();

    const profileToSave = {
      ...profile,
      targets,
      createdAt:
        existingProfile?.createdAt ||
        new Date().toISOString()
    };

    const saved =
      window.ELEVEN_STORAGE
        .saveProfile(profileToSave);

    if (!saved) {
      showMessage(
        "Your browser could not save the profile. Check whether browser storage is enabled.",
        true
      );

      return;
    }

    updateProfileDisplays(profileToSave);

    showMessage(
      "Profile saved successfully."
    );

    dispatchProfileUpdatedEvent(
      profileToSave
    );
  }

  /**
   * Handle profile reset.
   *
   * The native form reset occurs after the click event,
   * so the preview update is delayed to the next task.
   *
   * @param {MouseEvent} event
   */

  function handleResetButtonClick(event) {
    event.preventDefault();

    const shouldReset =
      window.confirm(
        "Reset the profile form to your original starting details?"
      );

    if (!shouldReset) {
      return;
    }

    populateForm(DEFAULT_PROFILE);

    clearMessage();
    updateLivePreview();

    showMessage(
      "The form has been reset. Select Save profile to keep these values."
    );
  }

  /**
   * Restore the saved profile or use the default starting profile.
   */

  function restoreProfile() {
    const savedProfile =
      window.ELEVEN_STORAGE.getProfile();

    const profile =
      savedProfile || DEFAULT_PROFILE;

    populateForm(profile);
  }

  /**
   * Populate form fields from a profile object.
   *
   * @param {object} profile
   */

  function populateForm(profile) {
    if (!profileForm || !profile) {
      return;
    }

    setFieldValue(
      FIELD_IDS.profileName,
      profile.profileName
    );

    setFieldValue(
      FIELD_IDS.age,
      profile.age
    );

    setFieldValue(
      FIELD_IDS.sex,
      profile.sex
    );

    setFieldValue(
      FIELD_IDS.heightFeet,
      profile.heightFeet
    );

    setFieldValue(
      FIELD_IDS.heightInches,
      profile.heightInches
    );

    setFieldValue(
      FIELD_IDS.currentWeight,
      profile.currentWeight
    );

    setFieldValue(
      FIELD_IDS.goalWeight,
      profile.goalWeight
    );

    setFieldValue(
      FIELD_IDS.activityLevel,
      profile.activityLevel
    );

    const lossRate =
      profile.lossRate || "moderate";

    const lossRateInput =
      profileForm.querySelector(
        `input[name="lossRate"][value="${escapeSelectorValue(
          lossRate
        )}"]`
      );

    if (lossRateInput) {
      lossRateInput.checked = true;
    }
  }

  /**
   * Read and normalize profile form values.
   *
   * @returns {object}
   */

  function getProfileFromForm() {
    if (!profileForm) {
      return {};
    }

    const formData =
      new FormData(profileForm);

    return {
      profileName:
        cleanText(
          formData.get("profileName")
        ),
      age:
        toFiniteNumber(
          formData.get("age")
        ),
      sex:
        cleanText(
          formData.get("sex")
        ),
      heightFeet:
        toFiniteNumber(
          formData.get("heightFeet")
        ),
      heightInches:
        toFiniteNumber(
          formData.get("heightInches")
        ),
      currentWeight:
        toFiniteNumber(
          formData.get("currentWeight")
        ),
      goalWeight:
        toFiniteNumber(
          formData.get("goalWeight")
        ),
      activityLevel:
        cleanText(
          formData.get("activityLevel")
        ),
      lossRate:
        cleanText(
          formData.get("lossRate")
        ) || "moderate"
    };
  }

  /**
   * Validate the profile.
   *
   * @param {object} profile
   * @returns {{
   *   isValid: boolean,
   *   message: string,
   *   fieldName: string|null
   * }}
   */

  function validateProfile(profile) {
    if (!profile.profileName) {
      return invalidResult(
        "Enter a profile name.",
        "profileName"
      );
    }

    if (
      profile.age < 18 ||
      profile.age > 100
    ) {
      return invalidResult(
        "Enter an age between 18 and 100.",
        "age"
      );
    }

    if (
      profile.sex !== "male" &&
      profile.sex !== "female"
    ) {
      return invalidResult(
        "Select the sex used for the calculation.",
        "sex"
      );
    }

    if (
      profile.heightFeet < 4 ||
      profile.heightFeet > 7
    ) {
      return invalidResult(
        "Enter a height between 4 and 7 feet.",
        "heightFeet"
      );
    }

    if (
      profile.heightInches < 0 ||
      profile.heightInches > 11
    ) {
      return invalidResult(
        "Enter height inches between 0 and 11.",
        "heightInches"
      );
    }

    if (
      profile.currentWeight < 80 ||
      profile.currentWeight > 600
    ) {
      return invalidResult(
        "Enter a current weight between 80 and 600 lb.",
        "currentWeight"
      );
    }

    if (
      profile.goalWeight < 80 ||
      profile.goalWeight > 600
    ) {
      return invalidResult(
        "Enter a goal weight between 80 and 600 lb.",
        "goalWeight"
      );
    }

    if (
      profile.goalWeight >=
      profile.currentWeight
    ) {
      return invalidResult(
        "For a weight-loss plan, your goal weight must be lower than your current weight.",
        "goalWeight"
      );
    }

    const validActivityLevels = [
      "sedentary",
      "light",
      "moderate",
      "active",
      "very-active"
    ];

    if (
      !validActivityLevels.includes(
        profile.activityLevel
      )
    ) {
      return invalidResult(
        "Select an activity level.",
        "activityLevel"
      );
    }

    const validLossRates = [
      "conservative",
      "moderate",
      "aggressive"
    ];

    if (
      !validLossRates.includes(
        profile.lossRate
      )
    ) {
      return invalidResult(
        "Select a weight-loss pace.",
        "lossRate"
      );
    }

    return {
      isValid: true,
      message: "",
      fieldName: null
    };
  }

  /**
   * Update the live nutrition preview.
   */

  function updateLivePreview() {
    const profile =
      getProfileFromForm();

    const isReady =
      window.ELEVEN_NUTRITION
        .isValidProfileForCalculation(
          profile
        );

    if (!isReady) {
      setText(
        PREVIEW_IDS.calories,
        "—"
      );

      setText(
        PREVIEW_IDS.protein,
        "—"
      );

      setText(
        PREVIEW_IDS.maintenance,
        "—"
      );

      return;
    }

    const targets =
      window.ELEVEN_NUTRITION
        .calculateProfileTargets(profile);

    if (!targets) {
      return;
    }

    setText(
      PREVIEW_IDS.calories,
      formatCalories(
        targets.calorieTarget
      )
    );

    setText(
      PREVIEW_IDS.protein,
      formatProtein(
        targets.proteinTarget
      )
    );

    setText(
      PREVIEW_IDS.maintenance,
      formatCalories(
        targets.maintenanceCalories
      )
    );
  }

  /**
   * Update profile-related interface content.
   *
   * @param {object|null} suppliedProfile
   */

  function updateProfileDisplays(
    suppliedProfile = null
  ) {
    const profile =
      suppliedProfile ||
      window.ELEVEN_STORAGE.getProfile();

    if (!profile) {
      setText(
        DASHBOARD_IDS.profileName,
        "Your Profile"
      );

      setText(
        DASHBOARD_IDS.calories,
        "—"
      );

      setText(
        DASHBOARD_IDS.protein,
        "—"
      );

      setText(
        DASHBOARD_IDS
          .progressStartingWeight,
        "—"
      );

      setText(
        DASHBOARD_IDS
          .progressCurrentWeight,
        "—"
      );

      setText(
        DASHBOARD_IDS.progressGoalWeight,
        "—"
      );

      setText(
        DASHBOARD_IDS
          .progressTotalChange,
        "—"
      );

      return;
    }

    const targets =
      profile.targets ||
      window.ELEVEN_NUTRITION
        .calculateProfileTargets(profile);

    setText(
      DASHBOARD_IDS.profileName,
      profile.profileName ||
      "Your Profile"
    );

    setSidebarAvatar(
      profile.profileName
    );

    setText(
      DASHBOARD_IDS.calories,
      targets?.calorieTarget
        ? formatCalories(
            targets.calorieTarget
          )
        : "—"
    );

    setText(
      DASHBOARD_IDS.protein,
      targets?.proteinTarget
        ? formatProtein(
            targets.proteinTarget
          )
        : "—"
    );

    setText(
      DASHBOARD_IDS
        .progressStartingWeight,
      formatWeight(
        profile.currentWeight
      )
    );

    setText(
      DASHBOARD_IDS
        .progressGoalWeight,
      formatWeight(
        profile.goalWeight
      )
    );

    updateProgressWeightDisplays(
      profile
    );
  }

  /**
   * Update current weight and total-change summaries.
   *
   * @param {object} profile
   */

  function updateProgressWeightDisplays(
    profile
  ) {
    const progress =
      window.ELEVEN_STORAGE
        .getProgress();

    const weightEntries =
      progress.entries.filter(
        (entry) =>
          Number.isFinite(
            Number(entry.weight)
          )
      );

    const latestEntry =
      weightEntries.length > 0
        ? weightEntries[
            weightEntries.length - 1
          ]
        : null;

    const currentWeight =
      latestEntry?.weight ??
      profile.currentWeight;

    const totalChange =
      currentWeight -
      profile.currentWeight;

    setText(
      DASHBOARD_IDS
        .progressCurrentWeight,
      formatWeight(currentWeight)
    );

    setText(
      DASHBOARD_IDS
        .progressTotalChange,
      formatWeightChange(totalChange)
    );
  }

  /**
   * Set the sidebar avatar initial.
   *
   * @param {string} profileName
   */

  function setSidebarAvatar(
    profileName
  ) {
    const avatar =
      document.querySelector(
        ".profile-avatar"
      );

    if (!avatar) {
      return;
    }

    const cleanedName =
      cleanText(profileName);

    avatar.textContent =
      cleanedName
        ? cleanedName
            .charAt(0)
            .toUpperCase()
        : "E";
  }

  /**
   * Dispatch a custom profile update event.
   *
   * @param {object} profile
   */

  function dispatchProfileUpdatedEvent(
    profile
  ) {
    document.dispatchEvent(
      new CustomEvent(
        "eleven:profile-updated",
        {
          detail: {
            profile
          }
        }
      )
    );
  }

  /**
   * Focus the field associated with a validation error.
   *
   * @param {string|null} fieldName
   */

  function focusField(fieldName) {
    if (!fieldName || !profileForm) {
      return;
    }

    let field = null;

    if (fieldName === "lossRate") {
      field =
        profileForm.querySelector(
          'input[name="lossRate"]'
        );
    } else {
      field =
        profileForm.elements[
          fieldName
        ];
    }

    if (
      field &&
      typeof field.focus ===
        "function"
    ) {
      field.focus();
    }
  }

  /**
   * Show a form status message.
   *
   * @param {string} message
   * @param {boolean} isError
   */

  function showMessage(
    message,
    isError = false
  ) {
    if (!formMessage) {
      return;
    }

    formMessage.textContent =
      message;

    formMessage.classList.toggle(
      "is-error",
      isError
    );
  }

  /**
   * Clear the form status message.
   */

  function clearMessage() {
    showMessage("", false);
  }

  /**
   * Return a standard validation failure.
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
   * Set a form field value.
   *
   * @param {string} elementId
   * @param {*} value
   */

  function setFieldValue(
    elementId,
    value
  ) {
    const field =
      document.getElementById(
        elementId
      );

    if (!field) {
      return;
    }

    field.value =
      value ?? "";
  }

  /**
   * Set an element's text content.
   *
   * @param {string} elementId
   * @param {*} value
   */

  function setText(
    elementId,
    value
  ) {
    const element =
      document.getElementById(
        elementId
      );

    if (!element) {
      return;
    }

    element.textContent =
      value ?? "";
  }

  /**
   * Format calories for display.
   *
   * @param {number} calories
   * @returns {string}
   */

  function formatCalories(calories) {
    const numericCalories =
      toFiniteNumber(calories);

    if (numericCalories <= 0) {
      return "—";
    }

    return `${Math.round(
      numericCalories
    ).toLocaleString("en-CA")} kcal`;
  }

  /**
   * Format protein for display.
   *
   * @param {number} protein
   * @returns {string}
   */

  function formatProtein(protein) {
    const numericProtein =
      toFiniteNumber(protein);

    if (numericProtein <= 0) {
      return "—";
    }

    return `${Math.round(
      numericProtein
    ).toLocaleString("en-CA")} g`;
  }

  /**
   * Format weight for display.
   *
   * @param {number} weight
   * @returns {string}
   */

  function formatWeight(weight) {
    const numericWeight =
      Number(weight);

    if (
      !Number.isFinite(
        numericWeight
      ) ||
      numericWeight <= 0
    ) {
      return "—";
    }

    return `${numericWeight.toLocaleString(
      "en-CA",
      {
        minimumFractionDigits:
          Number.isInteger(
            numericWeight
          )
            ? 0
            : 1,
        maximumFractionDigits: 1
      }
    )} lb`;
  }

  /**
   * Format total weight change.
   *
   * Negative values indicate weight loss.
   *
   * @param {number} change
   * @returns {string}
   */

  function formatWeightChange(
    change
  ) {
    const numericChange =
      toFiniteNumber(change);

    if (numericChange === 0) {
      return "0 lb";
    }

    const sign =
      numericChange > 0
        ? "+"
        : "";

    return `${sign}${numericChange.toLocaleString(
      "en-CA",
      {
        minimumFractionDigits:
          Number.isInteger(
            numericChange
          )
            ? 0
            : 1,
        maximumFractionDigits: 1
      }
    )} lb`;
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
   * Convert a value into a safe finite number.
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
   * Safely escape a value used in an attribute selector.
   *
   * @param {*} value
   * @returns {string}
   */

  function escapeSelectorValue(
    value
  ) {
    const text =
      String(value ?? "");

    if (
      window.CSS &&
      typeof window.CSS.escape ===
        "function"
    ) {
      return window.CSS.escape(text);
    }

    return text.replace(
      /["\\]/g,
      "\\$&"
    );
  }

  return {
    init,
    restoreProfile,
    populateForm,
    getProfileFromForm,
    validateProfile,
    updateLivePreview,
    updateProfileDisplays,
    defaults: {
      ...DEFAULT_PROFILE
    }
  };
})();
