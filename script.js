
// =========================
// STUDENT MANAGEMENT SYSTEM
// =========================


// =========================
// API CONFIGURATION
// =========================

// Deployed Render backend URL
const API_BASE_URL =
    "https://student-management-system-x8kc.onrender.com";

// API endpoints
const API_URL = `${API_BASE_URL}/api/students`;
const AUTH_URL = `${API_BASE_URL}/api/auth`;
const USERS_URL = `${API_BASE_URL}/api/users`;


// =========================
// DOM ELEMENTS
// =========================

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");

const themeBtn = document.getElementById("themeBtn");
const settingsThemeBtn =
    document.getElementById("settingsThemeBtn");

const navLinks =
    document.querySelectorAll(".nav-link[data-page]");

const pages =
    document.querySelectorAll(".page-section");


// =========================
// APPLICATION DATA
// =========================

let authToken = sessionStorage.getItem("smsToken") || "";

let currentUserRole =
    sessionStorage.getItem("smsRole") || "";

let students = [];

let editingStudentId = null;

let recentActivities = [];


// =========================
// ROLE PERMISSION HELPERS
// =========================

function isAdmin() {
    return currentUserRole === "admin";
}

function canManageStudents() {
    return ["admin", "registrar"].includes(currentUserRole);
}

function canDeleteStudents() {
    return isAdmin();
}

function updateRolePermissions() {

    // Add Student buttons
    document.querySelectorAll(".add-student-btn")
        .forEach(button => {
            button.style.display =
                canManageStudents() ? "" : "none";
        });

    // User Management navigation
    document.querySelectorAll(
        '[data-page="users"], [data-page="user-management"]'
    ).forEach(link => {
        link.style.display =
            isAdmin() ? "" : "none";
    });

    // User Management page
    const userPage =
        document.getElementById("usersPage") ||
        document.getElementById("user-managementPage");

    if (userPage) {
        userPage.style.display =
            isAdmin() ? "" : "none";
    }
}


// =========================
// RECENT ACTIVITY FUNCTIONS
// =========================

function addRecentActivity(action, details, icon = "📋") {

    recentActivities.unshift({
        action,
        details,
        icon,
        time: new Date().toLocaleString()
    });

    recentActivities =
        recentActivities.slice(0, 10);

    renderRecentActivity();
}


function renderRecentActivity() {

    const activityList =
        document.getElementById("recentActivityList");

    if (!activityList) return;

    if (recentActivities.length === 0) {

        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">📋</div>

                <div class="activity-details">
                    <h4>No recent activity</h4>
                    <p>System activities will appear here.</p>
                </div>
            </div>
        `;

        return;
    }

    activityList.innerHTML = recentActivities.map(activity => `

        <div class="activity-item">

            <div class="activity-icon">
                ${escapeHTML(activity.icon)}
            </div>

            <div class="activity-details">

                <h4>${escapeHTML(activity.action)}</h4>

                <p>${escapeHTML(activity.details)}</p>

                <small>${escapeHTML(activity.time)}</small>

            </div>

        </div>

    `).join("");
}


// =========================
// LOGIN ELEMENTS
// =========================

const loginPage =
    document.getElementById("loginPage");

const loginForm =
    document.getElementById("loginForm");

const loginError =
    document.getElementById("loginError");


function showLoginPage() {

    if (loginPage) {
        loginPage.style.display = "flex";
    }
}


function hideLoginPage() {

    if (loginPage) {
        loginPage.style.display = "none";
    }
}


// =========================
// LOGIN FORM SUBMISSION
// =========================

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const username =
            document.getElementById("loginUsername").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        if (loginError) {
            loginError.textContent = "Logging in...";
        }

        try {

            const response = await fetch(`${AUTH_URL}/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    username,
                    password
                })

            });

            let result = {};

            try {
                result = await response.json();
            } catch (error) {
                result = {};
            }

            if (!response.ok || !result.success || !result.token) {

                throw new Error(
                    result.message ||
                    `Login failed (${response.status}). Please check your credentials.`
                );
            }

            // Save login token
            authToken = result.token;

            // Get user role
            currentUserRole =
                result.admin?.role ||
                result.user?.role ||
                result.role ||
                result.data?.role ||
                "";

            if (!currentUserRole) {

                authToken = "";

                throw new Error(
                    "Your account role was not returned. Please contact the administrator."
                );
            }

            // Save session
            sessionStorage.setItem(
                "smsToken",
                authToken
            );

            sessionStorage.setItem(
                "smsRole",
                currentUserRole
            );

            loginForm.reset();

            if (loginError) {
                loginError.textContent = "";
            }

            hideLoginPage();

            updateRolePermissions();

            addRecentActivity(
                `${currentUserRole} logged in`,
                `Welcome, ${username}.`,
                "🔐"
            );

            await loadStudents();

        } catch (error) {

            console.error("Login error:", error);

            if (loginError) {

                loginError.textContent =
                    error.message === "Failed to fetch"
                        ? "Cannot connect to the server. Please check your internet connection and try again."
                        : error.message;

            }

        }

    });

}


