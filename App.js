/* =========================================================
   FAWNWOOD — APP.JS
   ========================================================= */

const STORAGE_KEY = "fawnwood_v1";

const DEFAULT_ROLES = [
  "Reception",
  "Housekeeping",
  "Management",
  "Concierge",
  "Food & Beverage",
  "Maintenance"
];

const DEFAULT_DEPARTMENTS = [
  "Front Office",
  "Housekeeping",
  "Food & Beverage",
  "Concierge",
  "Management",
  "Maintenance"
];

/* =========================================================
   STATE
   ========================================================= */

const state = loadState();

let currentPage = "home";
let searchFilter = "";


/* =========================================================
   STORAGE
   ========================================================= */

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved) {
      return {
        profiles: saved.profiles || [],
        currentUserId: saved.currentUserId || null,
        departments: saved.departments || DEFAULT_DEPARTMENTS,
        shifts: saved.shifts || [],
        tasks: saved.tasks || [],
        announcements: saved.announcements || []
      };
    }
  } catch (error) {
    console.error("Could not load Fawnwood data:", error);
  }

  return {
    profiles: [],
    currentUserId: null,
    departments: DEFAULT_DEPARTMENTS,
    shifts: [],
    tasks: [],
    announcements: []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}


/* =========================================================
   UTILITIES
   ========================================================= */

function createId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 9)
  );
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase() || "?";
}

function getCurrentUser() {
  return state.profiles.find(
    profile => profile.id === state.currentUserId
  ) || null;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date) {
  if (!date) return "No date";

  const parsed = new Date(date + "T12:00:00");

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";

  return "evening";
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.fawnwoodToast);

  window.fawnwoodToast = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function closeModal() {
  const modalRoot = document.getElementById("modal-root");

  if (modalRoot) {
    modalRoot.innerHTML = "";
  }
}

function openModal(content) {
  const modalRoot = document.getElementById("modal-root");

  modalRoot.innerHTML = `
    <div
      class="modal-backdrop"
      onclick="if(event.target === this) closeModal()"
    >
      <div class="modal">
        ${content}
      </div>
    </div>
  `;
}

function requireUser() {
  if (!getCurrentUser()) {
    render();
    return false;
  }

  return true;
}


/* =========================================================
   MAIN RENDER
   ========================================================= */

function render() {
  const root = document.getElementById("root");

  if (!root) return;

  /*
    IMPORTANT:
    The profile screen and the actual application are
    completely separate.

    If there isn't a logged-in profile, the app shell is
    NEVER rendered.
  */

  if (!getCurrentUser()) {
    root.innerHTML = renderProfileGate();
    return;
  }

  root.innerHTML = renderAppShell();

  renderCurrentPage();
}


/* =========================================================
   PROFILE GATE
   ========================================================= */

function renderProfileGate() {
  let profileContent = "";

  if (state.profiles.length === 0) {
    profileContent = `
      <div class="empty">
        <div class="empty-icon">♙</div>

        <h2>No profiles yet</h2>

        <p>
          Create a staff profile to enter the
          Fawnwood application.
        </p>
      </div>
    `;
  } else {
    profileContent = `
      <div class="profile-list">

        ${state.profiles.map(profile => `
          <button
            class="profile-card"
            onclick="loginProfile('${profile.id}')"
          >

            <div class="avatar">
              ${getInitials(profile.name)}
            </div>

            <div class="profile-info">

              <div class="profile-name">
                ${escapeHTML(profile.name)}
              </div>

              <div class="profile-meta">
                ${profile.roles
                  .map(role => escapeHTML(role))
                  .join(" · ")}
              </div>

            </div>

            <div class="profile-arrow">
              ›
            </div>

          </button>
        `).join("")}

      </div>
    `;
  }

  return `
    <section class="profile-gate">

      <div class="profile-wrap">

        <div class="brand">

          <h1>fawnwood</h1>

          <p>
            Who's using Fawnwood?
          </p>

        </div>

        ${profileContent}

        <button
          class="add-profile"
          onclick="openProfileModal()"
        >
          + Add profile
        </button>

      </div>

    </section>
  `;
}


/* =========================================================
   LOGIN / PROFILE
   ========================================================= */

function loginProfile(profileId) {
  const profile = state.profiles.find(
    item => item.id === profileId
  );

  if (!profile) return;

  state.currentUserId = profileId;

  saveState();

  currentPage = "home";

  render();

  showToast("Signed in.");
}

function switchProfile() {
  state.currentUserId = null;

  saveState();

  currentPage = "home";

  render();
}

