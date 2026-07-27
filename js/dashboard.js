"use strict";

/**
 * Eleven premium dashboard
 *
 * Responsibilities:
 *
 * - Transform the existing dashboard into Eleven's primary home screen
 * - Display profile targets and progress
 * - Display selected foods and eligible recipes
 * - Display current plan status and quality
 * - Display cycle progress
 * - Provide direct actions for profile, preferences, and plan generation
 * - Refresh automatically whenever Eleven data changes
 */

window.ELEVEN_DASHBOARD = (() => {
  let initialized = false;
  let dashboardSection = null;
  let dashboardRoot = null;

  /**
   * Initialize the dashboard.
   *
   * @returns {boolean}
   */

  function init() {
    if (initialized) {
      refresh();
      return true;
    }

    dashboardSection =
      document.getElementById("dashboard");

    if (!dashboardSection) {
      console.warn(
        "Eleven dashboard section was not found."
      );

      return false;
    }

    createDashboardRoot();
    bindEvents();
    refresh();

    initialized = true;

    return true;
  }

  /**
   * Create the dashboard application root.
   */

  function createDashboardRoot() {
    dashboardRoot =
      document.getElementById(
        "eleven-premium-dashboard"
      );

    if (dashboardRoot) {
      return;
    }

    dashboardRoot =
      document.createElement("div");

    dashboardRoot.id =
      "eleven-premium-dashboard";

    dashboardRoot.className =
      "eleven-premium-dashboard";

    const existingChildren =
      Array.from(
        dashboardSection.children
      );

    existingChildren.forEach(
      (child) => {
        child.hidden = true;
        child.dataset.elevenLegacyDashboard =
          "true";
      }
    );

    dashboardSection.appendChild(
      dashboardRoot
    );
  }

  /**
   * Bind data and navigation events.
   */

  function bindEvents() {
    document.addEventListener(
      "eleven:profile-updated",
      refresh
    );

    document.addEventListener(
      "eleven:preferences-updated",
      refresh
    );

    document.addEventListener(
      "eleven:meal-plan-updated",
      refresh
    );

    document.addEventListener(
      "eleven:progress-updated",
      refresh
    );

    window.addEventListener(
      "storage",
      refresh
    );
  }

  /**
   * Refresh the complete dashboard.
   */

  function refresh() {
    if (!dashboardRoot) {
      return;
    }

    const profile =
      getProfile();

    const preferences =
      getPreferences();

    const mealPlan =
      getMealPlan();

    const progressEntries =
      getProgressEntries();

    const profileReady =
      isProfileComplete(profile);

    const preferenceSummary =
      createPreferenceSummary(
        preferences
      );

    const planSummary =
      createPlanSummary(
        mealPlan
      );

    const cycleSummary =
      createCycleSummary(
        mealPlan
      );

    const weightSummary =
      createWeightSummary(
        profile,
        progressEntries
      );

    const setupSummary =
      createSetupSummary({
        profileReady,
        selectedFoodCount:
          preferenceSummary
            .selectedFoodCount,
        mealPlan
      });

    dashboardRoot.innerHTML = `
      ${createHeroHtml({
        profile,
        profileReady,
        mealPlan,
        cycleSummary
      })}

      ${createPrimaryMetricsHtml({
        profile,
        weightSummary,
        preferenceSummary,
        planSummary
      })}

      <div class="dashboard-content-grid">
        ${createPlanStatusHtml({
          mealPlan,
          planSummary,
          cycleSummary
        })}

        ${createSetupHtml(
          setupSummary
        )}
      </div>

      ${createNutritionSnapshotHtml({
        profile,
        mealPlan,
        planSummary
      })}

      ${createQuickActionsHtml({
        profileReady,
        selectedFoodCount:
          preferenceSummary
            .selectedFoodCount,
        mealPlan
      })}
    `;

    bindDashboardActions();
  }

  /**
   * Create premium hero.
   *
   * @param {object} context
   * @returns {string}
   */

  function createHeroHtml(context) {
    const {
      profile,
      profileReady,
      mealPlan,
      cycleSummary
    } = context;

    const firstName =
      getFirstName(
        profile?.profileName
      );

    const greeting =
      firstName
        ? `Hello, ${firstName}`
        : "Welcome to Eleven";

    let title =
      "Build your first optimized nutrition cycle.";

    let description =
      "Complete your profile, select your preferred foods, and let Eleven build a personalized 11-day plan.";

    let statusLabel =
      "Setup in progress";

    let actionLabel =
      "Continue setup";

    let actionTarget =
      !profileReady
        ? "profile"
        : "preferences";

    if (
      profileReady &&
      !mealPlan
    ) {
      title =
        "Your profile is ready. Let’s build your cycle.";

      description =
        "Eleven will evaluate multiple meal-plan combinations and select the strongest available result.";

      statusLabel =
        "Ready to optimize";

      actionLabel =
        "Generate your plan";

      actionTarget =
        "meal-plan";
    }

    if (mealPlan) {
      title =
        cycleSummary.completedDays > 0
          ? `Day ${cycleSummary.currentDay} of ${cycleSummary.totalDays}`
          : "Your optimized cycle is ready.";

      description =
        cycleSummary.completedDays > 0
          ? `${cycleSummary.remainingDays} day${
              cycleSummary.remainingDays === 1
                ? ""
                : "s"
            } remain in your current Eleven cycle.`
          : `Your ${mealPlan.days.length}-day plan is saved and ready to begin.`;

      statusLabel =
        mealPlan.rating ||
        "Plan ready";

      actionLabel =
        "View current plan";

      actionTarget =
        "meal-plan";
    }

    return `
      <section class="eleven-dashboard-hero">
        <div class="dashboard-hero-content">
          <div>
            <p class="dashboard-hero-kicker">
              ${escapeHtml(
                statusLabel
              )}
            </p>

            <h1>
              ${escapeHtml(
                greeting
              )}
            </h1>

            <h2>
              ${escapeHtml(
                title
              )}
            </h2>

            <p>
              ${escapeHtml(
                description
              )}
            </p>
          </div>

          <div class="dashboard-hero-actions">
            <button
              type="button"
              class="button dashboard-primary-action"
              data-dashboard-target="${escapeHtml(
                actionTarget
              )}"
            >
              ${escapeHtml(
                actionLabel
              )}
            </button>

            ${
              mealPlan
                ? `
                  <button
                    type="button"
                    class="button button-secondary"
                    data-dashboard-action="generate-new-plan"
                  >
                    Optimize a new plan
                  </button>
                `
                : ""
            }
          </div>
        </div>

        <div class="dashboard-hero-orbit">
          ${
            mealPlan
              ? createPlanOrbitHtml(
                  mealPlan
                )
              : createSetupOrbitHtml(
                  profileReady
                )
          }
        </div>
      </section>
    `;
  }

  /**
   * Create visual plan score orbit.
   *
   * @param {object} mealPlan
   * @returns {string}
   */

  function createPlanOrbitHtml(
    mealPlan
  ) {
    const score =
      toFiniteNumber(
        mealPlan.score
      );

    return `
      <div class="dashboard-score-orbit">
        <span class="dashboard-score-ring"></span>

        <div class="dashboard-score-value">
          <strong>
            ${score.toFixed(1)}
          </strong>

          <span>
            Plan score
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Create setup orbit.
   *
   * @param {boolean} profileReady
   * @returns {string}
   */

  function createSetupOrbitHtml(
    profileReady
  ) {
    return `
      <div class="dashboard-setup-orbit">
        <span>
          ${profileReady ? "02" : "01"}
        </span>

        <strong>
          ${
            profileReady
              ? "Select foods"
              : "Build profile"
          }
        </strong>

        <small>
          Eleven setup
        </small>
      </div>
    `;
  }

  /**
   * Create primary metric cards.
   */

  function createPrimaryMetricsHtml(
    context
  ) {
    const {
      profile,
      weightSummary,
      preferenceSummary,
      planSummary
    } = context;

    const calorieTarget =
      getCalorieTarget(profile);

    const proteinTarget =
      getProteinTarget(profile);

    const currentWeight =
      weightSummary.currentWeight;

    const goalWeight =
      weightSummary.goalWeight;

    return `
      <section class="dashboard-metric-grid">
        ${createMetricCard({
          label:
            "Current weight",
          value:
            currentWeight
              ? `${formatNumber(
                  currentWeight
                )} lb`
              : "—",
          supporting:
            goalWeight
              ? `Goal: ${formatNumber(
                  goalWeight
                )} lb`
              : "Add your goal weight",
          icon: "⚖️"
        })}

        ${createMetricCard({
          label:
            "Daily calories",
          value:
            calorieTarget
              ? formatCalories(
                  calorieTarget
                )
              : "—",
          supporting:
            "Personalized target",
          icon: "🔥"
        })}

        ${createMetricCard({
          label:
            "Daily protein",
          value:
            proteinTarget
              ? formatMacro(
                  proteinTarget
                )
              : "—",
          supporting:
            "Preferred target",
          icon: "💪"
        })}

        ${createMetricCard({
          label:
            "Selected foods",
          value:
            String(
              preferenceSummary
                .selectedFoodCount
            ),
          supporting:
            `${preferenceSummary.eligibleRecipeCount} eligible recipes`,
          icon: "🥗"
        })}

        ${createMetricCard({
          label:
            "Plan quality",
          value:
            planSummary.hasPlan
              ? planSummary.score
                  .toFixed(1)
              : "—",
          supporting:
            planSummary.hasPlan
              ? planSummary.rating
              : "Generate your first plan",
          icon: "✨"
        })}
      </section>
    `;
  }

  /**
   * Create one metric card.
   */

  function createMetricCard({
    label,
    value,
    supporting,
    icon
  }) {
    return `
      <article class="dashboard-metric-card">
        <div class="dashboard-metric-icon">
          ${escapeHtml(icon)}
        </div>

        <div>
          <span>
            ${escapeHtml(label)}
          </span>

          <strong>
            ${escapeHtml(value)}
          </strong>

          <small>
            ${escapeHtml(
              supporting
            )}
          </small>
        </div>
      </article>
    `;
  }

  /**
   * Create current plan panel.
   */

  function createPlanStatusHtml(
    context
  ) {
    const {
      mealPlan,
      planSummary,
      cycleSummary
    } = context;

    if (!mealPlan) {
      return `
        <article class="dashboard-panel dashboard-plan-panel">
          <div class="dashboard-panel-heading">
            <div>
              <p class="eyebrow">
                Current cycle
              </p>

              <h2>
                No plan generated yet
              </h2>
            </div>

            <span class="dashboard-status-pill">
              Not started
            </span>
          </div>

          <p class="dashboard-panel-description">
            Once your profile and food preferences are complete,
            Eleven can optimize multiple candidate plans and retain
            the strongest available result.
          </p>

          <button
            type="button"
            class="button"
            data-dashboard-target="meal-plan"
          >
            Open meal planner
          </button>
        </article>
      `;
    }

    const percentage =
      cycleSummary.totalDays > 0
        ? cycleSummary.completedDays /
          cycleSummary.totalDays *
          100
        : 0;

    return `
      <article class="dashboard-panel dashboard-plan-panel">
        <div class="dashboard-panel-heading">
          <div>
            <p class="eyebrow">
              Current cycle
            </p>

            <h2>
              ${escapeHtml(
                mealPlan.name ||
                "Eleven 11-Day Cycle"
              )}
            </h2>
          </div>

          <span class="dashboard-status-pill is-ready">
            ${escapeHtml(
              planSummary.rating
            )}
          </span>
        </div>

        <div class="dashboard-cycle-progress">
          <div>
            <strong>
              ${cycleSummary.completedDays}
            </strong>

            <span>
              completed
            </span>
          </div>

          <div class="dashboard-cycle-progress-track">
            <span
              style="width: ${clamp(
                percentage,
                0,
                100
              )}%"
            ></span>
          </div>

          <div>
            <strong>
              ${cycleSummary.remainingDays}
            </strong>

            <span>
              remaining
            </span>
          </div>
        </div>

        <div class="dashboard-plan-stat-grid">
          <div>
            <span>
              Average calories
            </span>

            <strong>
              ${formatCalories(
                planSummary
                  .averageCalories
              )}
            </strong>
          </div>

          <div>
            <span>
              Average protein
            </span>

            <strong>
              ${formatMacro(
                planSummary
                  .averageProtein
              )}
            </strong>
          </div>

          <div>
            <span>
              Average fibre
            </span>

            <strong>
              ${formatMacro(
                planSummary
                  .averageFibre
              )}
            </strong>
          </div>
        </div>

        <button
          type="button"
          class="button"
          data-dashboard-target="meal-plan"
        >
          View full cycle
        </button>
      </article>
    `;
  }

  /**
   * Create setup progress panel.
   */

  function createSetupHtml(
    setupSummary
  ) {
    const stepsHtml =
      setupSummary.steps
        .map(
          (step) => `
            <button
              type="button"
              class="dashboard-setup-step ${
                step.complete
                  ? "is-complete"
                  : ""
              }"
              data-dashboard-target="${escapeHtml(
                step.target
              )}"
            >
              <span class="dashboard-setup-check">
                ${
                  step.complete
                    ? "✓"
                    : step.number
                }
              </span>

              <span>
                <strong>
                  ${escapeHtml(
                    step.title
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    step.description
                  )}
                </small>
              </span>
            </button>
          `
        )
        .join("");

    return `
      <article class="dashboard-panel dashboard-setup-panel">
        <div class="dashboard-panel-heading">
          <div>
            <p class="eyebrow">
              Eleven setup
            </p>

            <h2>
              ${setupSummary.completedCount} of ${setupSummary.steps.length} complete
            </h2>
          </div>

          <strong class="dashboard-setup-percentage">
            ${setupSummary.percentage}%
          </strong>
        </div>

        <div class="dashboard-setup-progress-track">
          <span
            style="width: ${setupSummary.percentage}%"
          ></span>
        </div>

        <div class="dashboard-setup-list">
          ${stepsHtml}
        </div>
      </article>
    `;
  }

  /**
   * Create nutrition snapshot panel.
   */

  function createNutritionSnapshotHtml(
    context
  ) {
    const {
      profile,
      mealPlan,
      planSummary
    } = context;

    const calorieTarget =
      getCalorieTarget(profile);

    const proteinTarget =
      getProteinTarget(profile);

    const calorieDifference =
      mealPlan && calorieTarget
        ? planSummary
            .averageCalories -
          calorieTarget
        : 0;

    const proteinDifference =
      mealPlan && proteinTarget
        ? planSummary
            .averageProtein -
          proteinTarget
        : 0;

    return `
      <section class="dashboard-nutrition-section">
        <div class="dashboard-section-heading">
          <div>
            <p class="eyebrow">
              Nutrition snapshot
            </p>

            <h2>
              Targets and plan alignment
            </h2>
          </div>

          <button
            type="button"
            class="dashboard-text-action"
            data-dashboard-target="profile"
          >
            Edit profile
          </button>
        </div>

        <div class="dashboard-nutrition-grid">
          ${createAlignmentCard({
            title:
              "Calories",
            target:
              calorieTarget,
            actual:
              mealPlan
                ? planSummary
                    .averageCalories
                : null,
            difference:
              calorieDifference,
            unit:
              "kcal"
          })}

          ${createAlignmentCard({
            title:
              "Protein",
            target:
              proteinTarget,
            actual:
              mealPlan
                ? planSummary
                    .averageProtein
                : null,
            difference:
              proteinDifference,
            unit:
              "g"
          })}

          ${createGoalCard(
            profile
          )}
        </div>
      </section>
    `;
  }

  /**
   * Create target-alignment card.
   */

  function createAlignmentCard({
    title,
    target,
    actual,
    difference,
    unit
  }) {
    const hasActual =
      actual !== null &&
      actual !== undefined;

    const percentage =
      target > 0 && hasActual
        ? actual / target * 100
        : 0;

    const differenceLabel =
      !hasActual
        ? "Plan not generated"
        : Math.abs(difference) <
          1
          ? "On target"
          : `${difference > 0 ? "+" : ""}${formatNumber(
              difference
            )} ${unit}`;

    return `
      <article class="dashboard-alignment-card">
        <div>
          <span>
            ${escapeHtml(title)}
          </span>

          <strong>
            ${
              hasActual
                ? `${formatNumber(
                    actual
                  )} ${unit}`
                : "—"
            }
          </strong>

          <small>
            Target:
            ${
              target
                ? `${formatNumber(
                    target
                  )} ${unit}`
                : "not set"
            }
          </small>
        </div>

        <div class="dashboard-alignment-meter">
          <span
            style="width: ${clamp(
              percentage,
              0,
              100
            )}%"
          ></span>
        </div>

        <p>
          ${escapeHtml(
            differenceLabel
          )}
        </p>
      </article>
    `;
  }

  /**
   * Create weight-goal card.
   */

  function createGoalCard(profile) {
    const currentWeight =
      toFiniteNumber(
        profile?.currentWeight
      );

    const goalWeight =
      toFiniteNumber(
        profile?.goalWeight
      );

    const poundsRemaining =
      currentWeight &&
      goalWeight
        ? Math.max(
            0,
            currentWeight -
              goalWeight
          )
        : 0;

    return `
      <article class="dashboard-alignment-card dashboard-goal-card">
        <div>
          <span>
            Weight goal
          </span>

          <strong>
            ${
              goalWeight
                ? `${formatNumber(
                    goalWeight
                  )} lb`
                : "—"
            }
          </strong>

          <small>
            ${
              poundsRemaining
                ? `${formatNumber(
                    poundsRemaining
                  )} lb remaining`
                : "Add your weight goal"
            }
          </small>
        </div>

        <div class="dashboard-goal-visual">
          <span>
            ${currentWeight
              ? formatNumber(
                  currentWeight
                )
              : "—"}
          </span>

          <i></i>

          <span>
            ${goalWeight
              ? formatNumber(
                  goalWeight
                )
              : "—"}
          </span>
        </div>

        <p>
          Current to goal
        </p>
      </article>
    `;
  }

  /**
   * Create quick actions.
   */

  function createQuickActionsHtml(
    context
  ) {
    const {
      profileReady,
      selectedFoodCount,
      mealPlan
    } = context;

    const actions = [
      {
        title:
          profileReady
            ? "Update profile"
            : "Complete profile",
        description:
          "Adjust your weight, goal, activity, and calorie targets.",
        target: "profile",
        icon: "👤"
      },

      {
        title:
          selectedFoodCount > 0
            ? "Edit preferred foods"
            : "Choose preferred foods",
        description:
          "Control which ingredients Eleven can use in your plans.",
        target:
          "preferences",
        icon: "🥑"
      },

      {
        title:
          mealPlan
            ? "Review 11-day plan"
            : "Generate 11-day plan",
        description:
          "Open the optimizer and your complete nutrition cycle.",
        target:
          "meal-plan",
        icon: "📋"
      }
    ];

    return `
      <section class="dashboard-quick-actions">
        <div class="dashboard-section-heading">
          <div>
            <p class="eyebrow">
              Quick actions
            </p>

            <h2>
              Manage your Eleven experience
            </h2>
          </div>
        </div>

        <div class="dashboard-action-grid">
          ${actions
            .map(
              (action) => `
                <button
                  type="button"
                  class="dashboard-action-card"
                  data-dashboard-target="${escapeHtml(
                    action.target
                  )}"
                >
                  <span class="dashboard-action-icon">
                    ${escapeHtml(
                      action.icon
                    )}
                  </span>

                  <span>
                    <strong>
                      ${escapeHtml(
                        action.title
                      )}
                    </strong>

                    <small>
                      ${escapeHtml(
                        action.description
                      )}
                    </small>
                  </span>

                  <b aria-hidden="true">
                    →
                  </b>
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  /**
   * Bind buttons created during refresh.
   */

  function bindDashboardActions() {
    dashboardRoot
      .querySelectorAll(
        "[data-dashboard-target]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            navigateToSection(
              button.dataset
                .dashboardTarget
            );
          }
        );
      });

    const generateButton =
      dashboardRoot.querySelector(
        '[data-dashboard-action="generate-new-plan"]'
      );

    if (generateButton) {
      generateButton.addEventListener(
        "click",
        () => {
          navigateToSection(
            "meal-plan"
          );

          window.setTimeout(
            () => {
              document
                .getElementById(
                  "generate-plan-button"
                )
                ?.focus();
            },
            250
          );
        }
      );
    }
  }

  /**
   * Navigate using the existing Eleven navigation system.
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

    document
      .getElementById(sectionId)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    window.location.hash =
      sectionId;
  }

  /**
   * Build preference summary.
   */

  function createPreferenceSummary(
    preferences
  ) {
    const selectedFoodIds =
      Array.isArray(
        preferences
          ?.selectedFoodIds
      )
        ? preferences.selectedFoodIds
        : [];

    let eligibleRecipeCount = 0;

    if (
      typeof window
        .getEligibleElevenRecipes ===
      "function"
    ) {
      eligibleRecipeCount =
        window
          .getEligibleElevenRecipes(
            selectedFoodIds
          ).length;
    } else if (
      Array.isArray(
        window.ELEVEN_RECIPES
      )
    ) {
      eligibleRecipeCount =
        window.ELEVEN_RECIPES
          .length;
    }

    return {
      selectedFoodCount:
        selectedFoodIds.length,
      eligibleRecipeCount
    };
  }

  /**
   * Build plan summary.
   */

  function createPlanSummary(
    mealPlan
  ) {
    if (!mealPlan) {
      return {
        hasPlan: false,
        score: 0,
        rating:
          "No plan yet",
        averageCalories: 0,
        averageProtein: 0,
        averageFibre: 0
      };
    }

    const averages =
      mealPlan.macros
        ?.averageDaily || {};

    return {
      hasPlan: true,

      score:
        toFiniteNumber(
          mealPlan.score
        ),

      rating:
        mealPlan.rating ||
        "Plan ready",

      averageCalories:
        toFiniteNumber(
          averages.calories
        ),

      averageProtein:
        toFiniteNumber(
          averages.protein
        ),

      averageFibre:
        toFiniteNumber(
          averages.fibre
        )
    };
  }

  /**
   * Build cycle progress summary.
   */

  function createCycleSummary(
    mealPlan
  ) {
    const totalDays =
      Array.isArray(
        mealPlan?.days
      )
        ? mealPlan.days.length
        : 11;

    const completedDays =
      Array.isArray(
        mealPlan
          ?.completedDays
      )
        ? mealPlan.completedDays
            .length
        : 0;

    return {
      totalDays,
      completedDays,
      remainingDays:
        Math.max(
          0,
          totalDays -
            completedDays
        ),
      currentDay:
        Math.min(
          totalDays,
          completedDays + 1
        )
    };
  }

  /**
   * Build weight summary.
   */

  function createWeightSummary(
    profile,
    progressEntries
  ) {
    const sortedEntries =
      [...progressEntries]
        .filter(
          (entry) =>
            toFiniteNumber(
              entry.weight
            ) > 0
        )
        .sort(
          (first, second) =>
            new Date(
              second.date ||
              second.createdAt ||
              0
            ) -
            new Date(
              first.date ||
              first.createdAt ||
              0
            )
        );

    const latestWeight =
      sortedEntries[0]?.weight;

    return {
      currentWeight:
        toFiniteNumber(
          latestWeight ||
          profile?.currentWeight
        ),
      goalWeight:
        toFiniteNumber(
          profile?.goalWeight
        )
    };
  }

  /**
   * Build setup summary.
   */

  function createSetupSummary({
    profileReady,
    selectedFoodCount,
    mealPlan
  }) {
    const steps = [
      {
        number: 1,
        title:
          "Complete profile",
        description:
          "Set your body metrics, activity, and goal.",
        complete:
          profileReady,
        target: "profile"
      },

      {
        number: 2,
        title:
          "Select preferred foods",
        description:
          "Choose the ingredients Eleven may use.",
        complete:
          selectedFoodCount > 0,
        target:
          "preferences"
      },

      {
        number: 3,
        title:
          "Generate optimized plan",
        description:
          "Evaluate candidates and save the strongest cycle.",
        complete:
          Boolean(mealPlan),
        target:
          "meal-plan"
      }
    ];

    const completedCount =
      steps.filter(
        (step) =>
          step.complete
      ).length;

    return {
      steps,
      completedCount,
      percentage:
        Math.round(
          completedCount /
          steps.length *
          100
        )
    };
  }

  /**
   * Data access helpers.
   */

  function getProfile() {
    return window
      .ELEVEN_STORAGE
      ?.getProfile?.() || {};
  }

  function getPreferences() {
    return window
      .ELEVEN_STORAGE
      ?.getPreferences?.() || {
        selectedFoodIds: []
      };
  }

  function getMealPlan() {
    return window
      .ELEVEN_STORAGE
      ?.getMealPlan?.() || null;
  }

  function getProgressEntries() {
    const entries =
      window.ELEVEN_STORAGE
        ?.getProgress?.();

    return Array.isArray(entries)
      ? entries
      : [];
  }

  function isProfileComplete(profile) {
    if (
      window.ELEVEN_STORAGE
        ?.isProfileComplete
    ) {
      return window
        .ELEVEN_STORAGE
        .isProfileComplete(
          profile
        );
    }

    return Boolean(
      profile?.age &&
      profile?.currentWeight &&
      profile?.goalWeight
    );
  }

  function getCalorieTarget(
    profile
  ) {
    return toFiniteNumber(
      profile?.targets
        ?.calorieTarget ||
      profile?.calorieTarget
    );
  }

  function getProteinTarget(
    profile
  ) {
    return toFiniteNumber(
      profile?.targets
        ?.proteinTarget ||
      profile?.proteinTarget
    );
  }

  /**
   * Formatting helpers.
   */

  function getFirstName(
    fullName
  ) {
    return String(
      fullName || ""
    )
      .trim()
      .split(/\s+/)[0];
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
    init,
    refresh
  };
})();