// =========================
// LOGOUT FUNCTION
// =========================

function logout() {

    if (authToken) {

        addRecentActivity(
            "User logged out",
            "The user signed out of the system.",
            "🚪"
        );
    }

    authToken = "";

    currentUserRole = "";

    students = [];

    sessionStorage.removeItem("smsToken");
    sessionStorage.removeItem("smsRole");

    if (loginForm) {
        loginForm.reset();
    }

    if (loginError) {
        loginError.textContent = "";
    }

    closeStudentModal();

    updateRolePermissions();

    refreshStudentViews();

    showLoginPage();
}


// =========================
// LOGOUT BUTTON
// =========================

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", logout);

}


// =========================
// API REQUEST FUNCTION
// =========================

async function apiRequest(url, options = {}) {

    let response;

    try {

        response = await fetch(url, {

            ...options,

            headers: {

                "Content-Type": "application/json",

                "Accept": "application/json",

                ...(authToken
                    ? {
                        "Authorization": `Bearer ${authToken}`
                    }
                    : {}),

                ...(options.headers || {})

            }

        });

    } catch (error) {

        console.error("Network request failed:", error);

        throw new Error(
            "Cannot connect to the backend server. Please try again."
        );
    }

    let result = {};

    try {

        result = await response.json();

    } catch (error) {

        result = {};

    }

    // Handle expired or invalid token
    if (response.status === 401) {

        authToken = "";

        currentUserRole = "";

        sessionStorage.removeItem("smsToken");
        sessionStorage.removeItem("smsRole");

        students = [];

        updateRolePermissions();

        refreshStudentViews();

        showLoginPage();

        throw new Error(
            result.message ||
            "Your session has expired. Please log in again."
        );
    }

    if (!response.ok) {

        throw new Error(
            result.message ||
            `Request failed (${response.status})`
        );
    }

    return result;
}


// =========================
// LOAD STUDENTS FROM MONGODB
// =========================

async function loadStudents() {

    if (!authToken) {

        students = [];

        refreshStudentViews();

        showLoginPage();

        return;
    }

    try {

        const result =
            await apiRequest(API_URL);

        students =
            Array.isArray(result.data)
                ? result.data
                : [];

        refreshStudentViews();

    } catch (error) {

        console.error(
            "Could not load students:",
            error
        );

        if (authToken) {

            alert(
                error.message ||
                "Could not connect to the student database. Make sure the backend is running."
            );

        }
    }
}


// =========================
// REFRESH ALL STUDENT VIEWS
// =========================

function refreshStudentViews() {

    renderStudents();

    renderRecentStudents();

    updateStatistics();

    updateReports();

    updateDashboardAnalytics();

    updateStudentChart();
}


// =========================
// MOBILE SIDEBAR
// =========================

if (menuBtn && sidebar) {

    menuBtn.addEventListener("click", () => {

        sidebar.classList.toggle("show");

    });

}


// =========================
// DARK MODE
// =========================

function updateThemeButton() {

    if (!themeBtn) return;

    if (document.body.classList.contains("dark-mode")) {

        themeBtn.textContent = "☀️";

    } else {

        themeBtn.textContent = "🌙";

    }
}


function toggleDarkMode() {

    document.body.classList.toggle("dark-mode");

    const isDark =
        document.body.classList.contains("dark-mode");

    localStorage.setItem(
        "darkMode",
        isDark ? "true" : "false"
    );

    updateThemeButton();
}


const savedDarkMode =
    localStorage.getItem("darkMode");

if (savedDarkMode === "true") {

    document.body.classList.add("dark-mode");

}

updateThemeButton();


if (themeBtn) {

    themeBtn.addEventListener(
        "click",
        toggleDarkMode
    );

}


if (settingsThemeBtn) {

    settingsThemeBtn.addEventListener(
        "click",
        toggleDarkMode
    );

}