function openProfileModal(profileId = null) {
  const profile = profileId
    ? state.profiles.find(item => item.id === profileId)
    : {
        name: "",
        roles: [],
        department: DEFAULT_DEPARTMENTS[0],
        status: "Active",
        notes: ""
      };

  if (!profile) return;

  openModal(`
    <h2>
      ${profileId ? "Edit profile" : "Create profile"}
    </h2>

    <p>
      ${
        profileId
          ? "Update this staff profile."
          : "Create a profile for someone using Fawnwood."
      }
    </p>

    <div class="form-grid">

      <div class="field">

        <label>
          Name
        </label>

        <input
          id="profile-name"
          class="input"
          value="${escapeHTML(profile.name)}"
          placeholder="Full name"
        >

      </div>


      <div class="field">

        <label>
          Department
        </label>

        <select
          id="profile-department"
          class="select"
        >

          ${state.departments.map(department => `
            <option
              ${
                profile.department === department
                  ? "selected"
                  : ""
              }
            >
              ${escapeHTML(department)}
            </option>
          `).join("")}

        </select>

      </div>


      <div class="field">

        <label>
          Status
        </label>

        <select
          id="profile-status"
          class="select"
        >

          <option ${
            profile.status === "Active"
              ? "selected"
              : ""
          }>
            Active
          </option>

          <option ${
            profile.status === "Away"
              ? "selected"
              : ""
          }>
            Away
          </option>

          <option ${
            profile.status === "Inactive"
              ? "selected"
              : ""
          }>
            Inactive
          </option>

        </select>

      </div>


      <div class="field">

        <label>
          Job role(s)
        </label>

        <div class="role-grid">

          ${DEFAULT_ROLES.map(role => `
            <button
              type="button"
              class="role-choice ${
                profile.roles.includes(role)
                  ? "selected"
                  : ""
              }"
              onclick="this.classList.toggle('selected')"
            >
              ${escapeHTML(role)}
            </button>
          `).join("")}

        </div>

      </div>


      <div class="field">

        <label>
          Notes
        </label>

        <textarea
          id="profile-notes"
          class="textarea"
          placeholder="Optional notes"
        >${escapeHTML(profile.notes || "")}</textarea>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn btn-primary"
        onclick="saveProfile('${profileId || ""}')"
      >
        ${profileId ? "Save" : "Create profile"}
      </button>

    </div>


    ${
      profileId
        ? `
          <div
            style="
              margin-top:13px;
              text-align:center;
            "
          >

            <button
              class="btn btn-danger"
              onclick="deleteProfile('${profileId}')"
            >
              Delete profile
            </button>

          </div>
        `
        : ""
    }

  `);
}

function saveProfile(profileId) {
  const name =
    document.getElementById("profile-name")
      .value
      .trim();

  const roles = [
    ...document.querySelectorAll(
      ".role-choice.selected"
    )
  ].map(button => button.textContent.trim());

  if (!name) {
    showToast("Enter a name.");
    return;
  }

  if (roles.length === 0) {
    showToast("Choose at least one role.");
    return;
  }

  const profile = {
    id: profileId || createId(),
    name,
    roles,
    department:
      document.getElementById("profile-department").value,
    status:
      document.getElementById("profile-status").value,
    notes:
      document.getElementById("profile-notes").value.trim()
  };

  if (profileId) {
    const index = state.profiles.findIndex(
      item => item.id === profileId
    );

    if (index !== -1) {
      state.profiles[index] = profile;
    }

    showToast("Profile updated.");
  } else {
    state.profiles.push(profile);

    showToast("Profile created.");
  }

  saveState();

  closeModal();

  render();
}

function deleteProfile(profileId) {
  const confirmed = confirm(
    "Delete this profile?"
  );

  if (!confirmed) return;

  state.profiles =
    state.profiles.filter(
      profile => profile.id !== profileId
    );

  if (state.currentUserId === profileId) {
    state.currentUserId = null;
  }

  saveState();

  closeModal();

  render();

  showToast("Profile deleted.");
}


/* =========================================================
   APPLICATION SHELL
   ========================================================= */

