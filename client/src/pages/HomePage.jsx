import React from "react";
import { Search } from "lucide-react";
import CallDetail from "../components/call-detail/CallDetail.jsx";
import CallList from "../components/calls/CallList.jsx";
import ArchitectureNotes from "../components/dashboard/ArchitectureNotes.jsx";
import EventLog from "../components/dashboard/EventLog.jsx";
import Metrics from "../components/dashboard/Metrics.jsx";
import SearchBox from "../components/dashboard/SearchBox.jsx";
import UploadPanel from "../components/upload/UploadPanel.jsx";
import { useCalls } from "../hooks/useCalls.js";

export default function HomePage() {
  const {
    calls,
    query,
    selectedCall,
    events,
    setQuery,
    selectCall,
    searchCalls,
    handleUploadedCall,
    retryFailedCall,
    dismissFailedCall
  } = useCalls();

  return (
    <main>
      <UploadPanel onUploaded={handleUploadedCall} existingCalls={calls} />

      <Metrics calls={calls} />

      <section className="workspace">
        <div className="left-pane">
          <SearchBox
            icon={Search}
            query={query}
            onQueryChange={setQuery}
            onSearch={searchCalls}
          />
          <CallList calls={calls} selectedId={selectedCall?.id} onSelect={selectCall} />
          <EventLog events={events} />
          <ArchitectureNotes />
        </div>
        <CallDetail call={selectedCall} onRetry={retryFailedCall} onDismiss={dismissFailedCall} />
      </section>
    </main>
  );
}
