(async () => {
  // Get the URL of cosmetic_rules.json inside the extension
  const rulesUrl = chrome.runtime.getURL("cosmetic_rules.json");

  // Fetch the cosmetic rules
  const response = await fetch(rulesUrl);
  const selectors = await response.json();

  // Build a single CSS rule that hides all matching elements
  const css = selectors
    .map((selector) => `${selector} { display: none !important; }`)
    .join("\n");

  // Inject a <style> tag into the page
  const style = document.createElement("style");
  style.textContent = css;
  document.documentElement.appendChild(style);

  console.log(`[MiniGuard] Injected ${selectors.length} cosmetic rules`);
})();
