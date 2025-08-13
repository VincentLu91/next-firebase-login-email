import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { setSound } from "../redux/recording/actions";
import { useRouter } from "next/router";
import Link from "next/link";
//import { printTranscription } from "../../../redux/language/actions";
import libraryStyles from "../styles/libraryStyles";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useMemo, useRef } from "react";

const Dashboard = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const [cloudRecordingList, setCloudRecordingList] = React.useState([]);
  const [search, setNewSearch] = React.useState("");
  const [customer, setCustomer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [expandedId, setExpandedId] = useState(null);

  const searchInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const checkAuth = useCallback(
    async (user) => {
      try {
        setLoading(true);
        setError(null);
        if (!user) {
          router.push("/signin");
          return;
        }

        const customerInfo = await supabase
          .from("customers")
          .select("*")
          .eq("email_address", user.email)
          .single();

        setCustomer(customerInfo.data);

        // (Optional) You can keep subscription lookups here if needed
        // const subscriptionResponse = await supabase
        //   .from("subscriptions").select().eq("customer_id", customerInfo.data.id);

        const [micRecordingInfo, callRecordingInfo] = await Promise.all([
          supabase
            .from("mic_recordings")
            .select(
              "id, customer_id, file_name, duration, full_transcript, original_file_name, created_at"
            )
            .eq("customer_id", customerInfo.data.id),
          supabase
            .from("call_recordings")
            .select(
              "id, customer_id, file_name, duration, full_transcript, original_file_name, created_at"
            )
            .eq("customer_id", customerInfo.data.id),
        ]);

        const combined = [
          ...(micRecordingInfo.data || []),
          ...(callRecordingInfo.data || []),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setCloudRecordingList(combined);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading your recordings.");
      } finally {
        setLoading(false);
      }
    },
    [router, supabase]
  );

  // this is to check for the user status and subscriptions before loading all recording objects
  useEffect(() => {
    checkAuth(user);
  }, [checkAuth, user]);

  useEffect(() => {
    console.log("Cloud Recording List is: ", cloudRecordingList);
  }, [cloudRecordingList]);

  useEffect(() => {
    function onKeyDown(e) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // function to delete a recording:
  async function deleteRecording(original_file_name, customer) {
    console.log("deleting recording: ", original_file_name);
    let micDeleteInfo = await supabase
      .from("mic_recordings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .eq("original_file_name", original_file_name);
    let callDeleteInfo = await supabase
      .from("call_recordings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .eq("original_file_name", original_file_name);
    if (micDeleteInfo.count > 0) {
      console.log("mic delete.....");
      await supabase
        .from("mic_recordings")
        .delete()
        .eq("customer_id", customer.id)
        .eq("original_file_name", original_file_name);
    } else if (callDeleteInfo.count > 0) {
      console.log("call delete.....");
      let callChunkDeleteInfo = await supabase
        .from("call_recordings")
        .select("*")
        .eq("original_file_name", original_file_name);
      console.log(
        "callChunkDeleteInfo ID is: ",
        callChunkDeleteInfo.data[0].id
      );
      // delete from chunks table first since it depends on `call_recording` table
      await supabase
        .from("telnyx_transcript_chunks")
        .delete()
        .eq("call_recording_id", callChunkDeleteInfo.data[0].id);

      await supabase
        .from("call_recordings")
        .delete()
        .eq("customer_id", customer.id)
        .eq("original_file_name", original_file_name);
    }
    const storageDeleteResponse = await supabase.storage
      .from("recreate-ai-storage-bucket")
      .remove([original_file_name]);
    console.log("storageDeleteResponse is: ", storageDeleteResponse);
  }

  function requestDelete(item) {
    setPendingDelete({
      original_file_name: item.original_file_name,
      file_name: item.file_name,
    });
    setShowConfirm(true);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || !customer) return;
    const { original_file_name } = pendingDelete;

    await deleteRecording(original_file_name, customer);

    // Optimistically remove from UI without router reload
    setCloudRecordingList((prev) =>
      prev.filter((r) => r.original_file_name !== original_file_name)
    );

    setShowConfirm(false);
    setPendingDelete(null);
  }

  function handleCancelDelete() {
    setShowConfirm(false);
    setPendingDelete(null);
  }

  // will call later
  async function viewContent(item) {
    //dispatch(printTranscription(transcription));
    //console.log("Transcription from Library is: ", transcription);
    dispatch(setSound(item));
    router.push("/audioplayer");
  }

  const handleSearchChange = (e) => {
    setNewSearch(e.target.value);
  };

  const filtered = useMemo(() => {
    if (!search) return cloudRecordingList;
    const q = search.toLowerCase();
    return cloudRecordingList.filter(
      (item) =>
        item.file_name?.toLowerCase().includes(q) ||
        item.full_transcript?.toLowerCase().includes(q)
    );
  }, [cloudRecordingList, search]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Calculate the total number of pages
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const dateString = (timestamp) => {
    const date = new Date(timestamp);

    // Get month name (full name)
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
      date
    );

    // Get day of the month
    const day = date.getDate();

    // Get full year
    const year = date.getFullYear();

    // Construct the formatted date string
    const formattedDate = `${month} ${day} ${year}`;
    return formattedDate;
  };

  // Robust duration formatter for mixed DB values
  function secondsToClock(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = m.toString().padStart(h > 0 ? 2 : 1, "0");
    const ss = sec.toString().padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function formatDuration(d) {
    if (d == null) return "—";

    // number or numeric string ("92.3", "120", "01")
    if (typeof d === "number" && isFinite(d)) return secondsToClock(d);
    if (typeof d === "string") {
      const s = d.trim();
      if (!s) return "—";

      // ISO 8601 "PT1H2M3S"
      const iso = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
      if (iso) {
        const h = parseFloat(iso[1] || 0);
        const m = parseFloat(iso[2] || 0);
        const sec = parseFloat(iso[3] || 0);
        return secondsToClock(h * 3600 + m * 60 + sec);
      }

      // H:MM:SS or MM:SS
      const clock = s.match(/^(\d{1,2}):([0-5]?\d)(?::([0-5]?\d))?$/);
      if (clock) {
        let h = 0,
          m = parseInt(clock[1], 10),
          sec = parseInt(clock[2], 10);
        if (clock[3] != null) {
          h = m;
          m = sec;
          sec = parseInt(clock[3], 10);
        }
        return secondsToClock(h * 3600 + m * 60 + sec);
      }

      // numeric with commas or decimals
      const num = parseFloat(s.replace(/,/g, ""));
      if (isFinite(num)) return secondsToClock(num);
    }

    return "—";
  }

  const getRowId = (item) =>
    item.id ||
    item.original_file_name ||
    `${item.created_at}-${item.file_name}`;

  function toggleExpand(item) {
    const id = getRowId(item);
    setExpandedId((cur) => (cur === id ? null : id));
  }

  function handleRowKeyDown(e, item) {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      requestDelete(item);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h2 className="title">Recordings</h2>
        <div className="searchWrap">
          <input
            ref={searchInputRef}
            className="search"
            type="text"
            value={search}
            placeholder="Search filename or transcript (⌘/Ctrl+K)"
            onChange={handleSearchChange}
            aria-label="Search recordings"
          />
        </div>
      </header>

      {loading ? (
        <div className="skeleton">
          <div className="row" />
          <div className="row" />
          <div className="row" />
        </div>
      ) : error ? (
        <div role="alert" className="alert">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>No recordings found.</p>
          <p className="sub">Try another search, or start a new recording:</p>
          <div className="ctaRow">
            <Link href="/internalrecording" className="btn">
              Recording
            </Link>
            <Link href="/phonerecording2" className="btn secondary">
              Phone Recording
            </Link>
          </div>
        </div>
      ) : (
        <>
          <table className="table" role="grid">
            <colgroup>
              <col className="col-file" />
              <col className="col-date" />
              <col className="col-duration" />
              <col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>File</th>
                <th>Date</th>
                <th>Duration</th>
                <th className="actionsHeader">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => {
                const id = getRowId(item);
                const isOpen = expandedId === id;
                return (
                  <React.Fragment key={id}>
                    <tr
                      tabIndex={0}
                      onKeyDown={(e) => handleRowKeyDown(e, item)}
                      aria-expanded={isOpen}
                    >
                      <td className="file">
                        <div className="fileCell">
                          <button
                            className="rowToggle"
                            aria-label={
                              isOpen
                                ? "Collapse transcript"
                                : "Expand transcript"
                            }
                            aria-pressed={isOpen}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(item);
                            }}
                          >
                            <span
                              className={`chev ${isOpen ? "open" : ""}`}
                              aria-hidden="true"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M7 5l6 5-6 5V5z" />
                              </svg>
                            </span>
                          </button>

                          {/* This is the only new bit you need */}
                          <span className="fileName" title={item.file_name}>
                            {item.file_name}
                          </span>
                        </div>
                      </td>

                      <td>{dateString(item.created_at)}</td>
                      <td>{formatDuration(item.duration)}</td>
                      <td className="actionsCell">
                        <div className="actionsStack">
                          <button
                            className="link actionBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewContent(item);
                            }}
                          >
                            View
                          </button>
                          <button
                            className="danger actionBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete(item);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="expand">
                        <td colSpan={4}>
                          <div className="transcript">
                            {item.full_transcript
                              ? item.full_transcript
                              : "No transcript available."}
                          </div>
                          <div className="expandActions">
                            <button
                              className="link"
                              onClick={() => viewContent(item)}
                            >
                              Open full view →
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          <footer className="pager">
            <button
              className="pill"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="pages">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="pill"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </footer>
        </>
      )}

      {showConfirm && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Delete recording?</h3>
            <p>
              This will permanently delete{" "}
              <strong>{pendingDelete?.file_name}</strong> from your account.
            </p>
            <div className="modalActions">
              <button className="btn secondary" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="btn danger" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* keep your legacy styles */}
      <style jsx>{libraryStyles}</style>

      {/* new scoped styles for the improved UI */}
      <style jsx>{`
        .page {
          max-width: 960px;
          margin: 0 auto;
          padding: 24px;
        }
        .header {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .title {
          font-size: 20px;
          font-weight: 600;
        }

        .searchWrap {
          flex: 1;
          display: flex;
          justify-content: flex-end;
        }
        .search {
          width: 100%;
          max-width: 420px;
          height: 40px;
          padding: 0 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          outline: none;
        }
        .search:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          background: #fff;
        }
        th,
        td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        th {
          text-align: left;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        td.file {
          font-weight: 500;
          color: #0f172a;
        }

        tr:hover td {
          background: #f8fafc;
        }

        .link {
          background: transparent;
          border: none;
          color: #2563eb;
          cursor: pointer;
          margin-right: 12px;
        }
        .danger {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
        }

        .pager {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 12px;
        }
        .pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
        }
        .pill:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pages {
          font-size: 12px;
          color: #64748b;
        }

        .empty {
          text-align: center;
          padding: 64px 0;
        }
        .empty .sub {
          color: #64748b;
          margin-top: 4px;
        }
        .ctaRow {
          display: inline-flex;
          gap: 12px;
          margin-top: 16px;
        }
        .btn {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fff;
        }
        .btn.secondary {
          background: #f8fafc;
        }
        .btn.danger {
          background: #fee2e2;
          border-color: #fecaca;
        }

        .skeleton .row {
          height: 52px;
          background: linear-gradient(
            90deg,
            #f1f5f9 25%,
            #f8fafc 37%,
            #f1f5f9 63%
          );
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }

        .alert {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          padding: 12px;
          border-radius: 8px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.6);
          display: grid;
          place-items: center;
        }
        .modal {
          width: 100%;
          max-width: 420px;
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(2, 6, 23, 0.25);
        }
        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }

        /* Force legible text on light controls even in dark/global themes */
        .page,
        .table,
        .pager,
        .btn,
        .pill,
        .pages {
          color: #0f172a;
        }

        .pill {
          color: #0f172a;
          background: #fff;
          border-color: #e2e8f0;
        }
        .pill:disabled {
          background: #f8fafc;
          color: #94a3b8;
          border-color: #e2e8f0;
        }

        .btn {
          color: #0f172a;
        }
        .btn.secondary {
          color: #0f172a;
        }
        .pages {
          color: #334155;
        } /* pagination text */
        th {
          color: #475569;
        } /* header cells */
        td {
          color: #0f172a;
        } /* body cells */

        .rowToggle {
          margin-right: 8px;
          border: 0;
          background: transparent;
          cursor: pointer;
        }
        .chev {
          display: inline-block;
          transition: transform 180ms ease;
        }
        .chev.open {
          transform: rotate(90deg);
        }

        tr:focus-within td {
          outline: 2px solid #93c5fd;
          outline-offset: -2px;
        }

        .expand td {
          background: #f8fafc;
          padding-top: 16px;
          padding-bottom: 16px;
        }
        .transcript {
          max-height: 4.5em; /* ~2-3 lines visible */
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2; /* clamp to 2 lines */
          -webkit-box-orient: vertical;
          color: #334155;
        }
        .expandActions {
          margin-top: 8px;
        }
        .rowToggle {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
          color: #0f172a; /* ensure visible icon */
          cursor: pointer;
          transition: background 160ms ease, box-shadow 160ms ease,
            transform 160ms ease;
        }
        .rowToggle:hover {
          background: #e2e8f0;
        }
        .rowToggle:active {
          transform: translateY(1px);
        }
        .rowToggle:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
        }

        .chev {
          display: inline-block;
          transition: transform 180ms ease;
          transform-origin: 50% 50%;
        }
        .chev.open {
          transform: rotate(90deg);
        }
        th.actionsHeader,
        td.actionsCell {
          text-align: center !important;
          vertical-align: middle;
        }
        .actionsStack {
          width: 112px; /* exact width of the buttons */
          margin-left: auto; /* pushes the stack to the right edge */
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: stretch; /* buttons fill the stack width */
        }

        /* Make THESE buttons short, even if global styles set width:100% */
        .actionBtn {
          width: 100% !important;
          display: inline-flex !important;
          justify-content: center;
          align-items: center;
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.1;
          border-radius: 8px;
        }

        /* Keep the “danger” look tidy in compact size */
        .danger.actionBtn {
          border-color: #fecaca;
          color: #b91c1c;
          background: #fff5f5;
        }
        .danger.actionBtn:hover {
          background: #fee2e2;
        }

        .link,
        .danger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a; /* force readable text */
          cursor: pointer;
          transition: box-shadow 150ms ease, transform 150ms ease,
            background 150ms ease;
        }
        .link:hover,
        .danger:hover {
          box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04),
            0 1px 2px rgba(15, 23, 42, 0.1);
          transform: translateY(-1px);
        }
        .link:focus-visible,
        .danger:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
        }

        /* Emphasis for destructive action */
        .danger {
          border-color: #fecaca;
          color: #b91c1c;
          background: #fff5f5;
        }
        .danger:hover {
          background: #fee2e2;
        }

        /* Make sure global dark styles don't turn labels white */
        .btn,
        .link,
        .danger,
        .pager,
        .pages,
        th,
        td {
          color: #0f172a;
        }
        thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #ffffff; /* ensure it doesn't inherit dark text/bg */
          border-bottom: 1px solid #e2e8f0;
        }
        /* File cell layout */
        td.file {
          width: clamp(240px, 40vw, 560px);
        }
        .fileName {
          flex: 1; /* take remaining space */
          min-width: 0; /* critical for ellipsis inside flex */
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: middle;
        }

        /* enables ellipsis & honors col widths */
        .tableWrap {
          overflow-x: auto;
        } /* if you wrap the table, keep this */

        /* Columns: adjust percentages if needed */
        .col-file {
          width: auto;
        } /* filename + caret */
        .col-date {
          width: 140px;
        }
        .col-duration {
          width: 110px;
        }
        .col-actions {
          width: 200px;
        } /* guarantees room for View/Delete */

        /* File cell truncation */
        td.file {
          /* remove any previous width clamp here */
        }
        .fileCell {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0; /* allows .fileName to shrink */
        }
        /* Buttons shouldn’t stretch */
        .link,
        .danger {
          display: inline-flex;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