// =========================
// PAGE NAVIGATION
// =========================

function showPage(pageName) {

    // Prevent non-admin users from opening User Management
    if (
        ["users", "user-management"].includes(pageName) &&
        !isAdmin()
    ) {

        alert(
            "Only administrators can access User Management."
        );

        return;
    }

    // Hide all pages
    pages.forEach(page => {

        page.classList.remove("active-page");

    });

    // Remove active status from sidebar links
    navLinks.forEach(link => {

        link.classList.remove("active");

    });

    // Find selected page
    const selectedPage =
        document.getElementById(
            `${pageName}Page`
        );

    // Show selected page
    if (!selectedPage) {

        console.error(`Page not found: ${pageName}Page`);

        return;
    }

    selectedPage.classList.add("active-page");

    // Highlight selected navigation link
    const selectedLink =
        document.querySelector(
            `.nav-link[data-page="${pageName}"]`
        );

    if (selectedLink) {

        selectedLink.classList.add("active");

    }

    // Update reports
    if (pageName === "reports") {

        updateReports();

    }

    // Update dashboard analytics
    if (pageName === "dashboard") {

        updateDashboardAnalytics();

    }

    // Close mobile sidebar
    if (
        window.innerWidth <= 768 &&
        sidebar
    ) {

        sidebar.classList.remove("show");

    }
}


// Handle all links that have data-page

document.addEventListener("click", event => {

    const target = event.target;

    if (!(target instanceof Element)) return;

    const link = target.closest("[data-page]");

    if (!link) return;

    const pageName = link.dataset.page;

    const targetPage = document.getElementById(
        `${pageName}Page`
    );

    if (!targetPage) return;

    event.preventDefault();

    showPage(pageName);

});


// =========================
// MODAL ELEMENTS
// =========================

const studentModal =
    document.getElementById("studentModal");

const closeModal =
    document.getElementById("closeModal");

const cancelModal =
    document.getElementById("cancelModal");

const studentForm =
    document.getElementById("studentForm");

const modalTitle =
    document.getElementById("modalTitle");


// =========================
// FORM ELEMENTS
// =========================

const studentId =
    document.getElementById("studentId");

const studentName =
    document.getElementById("studentName");

const studentGender =
    document.getElementById("studentGender");

const studentEmail =
    document.getElementById("studentEmail");

const studentDepartment =
    document.getElementById("studentDepartment");

const studentYear =
    document.getElementById("studentYear");


// =========================
// OPEN ADD STUDENT MODAL
// =========================

function openAddStudentModal() {

    if (!canManageStudents()) {

        alert(
            "You do not have permission to add students."
        );

        return;
    }

    if (
        !studentModal ||
        !studentForm ||
        !modalTitle ||
        !studentId ||
        !studentName
    ) return;

    editingStudentId = null;

    modalTitle.textContent = "Add Student";

    studentForm.reset();

    studentId.disabled = false;

    studentModal.classList.add("show");

    studentName.focus();
}


// =========================
// CLOSE STUDENT MODAL
// =========================

function closeStudentModal() {

    if (!studentModal || !studentForm) return;

    studentModal.classList.remove("show");

    editingStudentId = null;

    studentForm.reset();

    if (studentId) {
        studentId.disabled = false;
    }

    if (modalTitle) {
        modalTitle.textContent = "Add Student";
    }
}


// =========================
// ADD STUDENT BUTTONS
// =========================

const addStudentButtons =
    document.querySelectorAll(".add-student-btn");


addStudentButtons.forEach(button => {

    button.addEventListener("click", event => {

        event.preventDefault();

        openAddStudentModal();

    });

});


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeStudentModal
    );

}


if (cancelModal) {

    cancelModal.addEventListener(
        "click",
        closeStudentModal
    );

}


if (studentModal) {

    studentModal.addEventListener("click", event => {

        if (event.target === studentModal) {

            closeStudentModal();

        }

    });

}


// =========================
// ADD / UPDATE STUDENT
// =========================

