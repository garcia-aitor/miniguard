// Ask background for current stats
chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
  // Update blocked count
  document.getElementById("count").textContent = response.blockedCount;

  // Update blocked domains list
  const domainsEl = document.getElementById("domains");
  if (response.blockedDomains.length === 0) {
    domainsEl.textContent = "No domains blocked yet";
    return;
  }

  for (const domain of response.blockedDomains) {
    const div = document.createElement("div");
    div.className = "domain";
    div.textContent = domain;
    domainsEl.appendChild(div);
  }
});
