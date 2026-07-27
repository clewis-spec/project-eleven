"use strict";

/**
 * Eleven calendar controller
 *
 * Responsibilities:
 *
 * - Create the interactive Eleven Cycle View
 * - Connect the cycle timeline, selected-day card, and progress engine
 * - Restore the user's last selected day
 * - Respond to day-selection events
 * - Respond to day-completion requests
 * - Save and refresh cycle progress
 * - Keep the dashboard and meal plan synchronized
 * - Display empty, error, and completed-cycle states
 */

window.ELEVEN_CALENDAR = (() => {
  const VERSION = 1;

  const STORAGE_KEYS = {
    selectedDay:
      "eleven.calendar.selectedDay"
  };

  const POSSIBLE_SECTION_IDS = [
    "cycle-view",
    "calendar",
    "cycle-calendar",
    "calendar-view",
    "progress"
  ];

  let initialized = false;

  let calendarSection = null;
  let calendarRoot = null;
  let timelineContainer = null;
  let dayCardContainer = null;

  let currentMealPlan = null;
  let selectedDay = null;

  /**
   * Initialize the calendar controller.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      refresh();

      return true;
    }

    const dependencyCheck =
      validateDependencies();

    if (!dependencyCheck.isValid) {
      console.error(
        "Eleven calendar dependencies are unavailable.",
        dependencyCheck.errors
      );

      return false;
    }

    calendarSection =
      findCalendarSection();

    if (!calendarSection) {
      console.warn(
        "Eleven could not find a Cycle View section."
      );

      return false;
    }

    createCalendarRoot();
    bindGlobalEvents();
    restoreSelectedDay();
    refresh();

    initialized = true;

    return true;
  }

  /**
   * Refresh the complete calendar interface.
   */

  function refresh() {
    if (!calendarRoot) {
      return;
    }

    currentMealPlan =
      getSavedMealPlan();

    if (!currentMealPlan) {
      renderNoPlanState();

      return;
    }

    const validation =
      validateMealPlan(
        currentMealPlan
      );

    if (!validation.isValid) {
      renderErrorState(
        validation.errors[0]
      );

      return;
    }

    selectedDay =
      resolveSelectedDay(
        currentMealPlan,
        selectedDay
      );

    renderCalendarShell();
    renderTimeline();
    renderSelectedDay();
    updateCalendarSummary();
  }

  /**
   * Find the existing calendar section.
   *
   * If no dedicated calendar section exists, this controller can
   * enhance the existing meal-plan section instead.
   *
   * @returns {HTMLElement|null}
   */

  function findCalendarSection() {
    for (
      const sectionId of
      POSSIBLE_SECTION_IDS
    ) {
      const section =
        document.getElementById(
          sectionId
        );

      if (section) {
        return section;
      }
    }

    return document.getElementById(
      "meal-plan"
    );
  }

  /**
   * Create the calendar application root.
   */

  function createCalendarRoot() {
    calendarRoot =
      document.getElementById(
        "eleven-calendar-root"
      );

    if (calendarRoot) {
      return;
    }

    calendarRoot =
      document.createElement("div");

    calendarRoot.id =
      "eleven-calendar-root";

    calendarRoot.className =
      "eleven-calendar-root";

    /*
     * If the calendar is using the meal-plan section, do not hide
     * the existing generated meal-plan interface. The Cycle View
     * becomes an additional interface above it.
     */

    const isMealPlanSection =
      calendarSection.id ===
      "meal-plan";

    if (isMealPlanSection) {
      calendarSection.prepend(
        calendarRoot
      );

      return;
    }

    Array.from(
      calendarSection.children
    ).forEach((child) => {
      child.hidden = true;

      child.dataset
        .elevenLegacyCalendar =
        "true";
    });

    calendarSection.appendChild(
      calendarRoot
    );
  }

  /**
   * Bind application-wide events.
   */

  function bindGlobalEvents() {
    document.addEventListener(
      "eleven:calendar-day-selected",
      handleDaySelected
    );

    document.addEventListener(
      "eleven:calendar-day-completion-requested",
      handleDayCompletionRequested
    );

    document.addEventListener(
      "eleven:calendar-progress-updated",
      handleProgressUpdated
    );

    document.addEventListener(
      "eleven:meal-plan-updated",
      handleMealPlanUpdated
    );

    window.addEventListener(
      "storage",
      handleStorageEvent
    );
  }

  /**
   * Handle a day selected from the timeline.
   *
   * @param {CustomEvent} event
   */

  function handleDaySelected(event) {
    const dayNumber =
      Number(
        event.detail?.day
      );

    if (
      !isValidPlanDay(
        currentMealPlan,
        dayNumber
      )
    ) {
      return;
    }

    selectedDay =
      dayNumber;

    saveSelectedDay();
    renderSelectedDay();
    updateSelectedDaySummary();

    scrollDayCardIntoView();
  }

  /**
   * Handle a completion request from the selected-day card.
   *
   * @param {CustomEvent} event
   */

  function handleDayCompletionRequested(
    event
  ) {
    const dayNumber =
      Number(
        event.detail?.day
      );

    const completed =
      Boolean(
        event.detail?.completed
      );

    if (
      !isValidPlanDay(
        currentMealPlan,
        dayNumber
      )
    ) {
      showCalendarMessage(
        "That cycle day is unavailable.",
        "error"
      );

      return;
    }

    const result =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .setDayCompletion(
          dayNumber,
          completed
        );

    if (!result.success) {
      showCalendarMessage(
        result.errors?.[0] ||
        "Eleven could not update cycle progress.",
        "error"
      );

      return;
    }

    currentMealPlan =
      result.mealPlan;

    selectedDay =
      dayNumber;

    saveSelectedDay();
    renderTimeline();
    renderSelectedDay();
    updateCalendarSummary();

    showCalendarMessage(
      completed
        ? `Day ${dayNumber} marked complete.`
        : `Day ${dayNumber} reopened.`,
      completed
        ? "success"
        : "information"
    );
  }

  /**
   * Respond to progress updates emitted by the progress engine.
   *
   * @param {CustomEvent} event
   */

  function handleProgressUpdated(event) {
    const updatedPlan =
      event.detail?.mealPlan;

    if (updatedPlan) {
      currentMealPlan =
        updatedPlan;
    } else {
      currentMealPlan =
        getSavedMealPlan();
    }

    if (!currentMealPlan) {
      renderNoPlanState();

      return;
    }

    selectedDay =
      resolveSelectedDay(
        currentMealPlan,
        selectedDay
      );

    renderTimeline();
    renderSelectedDay();
    updateCalendarSummary();
  }

  /**
   * Respond when a new meal plan is generated.
   *
   * @param {CustomEvent} event
   */

  function handleMealPlanUpdated(event) {
    const source =
      event.detail?.source;

    /*
     * Calendar progress already emits a meal-plan update.
     * Avoid rendering twice for the same change.
     */

    if (
      source ===
      "calendar-progress"
    ) {
      return;
    }

    currentMealPlan =
      event.detail?.mealPlan ||
      getSavedMealPlan();

    selectedDay = null;

    removeSavedSelectedDay();
    refresh();
  }

  /**
   * Respond to cross-tab storage changes.
   *
   * @param {StorageEvent} event
   */

  function handleStorageEvent(event) {
    if (
      event.key ===
      STORAGE_KEYS.selectedDay
    ) {
      restoreSelectedDay();
      refresh();

      return;
    }

    if (
      isMealPlanStorageKey(
        event.key
      )
    ) {
      currentMealPlan =
        getSavedMealPlan();

      refresh();
    }
  }

  /**
   * Render the main calendar shell.
   */

  function renderCalendarShell() {
    const progress =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .calculateProgress(
          currentMealPlan
        );

    calendarRoot.innerHTML = `
      <section class="calendar-cycle-hero">
        <div class="calendar-cycle-hero-content">
          <p class="calendar-cycle-kicker">
            Interactive Cycle View
          </p>

          <h1>
            Your Eleven cycle
          </h1>

          <p>
            Move through each day, review your meals, and record
            completion as you progress through the current nutrition
            cycle.
          </p>

          <div class="calendar-cycle-hero-actions">
            <button
              type="button"
              class="button"
              data-calendar-action="current-day"
            >
              Go to current day
            </button>

            <button
              type="button"
              class="button button-secondary"
              data-calendar-action="reset-progress"
              ${
                progress.completedDays ===
                0
                  ? "disabled"
                  : ""
              }
            >
              Reset progress
            </button>
          </div>
        </div>

        <div class="calendar-cycle-hero-progress">
          <div class="calendar-cycle-ring">
            <strong
              id="calendar-cycle-percentage"
            >
              ${progress.percentage}%
            </strong>

            <span>
              Cycle complete
            </span>
          </div>
        </div>
      </section>

      <section
        class="calendar-cycle-summary"
        aria-label="Cycle progress summary"
      >
        ${createSummaryMetricHtml({
          label:
            "Current day",
          value:
            `Day ${progress.currentDay}`,
          icon: "●"
        })}

        ${createSummaryMetricHtml({
          label:
            "Completed",
          value:
            `${progress.completedDays} days`,
          icon: "✓"
        })}

        ${createSummaryMetricHtml({
          label:
            "Remaining",
          value:
            `${progress.remainingDays} days`,
          icon: "○"
        })}

        ${createSummaryMetricHtml({
          label:
            "Plan score",
          value:
            formatScore(
              currentMealPlan.score
            ),
          icon: "★"
        })}
      </section>

      <div
        id="calendar-message"
        class="calendar-message"
        hidden
        role="status"
        aria-live="polite"
      ></div>

      <div
        id="calendar-timeline-container"
        class="calendar-timeline-container"
      ></div>

      <section class="calendar-selected-day-heading">
        <div>
          <p class="eyebrow">
            Selected day
          </p>

          <h2
            id="calendar-selected-day-title"
          >
            Day ${selectedDay}
          </h2>
        </div>

        <div class="calendar-selected-day-navigation">
          <button
            type="button"
            class="calendar-day-navigation-button"
            data-calendar-action="previous-day"
            aria-label="View previous day"
          >
            ←
          </button>

          <button
            type="button"
            class="calendar-day-navigation-button"
            data-calendar-action="next-day"
            aria-label="View next day"
          >
            →
          </button>
        </div>
      </section>

      <div
        id="calendar-day-card-container"
        class="calendar-day-card-container"
      ></div>

      ${createCycleCompletionPanelHtml(
        progress
      )}
    `;

    timelineContainer =
      document.getElementById(
        "calendar-timeline-container"
      );

    dayCardContainer =
      document.getElementById(
        "calendar-day-card-container"
      );

    bindCalendarActions();
  }

  /**
   * Render the timeline module.
   */

  function renderTimeline() {
    if (
      !timelineContainer ||
      !currentMealPlan
    ) {
      return;
    }

    const result =
      window
        .ELEVEN_CALENDAR_TIMELINE
        .render(
          timelineContainer,
          currentMealPlan,
          {
            selectedDay,
            showCompletionLabels:
              true
          }
        );

    if (!result.success) {
      showCalendarMessage(
        result.errors?.[0] ||
        "The cycle timeline could not be displayed.",
        "error"
      );
    }
  }

  /**
   * Render the selected-day module.
   */

  function renderSelectedDay() {
    if (
      !dayCardContainer ||
      !currentMealPlan
    ) {
      return;
    }

    const result =
      window
        .ELEVEN_CALENDAR_DAY_CARD
        .render(
          dayCardContainer,
          currentMealPlan,
          selectedDay,
          {
            showSelectionReasons:
              true
          }
        );

    if (!result.success) {
      showCalendarMessage(
        result.errors?.[0] ||
        "The selected day could not be displayed.",
        "error"
      );
    }

    updateSelectedDaySummary();
    updateNavigationButtons();
  }

  /**
   * Bind controls created by the calendar shell.
   */

  function bindCalendarActions() {
    calendarRoot
      .querySelectorAll(
        "[data-calendar-action]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset
                .calendarAction;

            handleCalendarAction(
              action
            );
          }
        );
      });
  }

  /**
   * Handle a calendar-level action.
   *
   * @param {string} action
   */

  function handleCalendarAction(action) {
    if (!currentMealPlan) {
      return;
    }

    switch (action) {
      case "current-day":
        goToCurrentDay();
        break;

      case "previous-day":
        moveSelectedDay(-1);
        break;

      case "next-day":
        moveSelectedDay(1);
        break;

      case "reset-progress":
        confirmResetProgress();
        break;

      case "complete-cycle":
        confirmCompleteCycle();
        break;

      case "start-new-cycle":
        startNewCycle();
        break;

      default:
        break;
    }
  }

  /**
   * Select the current active day.
   */

  function goToCurrentDay() {
    const progress =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .calculateProgress(
          currentMealPlan
        );

    selectDay(
      progress.currentDay,
      true
    );
  }

  /**
   * Move backward or forward through the cycle.
   *
   * @param {number} direction
   */

  function moveSelectedDay(direction) {
    const dayNumbers =
      getPlanDayNumbers(
        currentMealPlan
      );

    const currentIndex =
      dayNumbers.indexOf(
        selectedDay
      );

    if (currentIndex === -1) {
      selectDay(
        dayNumbers[0],
        true
      );

      return;
    }

    const nextIndex =
      currentIndex +
      Number(direction);

    if (
      nextIndex < 0 ||
      nextIndex >=
        dayNumbers.length
    ) {
      return;
    }

    selectDay(
      dayNumbers[nextIndex],
      true
    );
  }

  /**
   * Select and render one day.
   *
   * @param {number} dayNumber
   * @param {boolean} scrollIntoView
   */

  function selectDay(
    dayNumber,
    scrollIntoView = false
  ) {
    if (
      !isValidPlanDay(
        currentMealPlan,
        dayNumber
      )
    ) {
      return;
    }

    selectedDay =
      Number(dayNumber);

    saveSelectedDay();
    renderTimeline();
    renderSelectedDay();

    if (scrollIntoView) {
      scrollDayCardIntoView();
    }
  }

  /**
   * Confirm a cycle progress reset.
   */

  function confirmResetProgress() {
    const confirmed =
      window.confirm(
        "Reset all completed days in this Eleven cycle?"
      );

    if (!confirmed) {
      return;
    }

    const result =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .resetCycleProgress();

    if (!result.success) {
      showCalendarMessage(
        result.errors?.[0] ||
        "Cycle progress could not be reset.",
        "error"
      );

      return;
    }

    currentMealPlan =
      result.mealPlan;

    selectedDay =
      result.progress
        .currentDay;

    saveSelectedDay();
    refresh();

    showCalendarMessage(
      "Cycle progress has been reset.",
      "information"
    );
  }

  /**
   * Confirm completing every cycle day.
   *
   * This is available primarily for testing and completed-cycle recovery.
   */

  function confirmCompleteCycle() {
    const confirmed =
      window.confirm(
        "Mark every day in this cycle as complete?"
      );

    if (!confirmed) {
      return;
    }

    const result =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .completeEntireCycle();

    if (!result.success) {
      showCalendarMessage(
        result.errors?.[0] ||
        "The cycle could not be completed.",
        "error"
      );

      return;
    }

    currentMealPlan =
      result.mealPlan;

    selectedDay =
      result.progress
        .currentDay;

    saveSelectedDay();
    refresh();
  }

  /**
   * Start the current saved plan again from Day 1.
   */

  function startNewCycle() {
    const confirmed =
      window.confirm(
        "Start this meal plan again from Day 1? Existing completion progress will be cleared."
      );

    if (!confirmed) {
      return;
    }

    const result =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .resetCycleProgress();

    if (!result.success) {
      showCalendarMessage(
        result.errors?.[0] ||
        "Eleven could not restart the cycle.",
        "error"
      );

      return;
    }

    currentMealPlan =
      result.mealPlan;

    selectedDay =
      result.progress
        .currentDay;

    saveSelectedDay();
    refresh();
  }

  /**
   * Update calendar summary after progress changes.
   */

  function updateCalendarSummary() {
    if (
      !calendarRoot ||
      !currentMealPlan
    ) {
      return;
    }

    const progress =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .calculateProgress(
          currentMealPlan
        );

    const percentageElement =
      document.getElementById(
        "calendar-cycle-percentage"
      );

    if (percentageElement) {
      percentageElement.textContent =
        `${progress.percentage}%`;
    }

    /*
     * The shell contains several progress-dependent panels.
     * Re-rendering the complete shell keeps all counts synchronized.
     */

    const activeElement =
      document.activeElement;

    const activeAction =
      activeElement
        ?.dataset
        ?.calendarAction ||
      null;

    renderCalendarShell();
    renderTimeline();
    renderSelectedDay();

    if (activeAction) {
      calendarRoot
        .querySelector(
          `[data-calendar-action="${activeAction}"]`
        )
        ?.focus();
    }
  }

  /**
   * Update selected-day heading and navigation controls.
   */

  function updateSelectedDaySummary() {
    const title =
      document.getElementById(
        "calendar-selected-day-title"
      );

    if (title) {
      title.textContent =
        `Day ${selectedDay}`;
    }
  }

  /**
   * Disable previous or next navigation at cycle boundaries.
   */

  function updateNavigationButtons() {
    const dayNumbers =
      getPlanDayNumbers(
        currentMealPlan
      );

    const selectedIndex =
      dayNumbers.indexOf(
        selectedDay
      );

    const previousButton =
      calendarRoot.querySelector(
        '[data-calendar-action="previous-day"]'
      );

    const nextButton =
      calendarRoot.querySelector(
        '[data-calendar-action="next-day"]'
      );

    if (previousButton) {
      previousButton.disabled =
        selectedIndex <= 0;
    }

    if (nextButton) {
      nextButton.disabled =
        selectedIndex === -1 ||
        selectedIndex >=
          dayNumbers.length - 1;
    }
  }

  /**
   * Create cycle completion panel.
   *
   * @param {object} progress
   * @returns {string}
   */

  function createCycleCompletionPanelHtml(
    progress
  ) {
    if (progress.isComplete) {
      return `
        <section class="calendar-cycle-completion is-complete">
          <div class="calendar-cycle-completion-icon">
            ✓
          </div>

          <div>
            <p class="eyebrow">
              Cycle complete
            </p>

            <h2>
              You completed all ${progress.totalDays} days.
            </h2>

            <p>
              Your current Eleven cycle is fully complete. You may
              review any day, restart this plan, or generate a new
              optimized cycle.
            </p>
          </div>

          <div class="calendar-cycle-completion-actions">
            <button
              type="button"
              class="button"
              data-calendar-action="start-new-cycle"
            >
              Restart this cycle
            </button>

            <button
              type="button"
              class="button button-secondary"
              data-calendar-target="meal-plan"
            >
              Generate new plan
            </button>
          </div>
        </section>
      `;
    }

    return `
      <section class="calendar-cycle-completion">
        <div class="calendar-cycle-completion-icon">
          ${progress.completedDays}
        </div>

        <div>
          <p class="eyebrow">
            Cycle progress
          </p>

          <h2>
            ${progress.remainingDays}
            day${
              progress.remainingDays ===
              1
                ? ""
                : "s"
            }
            remain.
          </h2>

          <p>
            Complete each day after finishing your planned meals.
            Eleven will update your active day and dashboard progress
            automatically.
          </p>
        </div>

        <button
          type="button"
          class="button button-secondary"
          data-calendar-action="complete-cycle"
        >
          Complete all for testing
        </button>
      </section>
    `;
  }

  /**
   * Create one summary metric.
   *
   * @param {object} metric
   * @returns {string}
   */

  function createSummaryMetricHtml(
    metric
  ) {
    return `
      <article class="calendar-summary-metric">
        <span class="calendar-summary-icon">
          ${escapeHtml(
            metric.icon
          )}
        </span>

        <div>
          <small>
            ${escapeHtml(
              metric.label
            )}
          </small>

          <strong>
            ${escapeHtml(
              metric.value
            )}
          </strong>
        </div>
      </article>
    `;
  }

  /**
   * Render when no meal plan exists.
   */

  function renderNoPlanState() {
    currentMealPlan = null;
    selectedDay = null;

    calendarRoot.innerHTML = `
      <section class="calendar-empty-state">
        <div class="calendar-empty-icon">
          📅
        </div>

        <p class="eyebrow">
          Eleven Cycle View
        </p>

        <h1>
          Generate your nutrition cycle first
        </h1>

        <p>
          Once an optimized meal plan exists, the Cycle View will let
          you move through all eleven days, review your meals, and
          track completion.
        </p>

        <button
          type="button"
          class="button"
          data-calendar-target="meal-plan"
        >
          Open meal planner
        </button>
      </section>
    `;

    bindCalendarNavigationTargets();
  }

  /**
   * Render an error state.
   *
   * @param {string} message
   */

  function renderErrorState(message) {
    calendarRoot.innerHTML = `
      <section class="calendar-empty-state is-error">
        <div class="calendar-empty-icon">
          !
        </div>

        <p class="eyebrow">
          Eleven Cycle View
        </p>

        <h1>
          The cycle could not be displayed
        </h1>

        <p>
          ${escapeHtml(message)}
        </p>

        <button
          type="button"
          class="button"
          id="calendar-retry-button"
        >
          Try again
        </button>
      </section>
    `;

    document
      .getElementById(
        "calendar-retry-button"
      )
      ?.addEventListener(
        "click",
        refresh
      );
  }

  /**
   * Bind navigation targets that point to another Eleven section.
   */

  function bindCalendarNavigationTargets() {
    calendarRoot
      .querySelectorAll(
        "[data-calendar-target]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            navigateToSection(
              button.dataset
                .calendarTarget
            );
          }
        );
      });
  }

  /**
   * Show a temporary calendar status message.
   *
   * @param {string} message
   * @param {string} type
   */

  function showCalendarMessage(
    message,
    type = "information"
  ) {
    const messageElement =
      document.getElementById(
        "calendar-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.hidden =
      false;

    messageElement.className =
      `calendar-message is-${type}`;

    messageElement.textContent =
      message;

    window.clearTimeout(
      showCalendarMessage.timeoutId
    );

    showCalendarMessage.timeoutId =
      window.setTimeout(
        () => {
          messageElement.hidden =
            true;
        },
        3500
      );
  }

  /**
   * Scroll selected-day content into view.
   */

  function scrollDayCardIntoView() {
    window.setTimeout(
      () => {
        const heading =
          calendarRoot.querySelector(
            ".calendar-selected-day-heading"
          );

        heading?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      },
      50
    );
  }

  /**
   * Resolve the selected day.
   *
   * @param {object} mealPlan
   * @param {number|null} requestedDay
   * @returns {number}
   */

  function resolveSelectedDay(
    mealPlan,
    requestedDay
  ) {
    const dayNumbers =
      getPlanDayNumbers(
        mealPlan
      );

    const numericRequestedDay =
      Number(requestedDay);

    if (
      dayNumbers.includes(
        numericRequestedDay
      )
    ) {
      return numericRequestedDay;
    }

    const savedDay =
      readSavedSelectedDay();

    if (
      dayNumbers.includes(
        savedDay
      )
    ) {
      return savedDay;
    }

    const progress =
      window
        .ELEVEN_CALENDAR_PROGRESS
        .calculateProgress(
          mealPlan
        );

    if (
      dayNumbers.includes(
        progress.currentDay
      )
    ) {
      return progress.currentDay;
    }

    return dayNumbers[0] || 1;
  }

  /**
   * Return plan day numbers.
   *
   * @param {object} mealPlan
   * @returns {number[]}
   */

  function getPlanDayNumbers(
    mealPlan
  ) {
    if (
      window
        .ELEVEN_CALENDAR_PROGRESS &&
      typeof window
        .ELEVEN_CALENDAR_PROGRESS
        .getValidDayNumbers ===
        "function"
    ) {
      return window
        .ELEVEN_CALENDAR_PROGRESS
        .getValidDayNumbers(
          mealPlan
        );
    }

    return Array.isArray(
      mealPlan?.days
    )
      ? mealPlan.days
          .map(
            (day) =>
              Number(day.day)
          )
          .filter(
            Number.isInteger
          )
      : [];
  }

  /**
   * Determine whether a day belongs to the current plan.
   *
   * @param {object} mealPlan
   * @param {number} dayNumber
   * @returns {boolean}
   */

  function isValidPlanDay(
    mealPlan,
    dayNumber
  ) {
    return getPlanDayNumbers(
      mealPlan
    ).includes(
      Number(dayNumber)
    );
  }

  /**
   * Save the selected day.
   */

  function saveSelectedDay() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.selectedDay,
        String(selectedDay)
      );
    } catch (error) {
      console.warn(
        "Eleven could not save the selected calendar day.",
        error
      );
    }
  }

  /**
   * Restore selected day from storage.
   */

  function restoreSelectedDay() {
    selectedDay =
      readSavedSelectedDay();
  }

  /**
   * Read selected day from storage.
   *
   * @returns {number|null}
   */

  function readSavedSelectedDay() {
    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEYS.selectedDay
        );

      const dayNumber =
        Number(stored);

      return Number.isInteger(
        dayNumber
      )
        ? dayNumber
        : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove the saved selected day.
   */

  function removeSavedSelectedDay() {
    try {
      localStorage.removeItem(
        STORAGE_KEYS.selectedDay
      );
    } catch (error) {
      console.warn(
        "Eleven could not clear the selected calendar day.",
        error
      );
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
        "Eleven could not load the meal plan for Cycle View.",
        error
      );

      return null;
    }
  }

  /**
   * Navigate to another Eleven section.
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
   * Validate calendar dependencies.
   *
   * @returns {object}
   */

  function validateDependencies() {
    const errors = [];

    if (
      !window
        .ELEVEN_CALENDAR_TIMELINE
    ) {
      errors.push(
        "The calendar timeline module is unavailable."
      );
    }

    if (
      !window
        .ELEVEN_CALENDAR_DAY_CARD
    ) {
      errors.push(
        "The calendar day-card module is unavailable."
      );
    }

    if (
      !window
        .ELEVEN_CALENDAR_PROGRESS
    ) {
      errors.push(
        "The calendar progress module is unavailable."
      );
    }

    return {
      isValid:
        errors.length === 0,
      errors
    };
  }

  /**
   * Validate meal-plan structure.
   *
   * @param {object} mealPlan
   * @returns {object}
   */

  function validateMealPlan(mealPlan) {
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
        "The current meal plan does not contain any cycle days."
      );
    }

    return {
      isValid:
        errors.length === 0,
      errors
    };
  }

  /**
   * Identify meal-plan storage keys.
   *
   * @param {string|null} key
   * @returns {boolean}
   */

  function isMealPlanStorageKey(key) {
    if (!key) {
      return false;
    }

    return [
      "eleven.mealPlan",
      "eleven_meal_plan",
      "elevenMealPlan"
    ].includes(key);
  }

  /**
   * Formatting and utility functions.
   */

  function formatScore(value) {
    const score =
      Number(value);

    return Number.isFinite(score)
      ? score.toFixed(1)
      : "—";
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
    version: VERSION,

    init,
    refresh,
    selectDay,
    goToCurrentDay
  };
})();
