"use strict";

/**
 * Eleven application controller
 *
 * This is the main entry point for the application.
 *
 * Responsibilities:
 *
 * - Initialize application modules
 * - Control navigation
 * - Manage the mobile menu
 * - Restore the last active section
 * - Update dashboard setup progress
 * - React to profile and preference updates
 */

window.ELEVEN_APP = (() => {
  const VALID_SECTION_IDS = [
    "dashboard",
    "profile",
    "preferences",
    "meal-plan",
    "grocery-list",
    "progress"
  ];

  const SETUP_STEPS = {
    profile: 1,
    preferences: 2,
    mealPlan: 3
  };

  let initialized = false;
  let activeSectionId = "dashboard";

  let sidebar = null;
  let mobileMenuButton = null;
  let navigationLinks = [];
  let appSections = [];
  let goToButtons = [];

  /**
   * Initialize the application.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      return true;
    }

    cacheElements();

    if (!sidebar || appSections.length === 0) {
      console.error(
        "Eleven could not find the required application layout."
      );

      return false;
    }

    bindEvents();
    initializeModules();
    restoreApplicationState();
    refreshDashboard();

    initialized = true;

    document.documentElement.classList.add(
      "eleven-ready"
    );

    document.dispatchEvent(
      new CustomEvent("eleven:app-ready")
    );

    return true;
  }

  /**
   * Cache frequently used DOM elements.
   */

  function cacheElements() {
    sidebar =
      document.getElementById("sidebar");

    mobileMenuButton =
      document.getElementById(
        "mobile-menu-button"
      );

    navigationLinks = Array.from(
      document.querySelectorAll(
        ".navigation-link[data-section]"
      )
    );

    appSections = Array.from(
      document.querySelectorAll(
        "[data-app-section]"
      )
    );

    goToButtons = Array.from(
      document.querySelectorAll(
        "[data-go-to]"
      )
    );
  }

  /**
   * Bind application events.
   */

  function bindEvents() {
    navigationLinks.forEach((link) => {
      link.addEventListener(
        "click",
        handleNavigationClick
      );
    });

    goToButtons.forEach((button) => {
      button.addEventListener(
        "click",
        handleGoToClick
      );
    });

    if (mobileMenuButton) {
      mobileMenuButton.addEventListener(
        "click",
        toggleMobileMenu
      );
    }

    document.addEventListener(
      "click",
      handleDocumentClick
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "resize",
      handleWindowResize
    );

    window.addEventListener(
      "hashchange",
      handleHashChange
    );

    document.addEventListener(
      "eleven:profile-updated",
      handleApplicationDataUpdated
    );

    document.addEventListener(
      "eleven:preferences-updated",
      handleApplicationDataUpdated
    );

    document.addEventListener(
      "eleven:meal-plan-updated",
      handleApplicationDataUpdated
    );

    document.addEventListener(
      "eleven:progress-updated",
      handleApplicationDataUpdated
    );

    document.addEventListener(
      "storage",
      handleStorageEvent
    );
  }

  /**
   * Initialize available feature modules.
   */

  function initializeModules() {
    if (
      window.ELEVEN_PROFILE &&
      typeof window.ELEVEN_PROFILE.init ===
        "function"
    ) {
      window.ELEVEN_PROFILE.init();
    }

    if (
  window.ELEVEN_CUSTOM_FOODS &&
  typeof window.ELEVEN_CUSTOM_FOODS.init ===
    "function"
) {
  window.ELEVEN_CUSTOM_FOODS.init();
}

    if (
      window.ELEVEN_PREFERENCES &&
      typeof window.ELEVEN_PREFERENCES.init ===
        "function"
    ) {
      window.ELEVEN_PREFERENCES.init();
    }

    if (
      window.ELEVEN_MEAL_GENERATOR &&
      typeof window.ELEVEN_MEAL_GENERATOR.init ===
        "function"
    ) {
      window.ELEVEN_MEAL_GENERATOR.init();
    }

if (
  window.ELEVEN_CALENDAR &&
  typeof window.ELEVEN_CALENDAR.init ===
    "function"
) {
  window.ELEVEN_CALENDAR.init();
}
    
if (
  window.ELEVEN_GROCERY &&
  typeof window.ELEVEN_GROCERY.init ===
    "function"
) {
  window.ELEVEN_GROCERY.init();
}
    
if (
  window.ELEVEN_DASHBOARD &&
  typeof window.ELEVEN_DASHBOARD.init ===
    "function"
) {
  window.ELEVEN_DASHBOARD.init();
}
    
    if (
      window.ELEVEN_GROCERY &&
      typeof window.ELEVEN_GROCERY.init ===
        "function"
    ) {
      window.ELEVEN_GROCERY.init();
    }

    if (
      window.ELEVEN_PROGRESS &&
      typeof window.ELEVEN_PROGRESS.init ===
        "function"
    ) {
      window.ELEVEN_PROGRESS.init();
    }
  }

  /**
   * Restore the user's last active application section.
   */

  function restoreApplicationState() {
    const hashSection =
      getSectionFromHash();

    const storedSection =
      window.ELEVEN_STORAGE
        ? window.ELEVEN_STORAGE
            .getAppState()
            .activeSection
        : null;

    const sectionToOpen =
      isValidSection(hashSection)
        ? hashSection
        : isValidSection(storedSection)
          ? storedSection
          : "dashboard";

    showSection(sectionToOpen, {
      updateHash: true,
      saveState: false,
      scrollToTop: false
    });
  }

  /**
   * Handle sidebar navigation.
   *
   * @param {MouseEvent} event
   */

  function handleNavigationClick(event) {
    const sectionId =
      event.currentTarget.dataset.section;

    showSection(sectionId);

    closeMobileMenu();
  }

  /**
   * Handle buttons that navigate to another section.
   *
   * @param {MouseEvent} event
   */

  function handleGoToClick(event) {
    const sectionId =
      event.currentTarget.dataset.goTo;

    showSection(sectionId);

    closeMobileMenu();
  }

  /**
   * Show one application section.
   *
   * @param {string} sectionId
   * @param {object} options
   * @returns {boolean}
   */

  function showSection(
    sectionId,
    options = {}
  ) {
    const settings = {
      updateHash: true,
      saveState: true,
      scrollToTop: true,
      ...options
    };

    if (!isValidSection(sectionId)) {
      return false;
    }

    const targetSection =
      document.getElementById(sectionId);

    if (!targetSection) {
      return false;
    }

    appSections.forEach((section) => {
      const isTarget =
        section.id === sectionId;

      section.hidden = !isTarget;

      section.classList.toggle(
        "is-active",
        isTarget
      );

      section.setAttribute(
        "aria-hidden",
        String(!isTarget)
      );
    });

    navigationLinks.forEach((link) => {
      const isActive =
        link.dataset.section === sectionId;

      link.classList.toggle(
        "is-active",
        isActive
      );

      if (isActive) {
        link.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        link.removeAttribute(
          "aria-current"
        );
      }
    });

    activeSectionId = sectionId;

    if (
      settings.saveState &&
      window.ELEVEN_STORAGE
    ) {
      window.ELEVEN_STORAGE
        .saveActiveSection(sectionId);
    }

    if (settings.updateHash) {
      updateHash(sectionId);
    }

    if (settings.scrollToTop) {
      window.scrollTo({
        top: 0,
        behavior:
          prefersReducedMotion()
            ? "auto"
            : "smooth"
      });
    }

    document.dispatchEvent(
      new CustomEvent(
        "eleven:section-changed",
        {
          detail: {
            sectionId
          }
        }
      )
    );

    return true;
  }

  /**
   * Open or close the mobile menu.
   */

  function toggleMobileMenu() {
    if (!sidebar) {
      return;
    }

    const shouldOpen =
      !sidebar.classList.contains(
        "is-open"
      );

    setMobileMenuState(shouldOpen);
  }

  /**
   * Close the mobile menu.
   */

  function closeMobileMenu() {
    setMobileMenuState(false);
  }

  /**
   * Set the mobile menu state.
   *
   * @param {boolean} isOpen
   */

  function setMobileMenuState(isOpen) {
    if (!sidebar) {
      return;
    }

    sidebar.classList.toggle(
      "is-open",
      isOpen
    );

    document.body.classList.toggle(
      "menu-open",
      isOpen
    );

    if (mobileMenuButton) {
      mobileMenuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

      mobileMenuButton.setAttribute(
        "aria-label",
        isOpen
          ? "Close navigation"
          : "Open navigation"
      );
    }
  }

  /**
   * Close the mobile menu when clicking outside it.
   *
   * @param {MouseEvent} event
   */

  function handleDocumentClick(event) {
    if (
      !sidebar ||
      !sidebar.classList.contains(
        "is-open"
      )
    ) {
      return;
    }

    const clickedInsideSidebar =
      sidebar.contains(event.target);

    const clickedMenuButton =
      mobileMenuButton &&
      mobileMenuButton.contains(
        event.target
      );

    if (
      !clickedInsideSidebar &&
      !clickedMenuButton
    ) {
      closeMobileMenu();
    }
  }

  /**
   * Handle Escape-key behaviour.
   *
   * @param {KeyboardEvent} event
   */

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  }

  /**
   * Close the mobile menu after switching to desktop width.
   */

  function handleWindowResize() {
    if (window.innerWidth > 900) {
      closeMobileMenu();
    }
  }

  /**
   * Respond to browser hash navigation.
   */

  function handleHashChange() {
    const sectionId =
      getSectionFromHash();

    if (
      sectionId &&
      sectionId !== activeSectionId
    ) {
      showSection(sectionId, {
        updateHash: false,
        saveState: true,
        scrollToTop: true
      });
    }
  }

  /**
   * Refresh the interface when application data changes.
   */

  function handleApplicationDataUpdated() {
    refreshDashboard();

    if (
      window.ELEVEN_PROFILE &&
      typeof window.ELEVEN_PROFILE
        .updateProfileDisplays ===
        "function"
    ) {
      window.ELEVEN_PROFILE
        .updateProfileDisplays();
    }
  }

  /**
   * Refresh when Eleven data changes in another browser tab.
   *
   * @param {StorageEvent} event
   */

  function handleStorageEvent(event) {
    if (
      event.key &&
      event.key.startsWith("eleven:")
    ) {
      refreshDashboard();

      if (
        PROFILE &&
        typeof window.ELEVEN_PROFILE
          .updateProfileDisplays ===
          "function"
      ) {
        window.ELEVEN_PROFILE
          .updateProfileDisplays();
      }
    }
  }

  /**
   * Refresh dashboard summaries and setup progress.
   */

  function refreshDashboard() {
    const profile =
      window.ELEVEN_STORAGE
        ? window.ELEVEN_STORAGE
            .getProfile()
        : null;

    const preferences =
      window.ELEVEN_STORAGE
        ? window.ELEVEN_STORAGE
            .getPreferences()
        : {
            selectedFoodIds: []
          };

    const mealPlan =
      window.ELEVEN_STORAGE
        ? window.ELEVEN_STORAGE
            .getMealPlan()
        : null;

    updateFoodCounts(
      preferences.selectedFoodIds
    );

    updateMealPlanStatus(mealPlan);

    updateSetupProgress({
      profileComplete:
        Boolean(
          profile &&
          window.ELEVEN_STORAGE &&
          window.ELEVEN_STORAGE
            .isProfileComplete(profile)
        ),
      preferencesComplete:
        Array.isArray(
          preferences.selectedFoodIds
        ) &&
        preferences.selectedFoodIds
          .length > 0,
      mealPlanGenerated:
        Boolean(mealPlan)
    });
  }

  /**
   * Update selected-food counts.
   *
   * @param {string[]} selectedFoodIds
   */

  function updateFoodCounts(
    selectedFoodIds = []
  ) {
    const count = Array.isArray(
      selectedFoodIds
    )
      ? selectedFoodIds.length
      : 0;

    setText(
      "dashboard-food-count",
      String(count)
    );

    setText(
      "preference-food-count",
      String(count)
    );
  }

  /**
   * Update the dashboard's cycle status.
   *
   * @param {object|null} mealPlan
   */

  function updateMealPlanStatus(
    mealPlan
  ) {
    const statusElement =
      document.getElementById(
        "dashboard-cycle-status"
      );

    if (!statusElement) {
      return;
    }

    if (!mealPlan) {
      statusElement.textContent =
        "Not started";

      return;
    }

    const completedDays =
      Array.isArray(
        mealPlan.completedDays
      )
        ? mealPlan.completedDays.length
        : 0;

    if (completedDays <= 0) {
      statusElement.textContent =
        "Ready to begin";

      return;
    }

    if (completedDays >= 11) {
      statusElement.textContent =
        "Cycle complete";

      return;
    }

    statusElement.textContent =
      `Day ${Math.min(
        completedDays + 1,
        11
      )} of 11`;
  }

  /**
   * Update setup completion progress.
   *
   * @param {object} state
   */

  function updateSetupProgress(state) {
    const completedSteps = [
      state.profileComplete,
      state.preferencesComplete,
      state.mealPlanGenerated
    ].filter(Boolean).length;

    const percentage =
      Math.round(
        completedSteps /
        Object.keys(SETUP_STEPS).length *
        100
      );

    setText(
      "setup-percentage",
      `${percentage}%`
    );

    const progressBar =
      document.getElementById(
        "setup-progress-bar"
      );

    if (progressBar) {
      progressBar.style.width =
        `${percentage}%`;

      progressBar.setAttribute(
        "aria-valuenow",
        String(percentage)
      );
    }

    const setupItems =
      document.querySelectorAll(
        ".setup-item"
      );

    setupItems.forEach(
      (item, index) => {
        let isComplete = false;

        if (index === 0) {
          isComplete =
            state.profileComplete;
        }

        if (index === 1) {
          isComplete =
            state.preferencesComplete;
        }

        if (index === 2) {
          isComplete =
            state.mealPlanGenerated;
        }

        item.classList.toggle(
          "is-complete",
          isComplete
        );

        const status =
          item.querySelector(
            ".setup-status"
          );

        if (status) {
          status.textContent =
            isComplete
              ? "✓"
              : String(index + 1);
        }
      }
    );

    if (
      window.ELEVEN_STORAGE
    ) {
      window.ELEVEN_STORAGE
        .updateAppState({
          profileComplete:
            state.profileComplete,
          preferencesComplete:
            state.preferencesComplete,
          mealPlanGenerated:
            state.mealPlanGenerated,
          onboardingComplete:
            completedSteps === 3
        });
    }
  }

  /**
   * Update the browser hash without forcing a second navigation.
   *
   * @param {string} sectionId
   */

  function updateHash(sectionId) {
    const nextHash = `#${sectionId}`;

    if (
      window.location.hash ===
      nextHash
    ) {
      return;
    }

    if (
      window.history &&
      typeof window.history
        .replaceState ===
        "function"
    ) {
      window.history.replaceState(
        null,
        "",
        nextHash
      );
    } else {
      window.location.hash =
        sectionId;
    }
  }

  /**
   * Return a section ID from the browser hash.
   *
   * @returns {string|null}
   */

  function getSectionFromHash() {
    const hash =
      window.location.hash
        .replace(/^#/, "")
        .trim();

    return isValidSection(hash)
      ? hash
      : null;
  }

  /**
   * Validate a section ID.
   *
   * @param {*} sectionId
   * @returns {boolean}
   */

  function isValidSection(sectionId) {
    return VALID_SECTION_IDS.includes(
      String(sectionId || "")
    );
  }

  /**
   * Set element text.
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

    if (element) {
      element.textContent =
        value ?? "";
    }
  }

  /**
   * Detect reduced-motion preference.
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

  return {
    init,
    showSection,
    refreshDashboard,
    closeMobileMenu,
    getActiveSection() {
      return activeSectionId;
    }
  };
})();

/**
 * Start Eleven once the document is ready.
 */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      window.ELEVEN_APP.init();
    }
  );
} else {
  window.ELEVEN_APP.init();
}
