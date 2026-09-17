// ========================================
// PING THEME
// ========================================

const themeToggle =
    document.getElementById("themeToggle");


function getTheme() {

    return document.documentElement.dataset.theme === "dark"
        ? "dark"
        : "light";

}


function updateThemeButton() {

    if (!themeToggle) {
        return;
    }

    const isDark =
        getTheme() === "dark";

    const icon =
        themeToggle.querySelector(".theme-icon");

    const label =
        themeToggle.querySelector(".theme-label");

    if (icon) {
        icon.textContent =
            isDark ? "☀️" : "🌙";
    }

    if (label) {
        label.textContent =
            isDark ? "Light" : "Dark";
    }

    themeToggle.setAttribute(
        "aria-label",
        isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
    );

}


function setTheme(theme) {

    const nextTheme =
        theme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme =
        nextTheme;

    localStorage.setItem(
        "pingTheme",
        nextTheme
    );

    updateThemeButton();

}


if (themeToggle) {

    updateThemeButton();

    themeToggle.addEventListener(
        "click",
        () => {

            setTheme(
                getTheme() === "dark"
                    ? "light"
                    : "dark"
            );

        }
    );

}