if (studentForm) {

    studentForm.addEventListener("submit", async event => {

        event.preventDefault();

        const isEditing =
            Boolean(editingStudentId);

        if (isEditing && !canManageStudents()) {

            alert(
                "You do not have permission to edit students."
            );

            return;
        }

        if (!isEditing && !canManageStudents()) {

            alert(
                "You do not have permission to add students."
            );

            return;
        }

        const id = studentId.value.trim();

        const name = studentName.value.trim();

        const gender = studentGender.value;

        const email = studentEmail.value.trim();

        const department = studentDepartment.value;

        const year = Number(studentYear.value);

        if (
            !id ||
            !name ||
            !gender ||
            !email ||
            !department ||
            !year
        ) {

            alert("Please fill in all fields.");

            return;
        }

        const studentData = {

            id,
            name,
            gender,
            email,
            department,
            year

        };

        try {

            if (isEditing) {

                const studentBeingEdited =
                    students.find(
                        student =>
                            student.id === editingStudentId
                    );

                if (
                    !studentBeingEdited ||
                    !studentBeingEdited._id
                ) {

                    throw new Error(
                        "The student record could not be found in the database."
                    );
                }

                await apiRequest(

                    `${API_URL}/${encodeURIComponent(studentBeingEdited._id)}`,

                    {
                        method: "PUT",
                        body: JSON.stringify(studentData)
                    }

                );

            } else {

                await apiRequest(

                    API_URL,

                    {
                        method: "POST",
                        body: JSON.stringify(studentData)
                    }

                );

            }

            await loadStudents();

            // Record student activity
            if (isEditing) {

                addRecentActivity(
                    "Student updated",
                    `${name} (${id}) was updated successfully.`,
                    "✏️"
                );

            } else {

                addRecentActivity(
                    "New student registered",
                    `${name} (${id}) was added to the system.`,
                    "🎓"
                );

            }

            closeStudentModal();

            alert(
                isEditing
                    ? "Student updated successfully."
                    : "Student added successfully."
            );

        } catch (error) {

            console.error(
                "Could not save student:",
                error
            );

            alert(
                error.message ||
                "Could not save the student. Please try again."
            );

        }

    });

}


// =========================
// SEARCH AND FILTER ELEMENTS
// =========================

const searchInput =
    document.getElementById("searchInput");

const departmentFilter =
    document.getElementById("departmentFilter");

const genderFilter =
    document.getElementById("genderFilter");

const yearFilter =
    document.getElementById("yearFilter");


const studentsSearchInput =
    document.getElementById("studentsSearchInput");

const studentsDepartmentFilter =
    document.getElementById("studentsDepartmentFilter");

const studentsGenderFilter =
    document.getElementById("studentsGenderFilter");

const studentsYearFilter =
    document.getElementById("studentsYearFilter");


// =========================
// FILTER STUDENTS
// =========================

function filterStudents(
    search,
    department,
    gender,
    year
) {

    const searchValue =
        String(search || "").toLowerCase().trim();

    return students.filter(student => {

        const studentIdValue =
            String(student.id || "").toLowerCase();

        const studentNameValue =
            String(student.name || "").toLowerCase();

        const studentEmailValue =
            String(student.email || "").toLowerCase();

        const matchesSearch =

            studentIdValue.includes(searchValue) ||

            studentNameValue.includes(searchValue) ||

            studentEmailValue.includes(searchValue);

        const matchesDepartment =
            !department ||
            student.department === department;

        const matchesGender =
            !gender ||
            student.gender === gender;

        const matchesYear =
            !year ||
            String(student.year) === String(year);

        return (
            matchesSearch &&
            matchesDepartment &&
            matchesGender &&
            matchesYear
        );

    });

}


// =========================
// ESCAPE HTML
// =========================

