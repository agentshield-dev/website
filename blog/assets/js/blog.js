const searchForm = document.querySelector("[data-search-form]");

if (searchForm instanceof HTMLFormElement) {
  const searchInput = searchForm.querySelector("[data-search-input]");
  const searchStatus = document.querySelector("[data-search-status]");
  const searchResults = document.querySelector("[data-search-results]");
  const indexUrl = searchForm.dataset.indexUrl;

  const renderResults = (posts, query) => {
    if (!(searchResults instanceof HTMLElement) || !(searchStatus instanceof HTMLElement)) return;

    searchResults.replaceChildren();
    if (!query) {
      searchStatus.textContent = "Enter a term to search published posts.";
      return;
    }

    const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = posts.filter((post) => {
      const text = [post.title, post.description, post.content, ...(post.categories ?? []), ...(post.tags ?? [])]
        .join(" ")
        .toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });

    searchStatus.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? "result" : "results"} for “${query}”`
      : `No results for “${query}”`;

    for (const post of matches) {
      const article = document.createElement("article");
      article.className = "search-result";
      const date = document.createElement("time");
      date.dateTime = post.date;
      date.textContent = post.dateLabel;
      const title = document.createElement("h2");
      const link = document.createElement("a");
      link.href = post.url;
      link.textContent = post.title;
      title.append(link);
      const description = document.createElement("p");
      description.textContent = post.description;
      article.append(date, title, description);
      searchResults.append(article);
    }
  };

  const runSearch = async () => {
    if (!(searchInput instanceof HTMLInputElement) || !indexUrl) return;
    const query = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    searchInput.value = query;
    if (!query) return;

    if (searchStatus instanceof HTMLElement) searchStatus.textContent = "Searching…";
    try {
      const response = await fetch(indexUrl);
      if (!response.ok) throw new Error(`Search index returned ${response.status}`);
      renderResults(await response.json(), query);
    } catch {
      if (searchStatus instanceof HTMLElement) {
        searchStatus.textContent = "Search is unavailable. Try the post archive instead.";
      }
    }
  };

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!(searchInput instanceof HTMLInputElement)) return;
    const url = new URL(searchForm.action);
    const query = searchInput.value.trim();
    if (query) url.searchParams.set("q", query);
    window.history.pushState({}, "", url);
    runSearch();
  });
  window.addEventListener("popstate", runSearch);
  runSearch();
}

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
document.addEventListener("DOMContentLoaded", () => {
  markScrollableTables();
  document.fonts?.ready.then(markScrollableTables);
});
window.addEventListener("resize", markScrollableTables);
