"use strict";

/**
 * Eleven browser storage service
 *
 * This module stores application data in localStorage.
 *
 * No account, server, or database is required for the first version.
 * Data remains inside the current browser unless the user clears it.
 */

window.ELEVEN_STORAGE = (() => {
  const STORAGE_PREFIX = "eleven";

  const STORAGE_KEYS = {
    profile: `${STORAGE_PREFIX}:profile`,
    preferences: `${STORAGE_PREFIX}:preferences`,
    mealPlan: `${STORAGE_PREFIX}:meal-plan`,
    progress: `${STORAGE_PREFIX}:progress`,
    settings: `${STORAGE_PREFIX}:settings`,
    appState: `${STORAGE_PREFIX}:app-state`
  };

  const DEFAULT_PREFERENCES = {
    selectedFoodIds: [],
    excludedFoods: [],
    updatedAt: null
  };

  const DEFAULT_PROGRESS = {
    entries: [],
    updatedAt: null
  };

  const DEFAULT_SETTINGS = {
    mealsPerDay: 4,
    preferredCookingMethods: [],
    useMetricMeasurements: false,
    showNutritionDetails: true,
    updatedAt: null
  };

  const DEFAULT_APP_STATE = {
    activeSection: "dashboard",
    profileComplete: false,
    preferencesComplete: false,
    mealPlanGenerated: false,
    onboardingComplete: false,
    updatedAt: null
  };

  /**
   * Check whether localStorage is available.
   *
   * Some browsers may block storage in private or restricted modes.
   *
   * @returns {boolean}
   */

  function isAvailable() {
    try {
      const testKey = `${STORAGE_PREFIX}:storage-test`;

      window.localStorage.setItem(
        testKey,
        "available"
      );

      window.localStorage.removeItem(
        testKey
      );

      return true;
    } catch (error) {
      console.warn(
        "Eleven storage is unavailable.",
        error
      );

      return false;
    }
  }

  /**
   * Save a value to localStorage.
   *
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */

  function save(key, value) {
    if (!isAvailable()) {
      return false;
    }

    try {
      const storageValue = {
        value,
        savedAt: new Date().toISOString(),
        storageVersion: 1
      };

      window.localStorage.setItem(
        key,
        JSON.stringify(storageValue)
      );

      return true;
    } catch (error) {
      console.error(
        `Unable to save Eleven data for ${key}.`,
        error
      );

      return false;
    }
  }

  /**
   * Read a value from localStorage.
   *
   * @param {string} key
   * @param {*} fallbackValue
   * @returns {*}
   */

  function load(key, fallbackValue = null) {
    if (!isAvailable()) {
      return cloneValue(fallbackValue);
    }

    try {
      const storedValue =
        window.localStorage.getItem(key);

      if (!storedValue) {
        return cloneValue(fallbackValue);
      }

      const parsedValue =
        JSON.parse(storedValue);

      if (
        parsedValue &&
        Object.prototype.hasOwnProperty.call(
          parsedValue,
          "value"
        )
      ) {
        return parsedValue.value;
      }

      // Supports older unwrapped storage values if needed.
      return parsedValue;
    } catch (error) {
      console.error(
        `Unable to read Eleven data for ${key}.`,
        error
      );

      return cloneValue(fallbackValue);
    }
  }

  /**
   * Remove one stored value.
   *
   * @param {string} key
   * @returns {boolean}
   */

  function remove(key) {
    if (!isAvailable()) {
      return false;
    }

    try {
      window.localStorage.removeItem(key);

      return true;
    } catch (error) {
      console.error(
        `Unable to remove Eleven data for ${key}.`,
        error
      );

      return false;
    }
  }

  /**
   * Save the user profile.
   *
   * @param {object} profile
   * @returns {boolean}
   */

  function saveProfile(profile) {
    if (!profile || typeof profile !== "object") {
      return false;
    }

    const normalizedProfile = {
      profileName:
        cleanText(profile.profileName),
      age: toFiniteNumber(profile.age),
      sex: cleanText(profile.sex),
      heightFeet:
        toFiniteNumber(profile.heightFeet),
      heightInches:
        toFiniteNumber(profile.heightInches),
      currentWeight:
        toFiniteNumber(profile.currentWeight),
      goalWeight:
        toFiniteNumber(profile.goalWeight),
      activityLevel:
        cleanText(profile.activityLevel),
      lossRate:
        cleanText(profile.lossRate) ||
        "moderate",
      targets:
        profile.targets &&
        typeof profile.targets === "object"
          ? cloneValue(profile.targets)
          : null,
      createdAt:
        profile.createdAt ||
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    const saved = save(
      STORAGE_KEYS.profile,
      normalizedProfile
    );

    if (saved) {
      updateAppState({
        profileComplete:
          isProfileComplete(normalizedProfile)
      });
    }

    return saved;
  }

  /**
   * Read the user profile.
   *
   * @returns {object|null}
   */

  function getProfile() {
    return load(
      STORAGE_KEYS.profile,
      null
    );
  }

  /**
   * Delete the user profile.
   *
   * @returns {boolean}
   */

  function deleteProfile() {
    const removed = remove(
      STORAGE_KEYS.profile
    );

    if (removed) {
      updateAppState({
        profileComplete: false,
        onboardingComplete: false
      });
    }

    return removed;
  }

  /**
   * Save food preferences.
   *
   * @param {object} preferences
   * @returns {boolean}
   */

  function savePreferences(preferences = {}) {
    const selectedFoodIds = normalizeStringArray(
      preferences.selectedFoodIds
    );

    const excludedFoods = normalizeExcludedFoods(
      preferences.excludedFoods
    );

    const normalizedPreferences = {
      selectedFoodIds,
      excludedFoods,
      updatedAt: new Date().toISOString()
    };

    const saved = save(
      STORAGE_KEYS.preferences,
      normalizedPreferences
    );

    if (saved) {
      updateAppState({
        preferencesComplete:
          selectedFoodIds.length > 0
      });
    }

    return saved;
  }

  /**
   * Read food preferences.
   *
   * @returns {object}
   */

  function getPreferences() {
    const storedPreferences = load(
      STORAGE_KEYS.preferences,
      DEFAULT_PREFERENCES
    );

    return {
      ...cloneValue(DEFAULT_PREFERENCES),
      ...storedPreferences,
      selectedFoodIds:
        normalizeStringArray(
          storedPreferences?.selectedFoodIds
        ),
      excludedFoods:
        normalizeExcludedFoods(
          storedPreferences?.excludedFoods
        )
    };
  }

  /**
   * Delete food preferences.
   *
   * @returns {boolean}
   */

  function deletePreferences() {
    const removed = remove(
      STORAGE_KEYS.preferences
    );

    if (removed) {
      updateAppState({
        preferencesComplete: false,
        onboardingComplete: false
      });
    }

    return removed;
  }

  /**
   * Save an 11-day meal plan.
   *
   * @param {object} mealPlan
   * @returns {boolean}
   */

  function saveMealPlan(mealPlan) {
    if (!mealPlan || typeof mealPlan !== "object") {
      return false;
    }

    const normalizedMealPlan = {
      ...cloneValue(mealPlan),
      createdAt:
        mealPlan.createdAt ||
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    const saved = save(
      STORAGE_KEYS.mealPlan,
      normalizedMealPlan
    );

    if (saved) {
      updateAppState({
        mealPlanGenerated: true,
        onboardingComplete: true
      });
    }

    return saved;
  }

  /**
   * Read the current meal plan.
   *
   * @returns {object|null}
   */

  function getMealPlan() {
    return load(
      STORAGE_KEYS.mealPlan,
      null
    );
  }

  /**
   * Delete the current meal plan.
   *
   * @returns {boolean}
   */

  function deleteMealPlan() {
    const removed = remove(
      STORAGE_KEYS.mealPlan
    );

    if (removed) {
      updateAppState({
        mealPlanGenerated: false,
        onboardingComplete: false
      });
    }

    return removed;
  }

  /**
   * Read progress data.
   *
   * @returns {object}
   */

  function getProgress() {
    const progress = load(
      STORAGE_KEYS.progress,
      DEFAULT_PROGRESS
    );

    return {
      ...cloneValue(DEFAULT_PROGRESS),
      ...progress,
      entries: Array.isArray(progress?.entries)
        ? progress.entries
        : []
    };
  }

  /**
   * Add a progress entry.
   *
   * @param {object} entry
   * @returns {object|null}
   */

  function addProgressEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const progress = getProgress();

    const normalizedEntry = {
      id:
        entry.id ||
        createId("progress"),
      date:
        normalizeDate(entry.date) ||
        getTodayDateString(),
      weight:
        toNullableNumber(entry.weight),
      waist:
        toNullableNumber(entry.waist),
      bodyFat:
        toNullableNumber(entry.bodyFat),
      notes:
        cleanText(entry.notes),
      createdAt:
        entry.createdAt ||
        new Date().toISOString()
    };

    progress.entries.push(
      normalizedEntry
    );

    progress.entries.sort(
      (firstEntry, secondEntry) =>
        firstEntry.date.localeCompare(
          secondEntry.date
        )
    );

    progress.updatedAt =
      new Date().toISOString();

    const saved = save(
      STORAGE_KEYS.progress,
      progress
    );

    return saved
      ? normalizedEntry
      : null;
  }

  /**
   * Update one progress entry.
   *
   * @param {string} entryId
   * @param {object} updates
   * @returns {object|null}
   */

  function updateProgressEntry(
    entryId,
    updates
  ) {
    const progress = getProgress();

    const entryIndex =
      progress.entries.findIndex(
        (entry) => entry.id === entryId
      );

    if (entryIndex === -1) {
      return null;
    }

    const currentEntry =
      progress.entries[entryIndex];

    const updatedEntry = {
      ...currentEntry,
      ...cloneValue(updates),
      id: currentEntry.id,
      date:
        normalizeDate(
          updates?.date ||
          currentEntry.date
        ) ||
        currentEntry.date,
      weight:
        updates &&
        Object.prototype.hasOwnProperty.call(
          updates,
          "weight"
        )
          ? toNullableNumber(
              updates.weight
            )
          : currentEntry.weight,
      waist:
        updates &&
        Object.prototype.hasOwnProperty.call(
          updates,
          "waist"
        )
          ? toNullableNumber(
              updates.waist
            )
          : currentEntry.waist,
      bodyFat:
        updates &&
        Object.prototype.hasOwnProperty.call(
          updates,
          "bodyFat"
        )
          ? toNullableNumber(
              updates.bodyFat
            )
          : currentEntry.bodyFat,
      notes:
        updates &&
        Object.prototype.hasOwnProperty.call(
          updates,
          "notes"
        )
          ? cleanText(updates.notes)
          : currentEntry.notes,
      updatedAt:
        new Date().toISOString()
    };

    progress.entries[entryIndex] =
      updatedEntry;

    progress.entries.sort(
      (firstEntry, secondEntry) =>
        firstEntry.date.localeCompare(
          secondEntry.date
        )
    );

    progress.updatedAt =
      new Date().toISOString();

    const saved = save(
      STORAGE_KEYS.progress,
      progress
    );

    return saved
      ? updatedEntry
      : null;
  }

  /**
   * Delete one progress entry.
   *
   * @param {string} entryId
   * @returns {boolean}
   */

  function deleteProgressEntry(entryId) {
    const progress = getProgress();

    const originalCount =
      progress.entries.length;

    progress.entries =
      progress.entries.filter(
        (entry) => entry.id !== entryId
      );

    if (
      progress.entries.length ===
      originalCount
    ) {
      return false;
    }

    progress.updatedAt =
      new Date().toISOString();

    return save(
      STORAGE_KEYS.progress,
      progress
    );
  }

  /**
   * Delete every progress entry.
   *
   * @returns {boolean}
   */

  function clearProgress() {
    return remove(
      STORAGE_KEYS.progress
    );
  }

  /**
   * Save application settings.
   *
   * @param {object} settings
   * @returns {boolean}
   */

  function saveSettings(settings = {}) {
    const currentSettings =
      getSettings();

    const normalizedSettings = {
      ...currentSettings,
      ...cloneValue(settings),
      mealsPerDay: clampInteger(
        settings.mealsPerDay ??
        currentSettings.mealsPerDay,
        3,
        5
      ),
      preferredCookingMethods:
        normalizeStringArray(
          settings.preferredCookingMethods ??
          currentSettings
            .preferredCookingMethods
        ),
      useMetricMeasurements:
        Boolean(
          settings.useMetricMeasurements ??
          currentSettings
            .useMetricMeasurements
        ),
      showNutritionDetails:
        Boolean(
          settings.showNutritionDetails ??
          currentSettings
            .showNutritionDetails
        ),
      updatedAt:
        new Date().toISOString()
    };

    return save(
      STORAGE_KEYS.settings,
      normalizedSettings
    );
  }

  /**
   * Read application settings.
   *
   * @returns {object}
   */

  function getSettings() {
    return {
      ...cloneValue(DEFAULT_SETTINGS),
      ...load(
        STORAGE_KEYS.settings,
        DEFAULT_SETTINGS
      )
    };
  }

  /**
   * Update application state.
   *
   * @param {object} updates
   * @returns {boolean}
   */

  function updateAppState(updates = {}) {
    const currentState =
      getAppState();

    const updatedState = {
      ...currentState,
      ...cloneValue(updates),
      updatedAt:
        new Date().toISOString()
    };

    return save(
      STORAGE_KEYS.appState,
      updatedState
    );
  }

  /**
   * Read application state.
   *
   * @returns {object}
   */

  function getAppState() {
    return {
      ...cloneValue(DEFAULT_APP_STATE),
      ...load(
        STORAGE_KEYS.appState,
        DEFAULT_APP_STATE
      )
    };
  }

  /**
   * Save the active navigation section.
   *
   * @param {string} sectionId
   * @returns {boolean}
   */

  function saveActiveSection(sectionId) {
    const cleanedSectionId =
      cleanText(sectionId);

    if (!cleanedSectionId) {
      return false;
    }

    return updateAppState({
      activeSection: cleanedSectionId
    });
  }

  /**
   * Return a complete export of all stored Eleven data.
   *
   * @returns {object}
   */

  function exportAllData() {
    return {
      exportedAt:
        new Date().toISOString(),
      appName: "Eleven",
      exportVersion: 1,
      profile: getProfile(),
      preferences: getPreferences(),
      mealPlan: getMealPlan(),
      progress: getProgress(),
      settings: getSettings(),
      appState: getAppState()
    };
  }

  /**
   * Import a previously exported Eleven data object.
   *
   * @param {object} data
   * @returns {boolean}
   */

  function importAllData(data) {
    if (!data || typeof data !== "object") {
      return false;
    }

    try {
      if (data.profile) {
        saveProfile(data.profile);
      }

      if (data.preferences) {
        savePreferences(data.preferences);
      }

      if (data.mealPlan) {
        saveMealPlan(data.mealPlan);
      }

      if (data.progress) {
        save(
          STORAGE_KEYS.progress,
          data.progress
        );
      }

      if (data.settings) {
        saveSettings(data.settings);
      }

      if (data.appState) {
        updateAppState(data.appState);
      }

      return true;
    } catch (error) {
      console.error(
        "Unable to import Eleven data.",
        error
      );

      return false;
    }
  }

  /**
   * Remove all Eleven data from this browser.
   *
   * @returns {boolean}
   */

  function clearAllData() {
    if (!isAvailable()) {
      return false;
    }

    try {
      Object.values(
        STORAGE_KEYS
      ).forEach((key) => {
        window.localStorage.removeItem(key);
      });

      return true;
    } catch (error) {
      console.error(
        "Unable to clear Eleven data.",
        error
      );

      return false;
    }
  }

  /**
   * Return lightweight storage statistics.
   *
   * @returns {object}
   */

  function getStorageSummary() {
    const profile = getProfile();
    const preferences = getPreferences();
    const mealPlan = getMealPlan();
    const progress = getProgress();

    return {
      storageAvailable: isAvailable(),
      hasProfile: Boolean(profile),
      selectedFoodCount:
        preferences.selectedFoodIds.length,
      excludedFoodCount:
        preferences.excludedFoods.length,
      hasMealPlan: Boolean(mealPlan),
      progressEntryCount:
        progress.entries.length
    };
  }

  /**
   * Determine whether a profile contains all required fields.
   *
   * @param {object} profile
   * @returns {boolean}
   */

  function isProfileComplete(profile) {
    if (!profile) {
      return false;
    }

    return Boolean(
      cleanText(profile.profileName) &&
      toFiniteNumber(profile.age) >= 18 &&
      (
        profile.sex === "male" ||
        profile.sex === "female"
      ) &&
      toFiniteNumber(profile.heightFeet) > 0 &&
      toFiniteNumber(profile.heightInches) >= 0 &&
      toFiniteNumber(profile.currentWeight) > 0 &&
      toFiniteNumber(profile.goalWeight) > 0 &&
      cleanText(profile.activityLevel) &&
      cleanText(profile.lossRate)
    );
  }

  /**
   * Convert a comma-separated string or array into a clean list.
   *
   * @param {string|string[]} value
   * @returns {string[]}
   */

  function normalizeExcludedFoods(value) {
    const items = Array.isArray(value)
      ? value
      : String(value || "").split(",");

    return [
      ...new Set(
        items
          .map((item) =>
            cleanText(item).toLowerCase()
          )
          .filter(Boolean)
      )
    ];
  }

  /**
   * Clean and deduplicate a string array.
   *
   * @param {*} value
   * @returns {string[]}
   */

  function normalizeStringArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return [
      ...new Set(
        value
          .map(cleanText)
          .filter(Boolean)
      )
    ];
  }

  /**
   * Create a serializable copy of a value.
   *
   * @param {*} value
   * @returns {*}
   */

  function cloneValue(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return value;
    }

    try {
      return JSON.parse(
        JSON.stringify(value)
      );
    } catch (error) {
      return value;
    }
  }

  /**
   * Convert a value into trimmed text.
   *
   * @param {*} value
   * @returns {string}
   */

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  /**
   * Convert a value into a finite number.
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
   * Convert a value into a nullable number.
   *
   * @param {*} value
   * @returns {number|null}
   */

  function toNullableNumber(value) {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  /**
   * Restrict a number to an integer range.
   *
   * @param {*} value
   * @param {number} minimum
   * @param {number} maximum
   * @returns {number}
   */

  function clampInteger(
    value,
    minimum,
    maximum
  ) {
    const number = Math.round(
      toFiniteNumber(value)
    );

    return Math.min(
      Math.max(number, minimum),
      maximum
    );
  }

  /**
   * Normalize a date into YYYY-MM-DD.
   *
   * @param {*} value
   * @returns {string|null}
   */

  function normalizeDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return null;
    }

    return date
      .toISOString()
      .slice(0, 10);
  }

  /**
   * Return today's local date as YYYY-MM-DD.
   *
   * @returns {string}
   */

  function getTodayDateString() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /**
   * Create a lightweight unique ID.
   *
   * @param {string} prefix
   * @returns {string}
   */

  function createId(prefix = "item") {
    const randomValue = Math.random()
      .toString(36)
      .slice(2, 10);

    return [
      prefix,
      Date.now(),
      randomValue
    ].join("-");
  }

  return {
    keys: { ...STORAGE_KEYS },

    defaults: {
      preferences:
        cloneValue(DEFAULT_PREFERENCES),
      progress:
        cloneValue(DEFAULT_PROGRESS),
      settings:
        cloneValue(DEFAULT_SETTINGS),
      appState:
        cloneValue(DEFAULT_APP_STATE)
    },

    isAvailable,
    save,
    load,
    remove,

    saveProfile,
    getProfile,
    deleteProfile,

    savePreferences,
    getPreferences,
    deletePreferences,

    saveMealPlan,
    getMealPlan,
    deleteMealPlan,

    getProgress,
    addProgressEntry,
    updateProgressEntry,
    deleteProgressEntry,
    clearProgress,

    saveSettings,
    getSettings,

    updateAppState,
    getAppState,
    saveActiveSection,

    exportAllData,
    importAllData,
    clearAllData,
    getStorageSummary,
    isProfileComplete
  };
})();