function escapeHTML(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// =========================
// CREATE STUDENT TABLE ROW
// =========================

function createStudentRow(student) {

    const canEdit =
        canManageStudents();

    const canDelete =
        canDeleteStudents();

    let actionButtons = "";

    if (canEdit) {

        actionButtons += `
            <button
                type="button"
                class="edit-btn"
                data-action="edit"
                data-id="${escapeHTML(student.id)}"
            >
                Edit
            </button>
        `;

    }

    if (canDelete) {

        actionButtons += `
            <button
                type="button"
                class="delete-btn"
                data-action="delete"
                data-id="${escapeHTML(student.id)}"
            >
                Delete
            </button>
        `;

    }

    return `

        <tr>

            <td>
                ${escapeHTML(student.id)}
            </td>

            <td>
                ${escapeHTML(student.name)}
            </td>

            <td>
                ${escapeHTML(student.gender)}
            </td>

            <td>
                ${escapeHTML(student.email)}
            </td>

            <td>
                ${escapeHTML(student.department)}
            </td>

            <td>
                Year ${escapeHTML(student.year)}
            </td>

            <td>
                ${actionButtons || "View only"}
            </td>

        </tr>

    `;

}


// =========================
// RENDER DASHBOARD TABLE
// =========================

function renderDashboardTable() {

    const tableBody =
        document.getElementById("studentTableBody");

    if (!tableBody) return;

    const filtered = filterStudents(

        searchInput ? searchInput.value : "",

        departmentFilter ? departmentFilter.value : "",

        genderFilter ? genderFilter.value : "",

        yearFilter ? yearFilter.value : ""

    );

    if (filtered.length === 0) {

        tableBody.innerHTML = `

            <tr class="empty-row">

                <td colspan="7">
                    No students found.
                </td>

            </tr>

        `;

        return;
    }

    tableBody.innerHTML =
        filtered.map(createStudentRow).join("");

}


// =========================
// RENDER STUDENTS PAGE TABLE
// =========================

function renderStudentsPageTable() {

    const tableBody =
        document.getElementById("studentsPageTableBody");

    if (!tableBody) return;

    const filtered = filterStudents(

        studentsSearchInput
            ? studentsSearchInput.value
            : "",

        studentsDepartmentFilter
            ? studentsDepartmentFilter.value
            : "",

        studentsGenderFilter
            ? studentsGenderFilter.value
            : "",

        studentsYearFilter
            ? studentsYearFilter.value
            : ""

    );

    if (filtered.length === 0) {

        tableBody.innerHTML = `

            <tr class="empty-row">

                <td colspan="7">
                    No students found.
                </td>

            </tr>

        `;

        return;
    }

    tableBody.innerHTML =
        filtered.map(createStudentRow).join("");

}


// =========================
// RENDER ALL STUDENTS
// =========================

function renderStudents() {

    renderDashboardTable();

    renderStudentsPageTable();

}


// =========================
// RENDER RECENT STUDENTS
// =========================

function renderRecentStudents() {

    const tableBody =
        document.getElementById("recentStudentsTableBody");

    if (!tableBody) return;

    if (students.length === 0) {

        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    No recent students found.
                </td>
            </tr>
        `;

        return;
    }

    const recentStudents = [...students];

    const hasTimestamps = recentStudents.some(student =>
        student.createdAt &&
        !Number.isNaN(Date.parse(student.createdAt))
    );

    if (hasTimestamps) {

        recentStudents.sort((a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        );

    } else {

        recentStudents.reverse();

    }

    tableBody.innerHTML = recentStudents
        .slice(0, 5)
        .map(createStudentRow)
        .join("");

}


// =========================
// FILTER EVENTS
// =========================

[
    searchInput,
    departmentFilter,
    genderFilter,
    yearFilter

].forEach(element => {

    if (element) {

        element.addEventListener(
            "input",
            renderDashboardTable
        );

        element.addEventListener(
            "change",
            renderDashboardTable
        );

    }

});


[
    studentsSearchInput,
    studentsDepartmentFilter,
    studentsGenderFilter,
    studentsYearFilter

].forEach(element => {

    if (element) {

        element.addEventListener(
            "input",
            renderStudentsPageTable
        );

        element.addEventListener(
            "change",
            renderStudentsPageTable
        );

    }

});


// =========================
// EDIT / DELETE BUTTON EVENTS
// =========================

document.addEventListener("click", event => {

    const target = event.target;

    if (!(target instanceof Element)) return;

    const button =
        target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;

    const id = button.dataset.id;

    if (action === "edit") {

        editStudent(id);

    }

    if (action === "delete") {

        deleteStudent(id);

    }

});


// =========================
// EDIT STUDENT
// =========================

function editStudent(id) {

    if (!canManageStudents()) {

        alert(
            "You do not have permission to edit students."
        );

        return;
    }

    const student =
        students.find(item => item.id === id);

    if (!student) return;

    if (
        !studentModal ||
        !studentForm ||
        !modalTitle ||
        !studentId ||
        !studentName ||
        !studentGender ||
        !studentEmail ||
        !studentDepartment ||
        !studentYear
    ) return;

    editingStudentId = id;

    modalTitle.textContent = "Edit Student";

    studentId.value = student.id;

    studentName.value = student.name;

    studentGender.value = student.gender;

    studentEmail.value = student.email;

    studentDepartment.value = student.department;

    studentYear.value = student.year;

    studentId.disabled = true;

    studentModal.classList.add("show");

    studentName.focus();

}


// =========================
// DELETE STUDENT
// =========================

async function deleteStudent(id) {

    if (!canDeleteStudents()) {

        alert(
            "Only administrators can delete students."
        );

        return;
    }

    const student =
        students.find(item => item.id === id);

    if (!student) return;

    const confirmed = confirm(

        `Are you sure you want to delete ${student.name}?`

    );

    if (!confirmed) return;

    if (!student._id) {

        alert(
            "This student does not have a database ID. Refresh the page and try again."
        );

        return;
    }

    try {

        await apiRequest(

            `${API_URL}/${encodeURIComponent(student._id)}`,

            {
                method: "DELETE"
            }

        );

        await loadStudents();

        addRecentActivity(
            "Student deleted",
            `${student.name} (${student.id}) was deleted from the system.`,
            "🗑️"
        );

        alert("Student deleted successfully.");

    } catch (error) {

        console.error(
            "Could not delete student:",
            error
        );

        alert(
            error.message ||
            "Could not delete the student. Please try again."
        );

    }

}


// =========================
// STATISTICS
// =========================

function updateStatistics() {

    const total = students.length;

    const male =
        students.filter(
            student => student.gender === "Male"
        ).length;

    const female =
        students.filter(
            student => student.gender === "Female"
        ).length;

    const departments =
        new Set(
            students.map(student => student.department)
        ).size;

    const totalElement =
        document.getElementById("totalStudents");

    const maleElement =
        document.getElementById("maleStudents");

    const femaleElement =
        document.getElementById("femaleStudents");

    const departmentElement =
        document.getElementById("totalDepartments");

    if (totalElement) {
        totalElement.textContent = total;
    }

    if (maleElement) {
        maleElement.textContent = male;
    }

    if (femaleElement) {
        femaleElement.textContent = female;
    }

    if (departmentElement) {
        departmentElement.textContent = departments;
    }

}


// =========================
// DASHBOARD ANALYTICS
// =========================

function updateDashboardAnalytics() {

    const total = students.length;

    const maleCount =
        students.filter(
            student => student.gender === "Male"
        ).length;

    const femaleCount =
        students.filter(
            student => student.gender === "Female"
        ).length;

    const malePercentage =
        total > 0
            ? Math.round((maleCount / total) * 100)
            : 0;

    const femalePercentage =
        total > 0
            ? Math.round((femaleCount / total) * 100)
            : 0;

    const malePercentageElement =
        document.getElementById("dashboardMalePercentage");

    const femalePercentageElement =
        document.getElementById("dashboardFemalePercentage");

    const maleBar =
        document.getElementById("dashboardMaleBar");

    const femaleBar =
        document.getElementById("dashboardFemaleBar");

    if (malePercentageElement) {

        malePercentageElement.textContent =
            `${malePercentage}%`;

    }

    if (femalePercentageElement) {

        femalePercentageElement.textContent =
            `${femalePercentage}%`;

    }

    if (maleBar) {

        maleBar.style.width =
            `${malePercentage}%`;

    }

    if (femaleBar) {

        femaleBar.style.width =
            `${femalePercentage}%`;

    }

    // Department analytics
    const departmentContainer =
        document.getElementById(
            "dashboardDepartmentAnalytics"
        );

    if (!departmentContainer) return;

    if (students.length === 0) {

        departmentContainer.innerHTML = `

            <div class="analytics-empty">
                No student data available.
            </div>

        `;

        return;
    }

    const departmentCounts = {};

    students.forEach(student => {

        const department =
            student.department || "Unknown";

        departmentCounts[department] =
            (departmentCounts[department] || 0) + 1;

    });

    const sortedDepartments =
        Object.entries(departmentCounts).sort(
            (a, b) => b[1] - a[1]
        );

    const maximum =
        sortedDepartments.length > 0
            ? sortedDepartments[0][1]
            : 1;

    departmentContainer.innerHTML =

        sortedDepartments.map(([department, count]) => {

            const percentage =
                Math.round((count / total) * 100);

            const barWidth =
                Math.round((count / maximum) * 100);

            return `

                <div class="department-analytics-item">

                    <div class="department-analytics-label">

                        <span>
                            ${escapeHTML(department)}
                        </span>

                        <strong>
                            ${count} (${percentage}%)
                        </strong>

                    </div>

                    <div class="department-analytics-bar">

                        <div
                            class="department-analytics-fill"
                            style="width: ${barWidth}%"
                        ></div>

                    </div>

                </div>

            `;

        }).join("");

}


// =========================
// REPORTS
// =========================

function updateReports() {

    const total = students.length;

    const male =
        students.filter(
            student => student.gender === "Male"
        ).length;

    const female =
        students.filter(
            student => student.gender === "Female"
        ).length;

    const departments =
        new Set(
            students.map(student => student.department)
        ).size;

    const malePercentage =
        total > 0
            ? Math.round((male / total) * 100)
            : 0;

    const femalePercentage =
        total > 0
            ? Math.round((female / total) * 100)
            : 0;

    setText("reportTotalStudents", total);

    setText("reportMaleStudents", male);

    setText("reportFemaleStudents", female);

    setText("reportDepartments", departments);

    setText("summaryTotalStudents", total);

    setText("malePercentage", `${malePercentage}%`);

    setText("femalePercentage", `${femalePercentage}%`);

    const now = new Date();

    setText(
        "reportLastUpdated",
        now.toLocaleTimeString()
    );

    renderDepartmentReport();

    renderGenderReport();

    renderYearReport();

}


// =========================
// DEPARTMENT REPORT
// =========================

function renderDepartmentReport() {

    const container =
        document.getElementById("departmentReport");

    if (!container) return;

    if (students.length === 0) {

        container.innerHTML = `

            <div class="report-empty">
                No student data available.
            </div>

        `;

        return;
    }

    const counts = {};

    students.forEach(student => {

        const department =
            student.department || "Unknown";

        counts[department] =
            (counts[department] || 0) + 1;

    });

    const total = students.length;

    container.innerHTML =

        Object.entries(counts)

            .sort((a, b) => b[1] - a[1])

            .map(([department, count]) => {

                const percentage =
                    Math.round((count / total) * 100);

                return `

                    <div class="report-row">

                        <div class="report-row-top">

                            <span class="report-row-name">
                                ${escapeHTML(department)}
                            </span>

                            <span class="report-row-value">
                                ${count}
                            </span>

                        </div>

                        <div class="report-progress">

                            <div
                                class="report-progress-bar"
                                style="width: ${percentage}%"
                            ></div>

                        </div>

                        <span class="report-percentage">
                            ${percentage}%
                        </span>

                    </div>

                `;

            }).join("");

}


// =========================
// GENDER REPORT
// =========================

function renderGenderReport() {

    const container =
        document.getElementById("genderReport");

    if (!container) return;

    if (students.length === 0) {

        container.innerHTML = `

            <div class="report-empty">
                No student data available.
            </div>

        `;

        return;
    }

    const male =
        students.filter(
            student => student.gender === "Male"
        ).length;

    const female =
        students.filter(
            student => student.gender === "Female"
        ).length;

    const total = students.length;

    const genderData = [

        {
            name: "Male",
            count: male
        },

        {
            name: "Female",
            count: female
        }

    ];

    container.innerHTML =

        genderData.map(item => {

            const percentage =
                Math.round((item.count / total) * 100);

            return `

                <div class="report-row">

                    <div class="report-row-top">

                        <span class="report-row-name">
                            ${escapeHTML(item.name)}
                        </span>

                        <span class="report-row-value">
                            ${item.count}
                        </span>

                    </div>

                    <div class="report-progress">

                        <div
                            class="report-progress-bar"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                    <span class="report-percentage">
                        ${percentage}%
                    </span>

                </div>

            `;

        }).join("");

}


// =========================
// YEAR REPORT
// =========================

function renderYearReport() {

    const container =
        document.getElementById("yearReport");

    if (!container) return;

    if (students.length === 0) {

        container.innerHTML = `

            <div class="report-empty">
                No student data available.
            </div>

        `;

        return;
    }

    const total = students.length;

    const yearCounts = {

        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0

    };

    students.forEach(student => {

        const year = String(student.year);

        if (
            Object.prototype.hasOwnProperty.call(
                yearCounts,
                year
            )
        ) {

            yearCounts[year]++;

        }

    });

    container.innerHTML =

        Object.entries(yearCounts)

            .map(([year, count]) => {

                const percentage =
                    total > 0
                        ? Math.round((count / total) * 100)
                        : 0;

                return `

                    <div class="report-row">

                        <div class="report-row-top">

                            <span class="report-row-name">
                                Year ${year}
                            </span>

                            <span class="report-row-value">
                                ${count}
                            </span>

                        </div>

                        <div class="report-progress">

                            <div
                                class="report-progress-bar"
                                style="width: ${percentage}%"
                            ></div>

                        </div>

                        <span class="report-percentage">
                            ${percentage}%
                        </span>

                    </div>

                `;

            }).join("");

}


// =========================
// SET TEXT HELPER
// =========================

function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent = value;

    }

}


// =========================
// STUDENT CHART
// =========================

function updateStudentChart() {

    const total = students.length;

    // Total students
    const chartTotal =
        document.getElementById("chartTotalStudents");

    if (chartTotal) {

        chartTotal.textContent = total;

    }

    // Count students by year
    const yearCounts = {

        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0

    };

    students.forEach(student => {

        const year = String(student.year);

        if (
            Object.prototype.hasOwnProperty.call(
                yearCounts,
                year
            )
        ) {

            yearCounts[year]++;

        }

    });

    // Find maximum
    const maximum =
        Math.max(
            ...Object.values(yearCounts),
            1
        );

    // Update bars
    for (let year = 1; year <= 4; year++) {

        const bar =
            document.getElementById(
                `year${year}Bar`
            );

        const value =
            document.getElementById(
                `year${year}Value`
            );

        const count =
            yearCounts[String(year)];

        const percentage =
            (count / maximum) * 100;

        if (bar) {

            bar.style.height =
                `${percentage}%`;

        }

        if (value) {

            value.textContent = count;

        }

    }

}


// =========================
// CHANGE PASSWORD
// =========================

const changePasswordForm =
    document.getElementById("changePasswordForm");

if (changePasswordForm) {

    changePasswordForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const currentPassword =
            document.getElementById("currentPassword").value;

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const passwordMessage =
            document.getElementById("passwordMessage");

        if (!passwordMessage) return;

        if (newPassword.length < 8) {

            passwordMessage.textContent =
                "New password must contain at least 8 characters.";

            return;
        }

        if (newPassword !== confirmPassword) {

            passwordMessage.textContent =
                "New passwords do not match.";

            return;
        }

        passwordMessage.textContent = "Changing password...";

        try {

            const result = await apiRequest(
                `${AUTH_URL}/change-password`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmPassword
                    })
                }
            );

            if (!result || !result.success) {

                throw new Error(
                    result?.message || "Password change failed."
                );
            }

            alert(
                "Password changed successfully! Please log in again using your new password."
            );

            changePasswordForm.reset();

            logout();

        } catch (error) {

            passwordMessage.textContent =
                error.message || "Unable to change password.";

        }

    });

}


// =========================
// USER MANAGEMENT
// =========================

const userForm =
    document.getElementById("userForm");

const newUsername =
    document.getElementById("newUsername");

const newUserPassword =
    document.getElementById("newUserPassword");

const newUserRole =
    document.getElementById("newUserRole");

const userMessage =
    document.getElementById("userMessage");


if (userForm) {

    userForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        // Only administrators can create users
        if (!isAdmin()) {

            if (userMessage) {

                userMessage.textContent =
                    "Only administrators can create user accounts.";

                userMessage.style.color = "red";

            }

            return;
        }

        const username = newUsername?.value.trim();

        const password = newUserPassword?.value;

        const role = newUserRole?.value;

        if (!userMessage) return;

        userMessage.textContent = "";

        userMessage.style.color = "";

        if (!username || !password || !role) {

            userMessage.textContent =
                "Please fill in all fields.";

            userMessage.style.color = "red";

            return;
        }

        try {

            const response = await apiRequest(
                USERS_URL,
                {
                    method: "POST",
                    body: JSON.stringify({
                        username,
                        password,
                        role
                    })
                }
            );

            userMessage.textContent =
                response.message || "User created successfully.";

            userMessage.style.color = "green";

            userForm.reset();

            addRecentActivity(
                "New user created",
                `Account ${username} was created with the ${role} role.`,
                "👤"
            );

        } catch (error) {

            userMessage.textContent =
                error.message || "Failed to create user.";

            userMessage.style.color = "red";

        }

    });

}


// =========================
// INITIAL APPLICATION LOAD
// =========================

renderRecentActivity();


// A valid login must have both token and role.
if (authToken && currentUserRole) {

    hideLoginPage();

    updateRolePermissions();

    loadStudents();

} else {

    authToken = "";

    currentUserRole = "";

    sessionStorage.removeItem("smsToken");

    sessionStorage.removeItem("smsRole");

    updateRolePermissions();

    showLoginPage();

    students = [];

    refreshStudentViews();

}


// =========================
// END OF STUDENT MANAGEMENT SYSTEM
// =========================
