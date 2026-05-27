import React, { useState } from "react";
import { Search } from "lucide-react";
import CallDetail from "../components/call-detail/CallDetail.jsx";
import CallList from "../components/calls/CallList.jsx";
import ArchitectureNotes from "../components/dashboard/ArchitectureNotes.jsx";
import EventLog from "../components/dashboard/EventLog.jsx";
import Metrics from "../components/dashboard/Metrics.jsx";
import SearchBox from "../components/dashboard/SearchBox.jsx";
import ConfirmModal from "../components/shared/ConfirmModal.jsx";
import UploadPanel from "../components/upload/UploadPanel.jsx";
import { useCalls } from "../hooks/useCalls.js";

export default function HomePage() {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
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
    dismissFailedCall,
    deleteUploadedCall
  } = useCalls();

  const requestDelete = (call) => {
    setDeleteError("");
    setDeleteTarget(call);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteUploadedCall(deleteTarget);
      setDeleteTarget(null);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Delete failed. Please restart the backend server and try again.";
      setDeleteError(message);
    } finally {
      setDeleteBusy(false);
    }
  };

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
          <CallList
            calls={calls}
            selectedId={selectedCall?.id}
            onSelect={selectCall}
            onRequestDelete={requestDelete}
          />
          <EventLog events={events} />
          <ArchitectureNotes />
        </div>
        <CallDetail
          call={selectedCall}
          onRetry={retryFailedCall}
          onDismiss={dismissFailedCall}
          onRequestDelete={requestDelete}
        />
      </section>
      <ConfirmModal
        busy={deleteBusy}
        call={deleteTarget}
        error={deleteError}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
