document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const toggle = document.querySelector("[data-nav-toggle]");
  const close = document.querySelector("[data-nav-close]");
  const filters = Array.from(document.querySelectorAll("[data-nav-filter]"));
  const navLinks = Array.from(document.querySelectorAll(".docs-sidebar nav a"));
  const groups = Array.from(document.querySelectorAll("[data-nav-group]"));

  const setNavigation = (open) => {
    body.classList.toggle("nav-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
  };

  toggle?.addEventListener("click", () => setNavigation(!body.classList.contains("nav-open")));
  close?.addEventListener("click", () => setNavigation(false));
  navLinks.forEach((link) => link.addEventListener("click", () => setNavigation(false)));

  const filterNavigation = (value, source) => {
    const query = value.trim().toLowerCase();
    filters.forEach((input) => {
      if (input !== source) input.value = value;
    });

    navLinks.forEach((link) => {
      const match = !query || link.textContent.toLowerCase().includes(query);
      const item = link.closest("li");
      if (item) item.hidden = !match;
      if (link.classList.contains("overview-link")) link.hidden = !match;
    });

    groups.forEach((group) => {
      const title = group.querySelector(".nav-group-title");
      const titleMatch = title?.textContent.toLowerCase().includes(query);
      const visibleChildren = Array.from(group.querySelectorAll("li")).some((item) => !item.hidden);
      group.hidden = Boolean(query) && !titleMatch && !visibleChildren;
      if (title) title.hidden = false;
    });
  };

  filters.forEach((input) =>
    input.addEventListener("input", (event) => filterNavigation(event.target.value, event.target)),
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      const input = window.innerWidth < 820 ? filters[1] : filters[0];
      input?.focus();
    }
    if (event.key === "Escape") {
      setNavigation(false);
      filters.forEach((input) => {
        input.value = "";
      });
      filterNavigation("", null);
    }
  });

  document.querySelectorAll(".prose pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = "Copied";
      } catch {
        window.getSelection()?.selectAllChildren(code);
        button.textContent = "Select";
      }
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1600);
    });
    pre.append(button);
  });

  // A table that overflows scrolls inside its wrapper, so the wrapper must be reachable by keyboard.
  const tableLabel = (wrapper) => {
    for (let node = wrapper.previousElementSibling; node; node = node.previousElementSibling) {
      if (/^H[2-4]$/.test(node.tagName)) return `Table: ${node.textContent.trim()}`;
    }
    return "Table";
  };
  const markScrollableTables = () => {
    document.querySelectorAll(".table-scroll").forEach((wrapper) => {
      if (wrapper.scrollWidth > wrapper.clientWidth) {
        wrapper.tabIndex = 0;
        wrapper.setAttribute("role", "region");
        wrapper.setAttribute("aria-label", tableLabel(wrapper));
      } else {
        wrapper.removeAttribute("tabindex");
        wrapper.removeAttribute("role");
        wrapper.removeAttribute("aria-label");
      }
    });
  };
  markScrollableTables();
  document.fonts?.ready.then(markScrollableTables);
  window.addEventListener("resize", markScrollableTables);
});
