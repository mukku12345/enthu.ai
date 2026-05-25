import React from "react";

export default function SearchBox({ icon: Icon, query, onQueryChange, onSearch }) {
  const submitSearch = () => onSearch(query);
  const clearSearch = () => {
    onQueryChange("");
    onSearch("");
  };

  return (
    <section className="semantic-panel">
      <div>
        <p className="eyebrow">Natural language QA search</p>
        <h3>Search by meaning</h3>
        <span>Semantic search demo: matching by meaning, not exact keyword.</span>
      </div>
      <div className="search-box">
        <Icon size={18} />
        <input
          value={query}
          placeholder="Search by meaning, e.g. customer wanted money back and agent failed to resolve it"
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitSearch();
          }}
        />
        {query && (
          <button className="icon-action" onClick={clearSearch} type="button" title="Clear search">
            ×
          </button>
        )}
        <button onClick={submitSearch}>Search</button>
      </div>
    </section>
  );
}
