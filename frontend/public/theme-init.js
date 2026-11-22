// Apply the saved theme before first paint (mirrors ThemeContext).
(function () {
  var pref = "system";
  try {
    var stored = localStorage.getItem("cc-theme");
    if (stored === "light" || stored === "dark" || stored === "system") pref = stored;
  } catch {
    /* storage unavailable: use OS preference */
  }
  var dark =
    pref === "dark" ||
    (pref === "system" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.add(dark ? "dark" : "light");
})();
