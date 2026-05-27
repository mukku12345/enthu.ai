import React from "react";
import { X } from "lucide-react";

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
        <span>Find calls by issue, emotion, resolution, score, or agent behavior.</span>
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
            <X size={16} />
          </button>
        )}
        <button onClick={submitSearch}>Search</button>
      </div>
    </section>
  );
}
