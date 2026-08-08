const STORAGE_KEY = "examhub_theme";

let currentThemeMode = "auto";
let mediaQuery = null;
let initialized = false;

function getSystemTheme() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function bindThemeButtons() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-theme-val]").forEach((btn) => {
    btn.onclick = (e) => {
      if (e) e.preventDefault();
      const val = btn.getAttribute("data-theme-val");
      if (val) setTheme(val);
    };
  });
}

function applyTheme(mode) {
  const effectiveTheme = mode === "auto" ? getSystemTheme() : mode;
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
    document.documentElement.setAttribute("data-theme-setting", mode);
  }

  if (typeof document !== "undefined") {
    const buttons = document.querySelectorAll("[data-theme-val]");
    buttons.forEach((btn) => {
      if (btn.getAttribute("data-theme-val") === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const toggleSingleBtn = document.getElementById("themeToggleBtn");
    if (toggleSingleBtn) {
      const icon = toggleSingleBtn.querySelector("i, svg");
      if (icon) {
        if (effectiveTheme === "dark") {
          icon.setAttribute("data-lucide", "moon");
        } else {
          icon.setAttribute("data-lucide", "sun");
        }
        try {
          if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
          }
        } catch (e) {
          void e;
        }
      }
    }
  }
}

export function getTheme() {
  return currentThemeMode;
}

export function setTheme(theme) {
  if (theme !== "light" && theme !== "dark" && theme !== "auto") {
    theme = "auto";
  }
  currentThemeMode = theme;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch (err) {
    void err;
  }
  applyTheme(currentThemeMode);
}

export function toggleTheme() {
  const modes = ["light", "dark", "auto"];
  const currentIndex = modes.indexOf(currentThemeMode);
  const nextTheme = modes[(currentIndex + 1) % modes.length];
  setTheme(nextTheme);
  return nextTheme;
}

export function initTheme() {
  let saved = null;
  try {
    if (typeof localStorage !== "undefined") {
      saved = localStorage.getItem(STORAGE_KEY);
    }
  } catch (err) {
    void err;
  }

  if (saved && (saved === "light" || saved === "dark" || saved === "auto")) {
    currentThemeMode = saved;
  } else {
    currentThemeMode = "auto";
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      if (currentThemeMode === "auto") {
        applyTheme("auto");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMediaChange);
    }
  }

  applyTheme(currentThemeMode);
  bindThemeButtons();

  if (!initialized && typeof document !== "undefined") {
    initialized = true;
    document.addEventListener("click", (e) => {
      const themeBtn = e.target && e.target.closest ? e.target.closest("[data-theme-val]") : null;
      if (themeBtn) {
        const val = themeBtn.getAttribute("data-theme-val");
        if (val) setTheme(val);
        return;
      }
      const singleToggle = e.target && e.target.closest ? e.target.closest("#themeToggleBtn") : null;
      if (singleToggle) {
        toggleTheme();
      }
    });
  }

  if (typeof window !== "undefined") {
    window.setTheme = setTheme;
    window.getTheme = getTheme;
    window.toggleTheme = toggleTheme;
  }
}