function renderAppShell() {
  const user = getCurrentUser();

  return `
    <div class="app">

      <header class="mobile-header">

        <div class="logo">
          fawnwood
        </div>

        <div class="user-mini">

          <div class="mini-avatar">
            ${getInitials(user.name)}
          </div>

        </div>

      </header>


      <aside class="sidebar">

        <div class="side-logo">
          fawnwood
        </div>

        <nav class="side-nav">
          ${renderSidebarNavigation()}
        </nav>


        <div class="side-user">

          <div class="side-user-row">

            <div
              class="avatar"
              style="
                width:34px;
                height:34px;
                border-radius:10px;
              "
            >
              ${getInitials(user.name)}
            </div>

            <div>

              <div class="side-user-name">
                ${escapeHTML(user.name)}
              </div>

              <div class="side-user-role">
                ${user.roles
                  .map(role => escapeHTML(role))
                  .join(" · ")}
              </div>

            </div>

          </div>

        </div>

      </aside>


      <main
        id="main"
        class="main"
      ></main>


      <nav class="bottom-nav">
        ${renderBottomNavigation()}
      </nav>

    </div>
  `;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function renderSidebarNavigation() {
  const navigation = [
    ["home", "⌂", "Home"],
    ["staff", "♙", "Staff"],
    ["schedule", "▦", "Schedule"],
    ["tasks", "✓", "Tasks"],
    ["departments", "◈", "Departments"],
    ["announcements", "◌", "Announcements"],
    ["reports", "▥", "Reports"],
    ["settings", "⚙", "Settings"]
  ];

  return navigation.map(item => `
    <button
      class="side-btn ${
        currentPage === item[0]
          ? "active"
          : ""
      }"
      onclick="goToPage('${item[0]}')"
    >

      <span>
        ${item[1]}
      </span>

      <span>
        ${item[2]}
      </span>

    </button>
  `).join("");
}

function renderBottomNavigation() {
  const navigation = [
    ["home", "⌂", "Home"],
    ["staff", "♙", "Staff"],
    ["schedule", "▦", "Schedule"],
    ["tasks", "✓", "Tasks"],
    ["more", "☰", "More"]
  ];

  return navigation.map(item => `
    <button
      class="nav-btn ${
        currentPage === item[0]
          ? "active"
          : ""
      }"
      onclick="goToPage('${item[0]}')"
    >

      <span class="ico">
        ${item[1]}
      </span>

      <span>
        ${item[2]}
      </span>

    </button>
  `).join("");
}

function goToPage(page) {
  if (!requireUser()) return;

  currentPage = page;

  searchFilter = "";

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderCurrentPage() {
  const main = document.getElementById("main");

  if (!main) return;

  switch (currentPage) {
    case "home":
      main.innerHTML = renderHomePage();
      break;

    case "staff":
      main.innerHTML = renderStaffPage();
      break;

    case "schedule":
      main.innerHTML = renderSchedulePage();
      break;

    case "tasks":
      main.innerHTML = renderTasksPage();
      break;

    case "departments":
      main.innerHTML = renderDepartmentsPage();
      break;

    case "announcements":
      main.innerHTML = renderAnnouncementsPage();
      break;

    case "reports":
      main.innerHTML = renderReportsPage();
      break;

    case "settings":
      main.innerHTML = renderSettingsPage();
      break;

    case "more":
      main.innerHTML = renderMorePage();
      break;

    default:
      main.innerHTML = renderHomePage();
  }
}


/* =========================================================
   COMMON UI
   ========================================================= */

function pageHeading(title, description) {
  return `
    <div class="heading">

      <h1>
        ${title}
      </h1>

      <p>
        ${description}
      </p>

    </div>
  `;
}

function stat(number, label) {
  return `
    <div class="card stat">

      <strong>
        ${number}
      </strong>

      <span>
        ${label}
      </span>

    </div>
  `;
}

function quickAction(icon, title, description, page) {
  return `
    <button
      class="action"
      onclick="goToPage('${page}')"
    >

      <div class="action-icon">
        ${icon}
      </div>

      <b>
        ${title}
      </b>

      <small>
        ${description}
      </small>

    </button>
  `;
}


/* =========================================================
   HOME
   ========================================================= */

function renderHomePage() {
  const user = getCurrentUser();

  const openTasks =
    state.tasks.filter(
      task => !task.done
    ).length;

  const todayShifts =
    state.shifts.filter(
      shift => shift.date === getToday()
    ).length;

  return `
    ${pageHeading(
      `Good ${getGreeting()}, ${
        escapeHTML(
          user.name.split(" ")[0]
        )
      }`,
      "Welcome back to Fawnwood."
    )}


    <div class="card welcome">

      <div class="eyebrow">
        Your profile
      </div>

      <h2>
        ${escapeHTML(user.name)}
      </h2>

      <p>
        ${user.roles
          .map(role => escapeHTML(role))
          .join(" · ")}
      </p>

    </div>


    <section class="section">

      <div class="section-head">
        <div class="section-title">
          Overview
        </div>
      </div>

      <div class="stats">

        ${stat(
          state.profiles.length,
          "Staff"
        )}

        ${stat(
          todayShifts,
          "Today's shifts"
        )}

        ${stat(
          openTasks,
          "Open tasks"
        )}

        ${stat(
          state.announcements.length,
          "Announcements"
        )}

      </div>

    </section>


    <section class="section">

      <div class="section-head">

        <div class="section-title">
          Quick actions
        </div>

      </div>


      <div class="actions">

        ${quickAction(
          "♙",
          "Staff",
          "Manage your team",
          "staff"
        )}

        ${quickAction(
          "▦",
          "Schedule",
          "Manage shifts",
          "schedule"
        )}

        ${quickAction(
          "✓",
          "Tasks",
          "Assign and track work",
          "tasks"
        )}

        ${quickAction(
          "◌",
          "Announcement",
          "Update your team",
          "announcements"
        )}

      </div>

    </section>


    <section class="section">

      <div class="section-head">

        <div class="section-title">
          Today's work
        </div>

        <button
          class="btn btn-ghost"
          onclick="goToPage('schedule')"
        >
          View all
        </button>

      </div>

      ${renderTodayWork()}

    </section>
  `;
}

function renderTodayWork() {
  const shifts =
    state.shifts
      .filter(
        shift => shift.date === getToday()
      )
      .slice(0, 3);

  if (shifts.length === 0) {
    return `
      <div class="card empty">

        <div class="empty-icon">
          ▦
        </div>

        <h2>
          No shifts today
        </h2>

        <p>
          Create a shift from Schedule
          when your rota is ready.
        </p>

        <button
          class="btn btn-primary"
          onclick="openShiftModal()"
        >
          Add shift
        </button>

      </div>
    `;
  }

  return `
    <div class="list">

      ${shifts
        .map(shift => renderShiftRow(shift))
        .join("")}

    </div>
  `;
}


/* =========================================================
   STAFF
   ========================================================= */

function renderStaffPage() {
  const query =
    searchFilter.toLowerCase();

  const profiles =
    state.profiles.filter(profile => {
      const searchable =
        profile.name +
        " " +
        profile.roles.join(" ");

      return searchable
        .toLowerCase()
        .includes(query);
    });

  return `
    ${pageHeading(
      "Staff",
      "Manage Fawnwood profiles and team roles."
    )}


    <input
      class="search"
      placeholder="Search staff or role..."
      value="${escapeHTML(searchFilter)}"
      oninput="
        searchFilter=this.value;
        renderCurrentPage();
      "
    >


    <div class="section-head">

      <div class="section-title">
        ${profiles.length}
        profile${profiles.length === 1 ? "" : "s"}
      </div>

      <button
        class="btn btn-primary"
        onclick="openProfileModal()"
      >
        + Add
      </button>

    </div>


    <div class="list">

      ${
        profiles.length
          ? profiles.map(profile => `
              <button
                class="list-row"
                onclick="
                  openStaffDetail('${profile.id}')
                "
              >

                <div class="avatar">
                  ${getInitials(profile.name)}
                </div>

                <div class="list-main">

                  <div class="list-title">
                    ${escapeHTML(profile.name)}
                  </div>

                  <div class="list-sub">

                    ${profile.roles.map(role => `
                      <span class="pill">
                        ${escapeHTML(role)}
                      </span>
                    `).join("")}

                  </div>

                </div>

                <div class="profile-arrow">
                  ›
                </div>

              </button>
            `).join("")
          : `
            <div class="card empty">

              <div class="empty-icon">
                ♙
              </div>

              <h2>
                No staff found
              </h2>

              <p>
                Try another search or add a profile.
              </p>

            </div>
          `
      }

    </div>
  `;
}

function openStaffDetail(profileId) {
  const profile =
    state.profiles.find(
      item => item.id === profileId
    );

  if (!profile) return;

  openModal(`
    <h2>
      ${escapeHTML(profile.name)}
    </h2>

    <p>
      ${profile.roles
        .map(role => escapeHTML(role))
        .join(" · ")}
    </p>


    <div class="section">

      <div class="eyebrow">
        Profile
      </div>

      <div class="card pad">

        <div class="list-sub">
          Department:
          ${escapeHTML(
            profile.department || "Not assigned"
          )}
        </div>

        <div class="list-sub">
          Status:
          <span class="pill success">
            ${escapeHTML(
              profile.status || "Active"
            )}
          </span>
        </div>

        <div class="list-sub">
          Notes:
          ${escapeHTML(
            profile.notes || "No notes"
          )}
        </div>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Close
      </button>

      <button
        class="btn btn-primary"
        onclick="
          closeModal();
          openProfileModal('${profileId}');
        "
      >
        Edit
      </button>

    </div>
  `);
}


/* =========================================================
   SCHEDULE
   ========================================================= */

function renderSchedulePage() {
  const shifts =
    [...state.shifts].sort(
      (a, b) =>
        (a.date + a.start)
          .localeCompare(
            b.date + b.start
          )
    );

  return `
    ${pageHeading(
      "Schedule",
      "Plan shifts and see who is working."
    )}


    <div class="section-head">

      <div class="section-title">
        ${state.shifts.length}
        shift${state.shifts.length === 1 ? "" : "s"}
      </div>

      <button
        class="btn btn-primary"
        onclick="openShiftModal()"
      >
        + Add shift
      </button>

    </div>


    <div class="list">

      ${
        shifts.length
          ? shifts
              .map(shift =>
                renderShiftRow(
                  shift,
                  true
                )
              )
              .join("")
          : `
            <div class="card empty">

              <div class="empty-icon">
                ▦
              </div>

              <h2>
                No shifts yet
              </h2>

              <p>
                Add your first shift to start
                building the rota.
              </p>

              <button
                class="btn btn-primary"
                onclick="openShiftModal()"
              >
                Add shift
              </button>

            </div>
          `
      }

    </div>
  `;
}

function renderShiftRow(
  shift,
  showActions = false
) {
  const profile =
    state.profiles.find(
      person =>
        person.id === shift.userId
    );

  return `
    <div class="card shift">

      <div class="shift-time">
        ${formatDate(shift.date)}
        ·
        ${escapeHTML(shift.start)}
        –
        ${escapeHTML(shift.end)}
      </div>

      <div class="shift-name">
        ${escapeHTML(
          profile
            ? profile.name
            : "Unassigned"
        )}
      </div>

      <div class="shift-meta">
        ${escapeHTML(
          shift.role || "General"
        )}
        ·
        ${escapeHTML(
          shift.department ||
          "No department"
        )}
      </div>


      ${
        showActions
          ? `
            <div
              class="btn-row"
              style="margin-top:11px"
            >

              <button
                class="btn btn-secondary"
                onclick="
                  openShiftModal('${shift.id}')
                "
              >
                Edit
              </button>

              <button
                class="btn btn-danger"
                onclick="
                  deleteShift('${shift.id}')
                "
              >
                Delete
              </button>

            </div>
          `
          : ""
      }

    </div>
  `;
}

function openShiftModal(shiftId = null) {
  const shift = shiftId
    ? state.shifts.find(
        item => item.id === shiftId
      )
    : {
        date: getToday(),
        start: "09:00",
        end: "17:00",
        userId:
          state.profiles[0]?.id || "",
        role: DEFAULT_ROLES[0],
        department:
          state.departments[0]
      };

  if (!shift) return;

  openModal(`
    <h2>
      ${shiftId ? "Edit shift" : "Add shift"}
    </h2>

    <p>
      Create a rota entry for a team member.
    </p>


    <div class="form-grid two">

      <div class="field">

        <label>
          Date
        </label>

        <input
          id="shift-date"
          type="date"
          class="input"
          value="${escapeHTML(shift.date)}"
        >

      </div>


      <div class="field">

        <label>
          Staff member
        </label>

        <select
          id="shift-user"
          class="select"
        >

          ${state.profiles.map(profile => `
            <option
              value="${profile.id}"
              ${
                profile.id === shift.userId
                  ? "selected"
                  : ""
              }
            >
              ${escapeHTML(profile.name)}
            </option>
          `).join("")}

        </select>

      </div>


      <div class="field">

        <label>
          Start
        </label>

        <input
          id="shift-start"
          type="time"
          class="input"
          value="${escapeHTML(shift.start)}"
        >

      </div>


      <div class="field">

        <label>
          End
        </label>

        <input
          id="shift-end"
          type="time"
          class="input"
          value="${escapeHTML(shift.end)}"
        >

      </div>


      <div class="field">

        <label>
          Role
        </label>

        <select
          id="shift-role"
          class="select"
        >

          ${DEFAULT_ROLES.map(role => `
            <option
              ${
                role === shift.role
                  ? "selected"
                  : ""
              }
            >
              ${escapeHTML(role)}
            </option>
          `).join("")}

        </select>

      </div>


      <div class="field">

        <label>
          Department
        </label>

        <select
          id="shift-department"
          class="select"
        >

          ${state.departments.map(department => `
            <option
              ${
                department ===
                shift.department
                  ? "selected"
                  : ""
              }
            >
              ${escapeHTML(department)}
            </option>
          `).join("")}

        </select>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn btn-primary"
        onclick="
          saveShift('${shiftId || ""}')
        "
      >
        ${shiftId ? "Save" : "Add shift"}
      </button>

    </div>
  `);
}

function saveShift(shiftId) {
  const shift = {
    id: shiftId || createId(),

    date:
      document.getElementById(
        "shift-date"
      ).value,

    start:
      document.getElementById(
        "shift-start"
      ).value,

    end:
      document.getElementById(
        "shift-end"
      ).value,

    userId:
      document.getElementById(
        "shift-user"
      ).value,

    role:
      document.getElementById(
        "shift-role"
      ).value,

    department:
      document.getElementById(
        "shift-department"
      ).value
  };

  if (!shift.date || !shift.userId) {
    showToast(
      "Choose a date and staff member."
    );

    return;
  }

  if (shiftId) {
    const index =
      state.shifts.findIndex(
        item => item.id === shiftId
      );

    if (index !== -1) {
      state.shifts[index] = shift;
    }

    showToast("Shift updated.");
  } else {
    state.shifts.push(shift);

    showToast("Shift added.");
  }

  saveState();

  closeModal();

  render();
}

function deleteShift(shiftId) {
  if (
    !confirm(
      "Delete this shift?"
    )
  ) {
    return;
  }

  state.shifts =
    state.shifts.filter(
      shift => shift.id !== shiftId
    );

  saveState();

  render();

  showToast("Shift deleted.");
}


/* =========================================================
   TASKS
   ========================================================= */

function renderTasksPage() {
  const query =
    searchFilter.toLowerCase();

  const tasks =
    state.tasks.filter(task => {
      const searchable =
        task.title +
        " " +
        task.priority +
        " " +
        task.department;

      return searchable
        .toLowerCase()
        .includes(query);
    });

  const openTasks =
    state.tasks.filter(
      task => !task.done
    ).length;

  return `
    ${pageHeading(
      "Tasks",
      "Create, assign and track hotel work."
    )}


    <input
      class="search"
      placeholder="Search tasks..."
      value="${escapeHTML(searchFilter)}"
      oninput="
        searchFilter=this.value;
        renderCurrentPage();
      "
    >


    <div class="section-head">

      <div class="section-title">
        ${openTasks} open
      </div>

      <button
        class="btn btn-primary"
        onclick="openTaskModal()"
      >
        + Add task
      </button>

    </div>


    <div class="card">

      <div class="list">

        ${
          tasks.length
            ? tasks.map(
                task =>
                  renderTaskRow(task)
              ).join("")
            : `
              <div class="empty">

                <div class="empty-icon">
                  ✓
                </div>

                <h2>
                  No tasks found
                </h2>

                <p>
                  Add a task to start
                  tracking work.
                </p>

              </div>
            `
        }

      </div>

    </div>
  `;
}

function renderTaskRow(task) {
  const profile =
    state.profiles.find(
      person =>
        person.id === task.userId
    );

  return `
    <div class="task-row">

      <button
        class="check ${
          task.done
            ? "done"
            : ""
        }"
        onclick="
          toggleTask('${task.id}')
        "
      >
        ${task.done ? "✓" : ""}
      </button>


      <div class="task-content">

        <div
          class="task-title ${
            task.done
              ? "task-done"
              : ""
          }"
        >
          ${escapeHTML(task.title)}
        </div>

        <div class="task-meta">

          ${escapeHTML(
            task.priority
          )}

          ·

          ${escapeHTML(
            task.department
          )}

          ·

          ${
            profile
              ? escapeHTML(profile.name)
              : "Unassigned"
          }

          · due

          ${formatDate(task.due)}

        </div>

      </div>


      <button
        class="btn btn-ghost"
        onclick="
          openTaskModal('${task.id}')
        "
      >
        Edit
      </button>

    </div>
  `;
}

function openTaskModal(taskId = null) {
  const task = taskId
    ? state.tasks.find(
        item => item.id === taskId
      )
    : {
        title: "",
        priority: "Normal",
        department:
          state.departments[0],
        userId:
          state.profiles[0]?.id || "",
        due: getToday(),
        notes: ""
      };

  if (!task) return;

  openModal(`
    <h2>
      ${taskId ? "Edit task" : "Create task"}
    </h2>

    <p>
      Assign work and keep track
      of completion.
    </p>


    <div class="form-grid">

      <div class="field">

        <label>
          Task
        </label>

        <input
          id="task-title"
          class="input"
          value="${escapeHTML(task.title)}"
          placeholder="e.g. Prepare room 204"
        >

      </div>


      <div class="form-grid two">

        <div class="field">

          <label>
            Priority
          </label>

          <select
            id="task-priority"
            class="select"
          >

            ${[
              "Low",
              "Normal",
              "High",
              "Urgent"
            ].map(priority => `
              <option
                ${
                  priority === task.priority
                    ? "selected"
                    : ""
                }
              >
                ${priority}
              </option>
            `).join("")}

          </select>

        </div>


        <div class="field">

          <label>
            Due date
          </label>

          <input
            id="task-due"
            type="date"
            class="input"
            value="${escapeHTML(task.due)}"
          >

        </div>

      </div>


      <div class="form-grid two">

        <div class="field">

          <label>
            Assignee
          </label>

          <select
            id="task-user"
            class="select"
          >

            <option value="">
              Unassigned
            </option>

            ${state.profiles.map(profile => `
              <option
                value="${profile.id}"
                ${
                  profile.id === task.userId
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(profile.name)}
              </option>
            `).join("")}

          </select>

        </div>


        <div class="field">

          <label>
            Department
          </label>

          <select
            id="task-department"
            class="select"
          >

            ${state.departments.map(department => `
              <option
                ${
                  department ===
                  task.department
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(department)}
              </option>
            `).join("")}

          </select>

        </div>

      </div>


      <div class="field">

        <label>
          Notes
        </label>

        <textarea
          id="task-notes"
          class="textarea"
        >${escapeHTML(task.notes || "")}</textarea>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn btn-primary"
        onclick="
          saveTask('${taskId || ""}')
        "
      >
        ${taskId ? "Save" : "Create task"}
      </button>

    </div>


    ${
      taskId
        ? `
          <div
            style="
              margin-top:13px;
              text-align:center;
            "
          >

            <button
              class="btn btn-danger"
              onclick="
                deleteTask('${taskId}')
              "
            >
              Delete task
            </button>

          </div>
        `
        : ""
    }

  `);
}

function saveTask(taskId) {
  const title =
    document.getElementById(
      "task-title"
    ).value.trim();

  if (!title) {
    showToast("Enter a task.");
    return;
  }

  const existingTask =
    taskId
      ? state.tasks.find(
          task => task.id === taskId
        )
      : null;

  const task = {
    id: taskId || createId(),

    title,

    priority:
      document.getElementById(
        "task-priority"
      ).value,

    due:
      document.getElementById(
        "task-due"
      ).value,

    userId:
      document.getElementById(
        "task-user"
      ).value,

    department:
      document.getElementById(
        "task-department"
      ).value,

    notes:
      document.getElementById(
        "task-notes"
      ).value.trim(),

    done:
      existingTask
        ? existingTask.done
        : false
  };

  if (taskId) {
    const index =
      state.tasks.findIndex(
        item => item.id === taskId
      );

    if (index !== -1) {
      state.tasks[index] = task;
    }

    showToast("Task updated.");
  } else {
    state.tasks.push(task);

    showToast("Task created.");
  }

  saveState();

  closeModal();

  render();
}

function toggleTask(taskId) {
  const task =
    state.tasks.find(
      item => item.id === taskId
    );

  if (!task) return;

  task.done = !task.done;

  saveState();

  renderCurrentPage();

  showToast(
    task.done
      ? "Task completed."
      : "Task reopened."
  );
}

function deleteTask(taskId) {
  if (
    !confirm(
      "Delete this task?"
    )
  ) {
    return;
  }

  state.tasks =
    state.tasks.filter(
      task => task.id !== taskId
    );

  saveState();

  closeModal();

  render();

  showToast("Task deleted.");
}


/* =========================================================
   DEPARTMENTS
   ========================================================= */

function renderDepartmentsPage() {
  return `
    ${pageHeading(
      "Departments",
      "Organise your team by hotel area."
    )}


    <div class="section-head">

      <div class="section-title">
        ${state.departments.length}
        departments
      </div>

      <button
        class="btn btn-primary"
        onclick="openDepartmentModal()"
      >
        + Add
      </button>

    </div>


    <div class="list">

      ${state.departments.map(department => {

        const staffCount =
          state.profiles.filter(
            profile =>
              profile.department ===
              department
          ).length;

        return `
          <div class="list-row">

            <div class="menu-icon">
              ◈
            </div>

            <div class="list-main">

              <div class="list-title">
                ${escapeHTML(department)}
              </div>

              <div class="list-sub">
                ${staffCount}
                staff member${
                  staffCount === 1
                    ? ""
                    : "s"
                }
              </div>

            </div>

            <button
              class="btn btn-ghost"
              onclick="
                openDepartmentModal(
                  '${escapeHTML(department)}'
                )
              "
            >
              Edit
            </button>

          </div>
        `;
      }).join("")}

    </div>
  `;
}

function openDepartmentModal(
  oldDepartment = ""
) {
  openModal(`
    <h2>
      ${
        oldDepartment
          ? "Edit department"
          : "Add department"
      }
    </h2>

    <p>
      Use departments to organise
      staff, shifts and tasks.
    </p>


    <div
      class="field"
      style="margin-top:18px"
    >

      <label>
        Name
      </label>

      <input
        id="department-name"
        class="input"
        value="${escapeHTML(oldDepartment)}"
        placeholder="Department name"
      >

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn btn-primary"
        onclick="
          saveDepartment(
            '${escapeHTML(oldDepartment)}'
          )
        "
      >
        Save
      </button>

    </div>
  `);
}

function saveDepartment(oldDepartment) {
  const newName =
    document.getElementById(
      "department-name"
    ).value.trim();

  if (!newName) {
    showToast(
      "Enter a department name."
    );

    return;
  }

  if (oldDepartment) {
    const index =
      state.departments.indexOf(
        oldDepartment
      );

    if (index !== -1) {
      state.departments[index] =
        newName;
    }

    state.profiles.forEach(profile => {
      if (
        profile.department ===
        oldDepartment
      ) {
        profile.department =
          newName;
      }
    });

    state.shifts.forEach(shift => {
      if (
        shift.department ===
        oldDepartment
      ) {
        shift.department =
          newName;
      }
    });

    state.tasks.forEach(task => {
      if (
        task.department ===
        oldDepartment
      ) {
        task.department =
          newName;
      }
    });
  } else {
    if (
      state.departments.includes(
        newName
      )
    ) {
      showToast(
        "That department already exists."
      );

      return;
    }

    state.departments.push(
      newName
    );
  }

  saveState();

  closeModal();

  render();

  showToast(
    "Department saved."
  );
}


/* =========================================================
   ANNOUNCEMENTS
   ========================================================= */

function renderAnnouncementsPage() {
  return `
    ${pageHeading(
      "Announcements",
      "Share updates with the Fawnwood team."
    )}


    <div class="section-head">

      <div class="section-title">
        ${state.announcements.length}
        announcement${
          state.announcements.length === 1
            ? ""
            : "s"
        }
      </div>

      <button
        class="btn btn-primary"
        onclick="openAnnouncementModal()"
      >
        + Add
      </button>

    </div>


    <div class="list">

      ${
        state.announcements.length
          ? [...state.announcements]
              .reverse()
              .map(
                announcement => `
                  <div class="card notice">

                    <div class="notice-title">
                      ${escapeHTML(
                        announcement.title
                      )}
                    </div>

                    <div class="notice-body">
                      ${escapeHTML(
                        announcement.body
                      )}
                    </div>

                    <div class="notice-meta">
                      ${escapeHTML(
                        announcement.department ||
                        "Hotel-wide"
                      )}
                      ·
                      ${formatDate(
                        announcement.date
                      )}
                    </div>


                    <div
                      class="btn-row"
                      style="margin-top:10px"
                    >

                      <button
                        class="btn btn-secondary"
                        onclick="
                          openAnnouncementModal(
                            '${announcement.id}'
                          )
                        "
                      >
                        Edit
                      </button>

                      <button
                        class="btn btn-danger"
                        onclick="
                          deleteAnnouncement(
                            '${announcement.id}'
                          )
                        "
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                `
              )
              .join("")
          : `
            <div class="card empty">

              <div class="empty-icon">
                ◌
              </div>

              <h2>
                No announcements
              </h2>

              <p>
                Post an update for your team.
              </p>

              <button
                class="btn btn-primary"
                onclick="
                  openAnnouncementModal()
                "
              >
                Create announcement
              </button>

            </div>
          `
      }

    </div>
  `;
}

function openAnnouncementModal(
  announcementId = null
) {
  const announcement =
    announcementId
      ? state.announcements.find(
          item =>
            item.id === announcementId
        )
      : {
          title: "",
          body: "",
          department: "Hotel-wide",
          date: getToday()
        };

  if (!announcement) return;

  openModal(`
    <h2>
      ${
        announcementId
          ? "Edit announcement"
          : "New announcement"
      }
    </h2>

    <p>
      Keep staff informed with
      a clear update.
    </p>


    <div class="form-grid">

      <div class="field">

        <label>
          Title
        </label>

        <input
          id="announcement-title"
          class="input"
          value="${escapeHTML(
            announcement.title
          )}"
        >

      </div>


      <div class="field">

        <label>
          Audience
        </label>

        <select
          id="announcement-department"
          class="select"
        >

          <option>
            Hotel-wide
          </option>

          ${state.departments.map(
            department => `
              <option
                ${
                  announcement.department ===
                  department
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(department)}
              </option>
            `
          ).join("")}

        </select>

      </div>


      <div class="field">

        <label>
          Message
        </label>

        <textarea
          id="announcement-body"
          class="textarea"
        >${escapeHTML(
          announcement.body
        )}</textarea>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn btn-primary"
        onclick="
          saveAnnouncement(
            '${announcementId || ""}'
          )
        "
      >
        ${
          announcementId
            ? "Save"
            : "Publish"
        }
      </button>

    </div>
  `);
}

function saveAnnouncement(
  announcementId
) {
  const title =
    document.getElementById(
      "announcement-title"
    ).value.trim();

  const body =
    document.getElementById(
      "announcement-body"
    ).value.trim();

  if (!title || !body) {
    showToast(
      "Add a title and message."
    );

    return;
  }

  const announcement = {
    id:
      announcementId ||
      createId(),

    title,

    body,

    department:
      document.getElementById(
        "announcement-department"
      ).value,

    date: getToday()
  };

  if (announcementId) {
    const index =
      state.announcements.findIndex(
        item =>
          item.id ===
          announcementId
      );

    if (index !== -1) {
      state.announcements[index] =
        announcement;
    }

    showToast(
      "Announcement updated."
    );
  } else {
    state.announcements.push(
      announcement
    );

    showToast(
      "Announcement published."
    );
  }

  saveState();

  closeModal();

  render();
}

function deleteAnnouncement(
  announcementId
) {
  if (
    !confirm(
      "Delete this announcement?"
    )
  ) {
    return;
  }

  state.announcements =
    state.announcements.filter(
      announcement =>
        announcement.id !==
        announcementId
    );

  saveState();

  render();

  showToast(
    "Announcement deleted."
  );
}


/* =========================================================
   REPORTS
   ========================================================= */

function renderReportsPage() {
  const completedTasks =
    state.tasks.filter(
      task => task.done
    ).length;

  const openTasks =
    state.tasks.filter(
      task => !task.done
    ).length;

  return `
    ${pageHeading(
      "Reports",
      "A simple overview of Fawnwood activity."
    )}


    <div class="stats">

      ${stat(
        state.profiles.length,
        "Staff"
      )}

      ${stat(
        state.shifts.length,
        "Total shifts"
      )}

      ${stat(
        openTasks,
        "Open tasks"
      )}

      ${stat(
        completedTasks,
        "Completed tasks"
      )}

    </div>


    <section class="section">

      <div class="section-head">

        <div class="section-title">
          Department overview
        </div>

      </div>


      <div class="list">

        ${state.departments.map(
          department => `
            <div class="list-row">

              <div class="menu-icon">
                ◈
              </div>

              <div class="list-main">

                <div class="list-title">
                  ${escapeHTML(
                    department
                  )}
                </div>

                <div class="list-sub">

                  ${
                    state.profiles.filter(
                      profile =>
                        profile.department ===
                        department
                    ).length
                  }
                  staff ·

                  ${
                    state.tasks.filter(
                      task =>
                        task.department ===
                        department &&
                        !task.done
                    ).length
                  }
                  open tasks ·

                  ${
                    state.shifts.filter(
                      shift =>
                        shift.department ===
                        department
                    ).length
                  }
                  shifts

                </div>

              </div>

            </div>
          `
        ).join("")}

      </div>

    </section>
  `;
}


/* =========================================================
   SETTINGS
   ========================================================= */

function renderSettingsPage() {
  const user =
    getCurrentUser();

  return `
    ${pageHeading(
      "Settings",
      "Manage your Fawnwood workspace and profile."
    )}


    <section class="section">

      <div class="section-head">

        <div class="section-title">
          Your profile
        </div>

      </div>


      <div class="card pad">

        <div
          class="list-row"
          style="
            padding:0;
            border:0;
            box-shadow:none;
          "
        >

          <div class="avatar">
            ${getInitials(user.name)}
          </div>

          <div class="list-main">

            <div class="list-title">
              ${escapeHTML(user.name)}
            </div>

            <div class="list-sub">
              ${user.roles
                .map(role =>
                  escapeHTML(role)
                )
                .join(" · ")}
            </div>

          </div>

        </div>


        <div
          class="btn-row"
          style="margin-top:15px"
        >

          <button
            class="btn btn-secondary"
            onclick="
              openProfileModal('${user.id}')
            "
          >
            Edit profile
          </button>

          <button
            class="btn btn-secondary"
            onclick="switchProfile()"
          >
            Switch profile
          </button>

        </div>

      </div>

    </section>


    <section class="section">

      <div class="section-head">

        <div class="section-title">
          Workspace
        </div>

      </div>


      <div class="menu-list">

        <button
          class="menu-item"
          onclick="
            goToPage('departments')
          "
        >

          <div class="menu-icon">
            ◈
          </div>

          <div>

            <b>
              Departments
            </b>

            <small>
              Manage hotel areas
            </small>

          </div>

          <div class="menu-arrow">
            ›
          </div>

        </button>


        <button
          class="menu-item"
          onclick="exportData()"
        >

          <div class="menu-icon">
            ⇩
          </div>

          <div>

            <b>
              Export data
            </b>

            <small>
              Save a backup of your workspace
            </small>

          </div>

          <div class="menu-arrow">
            ›
          </div>

        </button>


        <button
          class="menu-item"
          onclick="resetWorkspace()"
        >

          <div class="menu-icon">
            ↺
          </div>

          <div>

            <b>
              Reset workspace
            </b>

            <small>
              Remove local Fawnwood data
            </small>

          </div>

          <div class="menu-arrow">
            ›
          </div>

        </button>

      </div>

    </section>
  `;
}


/* =========================================================
   MORE
   ========================================================= */

function renderMorePage() {
  return `
    ${pageHeading(
      "More",
      "More Fawnwood tools."
    )}


    <div class="menu-list">

      ${menuItem(
        "◈",
        "Departments",
        "Manage hotel departments",
        "departments"
      )}

      ${menuItem(
        "◌",
        "Announcements",
        "Share team updates",
        "announcements"
      )}

      ${menuItem(
        "▥",
        "Reports",
        "View workspace statistics",
        "reports"
      )}

      ${menuItem(
        "⚙",
        "Settings",
        "Manage your workspace",
        "settings"
      )}

    </div>
  `;
}

function menuItem(
  icon,
  title,
  description,
  page
) {
  return `
    <button
      class="menu-item"
      onclick="
        goToPage('${page}')
      "
    >

      <div class="menu-icon">
        ${icon}
      </div>

      <div>

        <b>
          ${title}
        </b>

        <small>
          ${description}
        </small>

      </div>

      <div class="menu-arrow">
        ›
      </div>

    </button>
  `;
}


/* =========================================================
   EXPORT / RESET
   ========================================================= */

function exportData() {
  const data =
    JSON.stringify(
      state,
      null,
      2
    );

  const blob =
    new Blob(
      [data],
      {
        type:
          "application/json"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    "fawnwood-backup.json";

  link.click();

  URL.revokeObjectURL(url);

  showToast(
    "Backup exported."
  );
}

function resetWorkspace() {
  const confirmed =
    confirm(
      "This will delete all Fawnwood data stored in this browser. Continue?"
    );

  if (!confirmed) return;

  localStorage.removeItem(
    STORAGE_KEY
  );

  location.reload();
}


/* =========================================================
   START APPLICATION
   ========================================================= */

render();
