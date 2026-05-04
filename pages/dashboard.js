import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { setSound } from "../redux/recording/actions";
import { useRouter } from "next/router";
import Link from "next/link";
//import { printTranscription } from "../../../redux/language/actions";
import libraryStyles from "../styles/libraryStyles";
import { useProtectedPage } from "../utils/auth-helpers";
import { useMemo, useRef } from "react";

const Dashboard = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, customer, loading: authLoading, supabase } = useProtectedPage();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const [cloudRecordingList, setCloudRecordingList] = React.useState([]);
  const [search, setNewSearch] = React.useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);

  const searchInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchRecordings = useCallback(
    async (customer) => {
      if (!customer) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [micRecordingInfo, callRecordingInfo] = await Promise.all([
          supabase
            .from("mic_recordings")
            .select(
              "id, customer_id, file_name, duration, full_transcript, original_file_name, created_at",
            )
            .eq("customer_id", customer.id),
          supabase
            .from("call_recordings")
            .select(
              "id, customer_id, file_name, duration, full_transcript, original_file_name, created_at",
            )
            .eq("customer_id", customer.id),
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
    [supabase],
  );

  // Fetch recordings once customer is available
  useEffect(() => {
    if (customer) {
      fetchRecordings(customer);
    }
  }, [customer, fetchRecordings]);

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
        callChunkDeleteInfo.data[0].id,
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
      rowId: getRowId(item),
    });
    setShowConfirm(true);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || !customer) return;
    const { original_file_name } = pendingDelete;

    await deleteRecording(original_file_name, customer);

    setDeletingRowId(pendingDelete.rowId);

    setTimeout(() => {
      setCloudRecordingList((prev) =>
        prev.filter((r) => r.original_file_name !== original_file_name),
      );
      setDeletingRowId(null);
    }, 240);

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
        item.full_transcript?.toLowerCase().includes(q),
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
      date,
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

  function getRecordingType(item) {
    const name = `${item.file_name || ""} ${
      item.original_file_name || ""
    }`.toLowerCase();
    return name.includes("call") || name.includes("phone")
      ? "Phone call"
      : "Mic recording";
  }

  function formatCardDate(timestamp) {
    if (!timestamp) return "—";

    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }

  function hasTranscript(item) {
    return Boolean(item.full_transcript && item.full_transcript.trim());
  }

  return (
    <div className="page">
      <header className="header">
        <h2 className="title">Audio List and Transcript</h2>
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
        {/* Commented out - only available for users with subscription
        <Link href="/buy-credits">
          <button className="buyCreditsBtn">💳 Buy Credits</button>
        </Link>
        */}
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
            <Link
              href="/internalrecording"
              style={{ color: "var(--accent-400)" }}
            >
              Recording
            </Link>
            <br />
            <Link
              href="/phonerecording2"
              style={{ color: "var(--accent-400)" }}
            >
              Phone Recording
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="recordingCards">
            {currentItems.map((item) => {
              const id = getRowId(item);
              const isDeleting = deletingRowId === id;

              return (
                <article
                  key={id}
                  className={`recordingCard ${isDeleting ? "deleting" : ""}`}
                  onKeyDown={(e) => handleRowKeyDown(e, item)}
                >
                  <button
                    type="button"
                    className="recordingCardMain"
                    onClick={() => viewContent(item)}
                    aria-label={`Open ${item.file_name}`}
                  >
                    <div className="recordingCardBody">
                      <h3 className="recordingTitle">{item.file_name}</h3>

                      <p className="recordingDate">
                        {formatCardDate(item.created_at)}
                      </p>

                      <span className="recordingType">
                        {getRecordingType(item)}
                      </span>

                      <div className="recordingMeta">
                        <span className="durationText">
                          {formatDuration(item.duration)}
                        </span>

                        <span
                          className={`transcriptStatus ${
                            hasTranscript(item) ? "ready" : "missing"
                          }`}
                        >
                          {hasTranscript(item)
                            ? "Transcript ready"
                            : "No transcript"}
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="deleteIconButton"
                    aria-label={`Delete ${item.file_name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(item);
                    }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </article>
              );
            })}
          </div>

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
              <button className="btn-muted" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleConfirmDelete}>
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
          max-width: 1060px;
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
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.01em;
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
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--panel-2);
          color: var(--text);
        }
        .search::placeholder {
          color: var(--muted);
        }
        .search:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }

        .buyCreditsBtn {
          padding: 10px 20px;
          border-radius: 10px;
          border: 1px solid rgba(123, 92, 255, 0.3);
          background: linear-gradient(to right, #7b5cff, #985cff);
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .buyCreditsBtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(123, 92, 255, 0.4);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }
        thead th {
          text-align: left;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted);
          padding: 0 12px 6px;
          position: sticky;
          top: 0;
          z-index: 2;
          background: var(--bg);
        }
        td,
        th {
          padding: 14px 12px;
          vertical-align: middle;
        }
        tbody tr > td {
          background: var(--panel);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        tbody tr > td:first-child {
          border-left: 1px solid var(--border);
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }
        tbody tr > td:last-child {
          border-right: 1px solid var(--border);
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        tr:hover td {
          background: linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.02),
              rgba(255, 255, 255, 0.02)
            ),
            var(--panel);
        }

        td.file .fileCell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .fileName {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }

        .rowToggle {
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--panel-2);
          color: var(--text);
          transition: transform 0.16s ease, background 0.16s ease;
        }
        .rowToggle:hover {
          background: var(--panel);
        }
        .chev {
          display: inline-block;
          transition: transform 0.18s ease;
        }
        .chev.open {
          transform: rotate(90deg);
        }

        .expand td {
          background: var(--panel-2);
        }
        .transcript {
          color: var(--muted);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .actionsHeader,
        .actionsCell {
          text-align: center !important;
        }
        .actionsStack {
          width: 112px;
          margin-left: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .link,
        .danger,
        .actionBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--panel-2);
          color: var(--text);
          transition: transform 0.15s ease, box-shadow 0.15s ease,
            background 0.15s ease;
        }
        .link:hover,
        .danger:hover,
        .actionBtn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-hover);
        }
        .danger {
          color: #ffb4b4;
          border-color: #4b2a2a;
          background: #2a1b1b;
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
          background: var(--panel);
          border: 1px solid var(--border);
          color: var(--text);
        }
        .pill:disabled {
          opacity: 0.5;
        }

        .skeleton .row {
          height: 52px;
          border-radius: 12px;
          margin-bottom: 8px;
          background: linear-gradient(
            90deg,
            #1d2230 25%,
            #22283a 37%,
            #1d2230 63%
          );
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        /* ---- EXPAND ROW SHOULD ATTACH TO ROW ABOVE ---- */
        tbody tr:not(.expand) td {
          background: var(--panel);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        tbody tr:not(.expand) td:first-child {
          border-left: 1px solid var(--border);
        }
        tbody tr:not(.expand) td:last-child {
          border-right: 1px solid var(--border);
        }

        /* When a row is expanded, remove its bottom border so details connect */
        tbody tr[aria-expanded="true"] td {
          border-bottom: 0;
        }

        /* The expanded details row: visually continue the previous row */
        tbody tr.expand td {
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-top: 0; /* attach to the row above */
          padding-top: 12px;
          padding-bottom: 16px;
        }

        /* Optional: tidy rounding so the pair reads as one “unit” */
        tbody tr:not(.expand) td {
          border-radius: 0;
        }
        tbody tr[aria-expanded="true"] td:first-child {
          border-top-left-radius: 12px;
        }
        tbody tr[aria-expanded="true"] td:last-child {
          border-top-right-radius: 12px;
        }
        tbody tr.expand td {
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }

        /* Keep hover only on main rows */
        tbody tr.expand:hover td {
          background: var(--panel-2);
        }
        /* Delete confirmation overlay & dialog (missing styles) */
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 17, 21, 0.6); /* dim the page */
          display: grid;
          place-items: center;
          padding: 16px;
          z-index: 9999; /* sit above everything */
        }

        .modal {
          width: 100%;
          max-width: 420px;
          background: var(--panel); /* matches theme */
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: var(--shadow-hover);
          padding: 20px;
          position: relative;
        }

        .modal h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 800;
        }

        .modal p {
          color: var(--muted);
          margin: 0;
        }
        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        /* Empty state styling */
        .empty {
          text-align: center;
          padding: 40px 20px;
        }
        .empty .sub {
          color: var(--text-300);
          margin-bottom: 20px;
        }
        .ctaRow {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .ctaRow a {
          display: inline-block;
          padding: 10px 20px;
          background: var(--bg-700);
          border: 1px solid var(--muted-600);
          border-radius: var(--radius-pill);
          color: var(--text-300);
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .ctaRow a:hover {
          background: var(--bg-800);
          color: var(--text-100);
        }

        .recordingCards {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 18px;
        }

        .recordingCard {
          position: relative;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--bg-800);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          transition: opacity 220ms ease, transform 220ms ease,
            max-height 220ms ease, margin 220ms ease, padding 220ms ease,
            border-color 180ms ease;
          max-height: 140px;
        }

        .recordingCard:hover {
          transform: translateY(-1px);
          border-color: rgba(168, 85, 247, 0.35);
        }

        .recordingCard.deleting {
          opacity: 0;
          transform: translateX(20px) scale(0.98);
          max-height: 0;
          margin-top: -16px;
          border-color: transparent;
          pointer-events: none;
        }

        .recordingCardMain {
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          padding: 20px 24px;
          cursor: pointer;
        }

        .recordingTitle {
          margin: 0;
          max-width: calc(100% - 70px);
          color: var(--text-100);
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .recordingDate {
          margin: 6px 0 10px;
          color: var(--text-300);
          font-size: 14px;
        }

        .recordingType {
          display: inline-flex;
          align-items: center;
          border-radius: var(--radius-pill);
          background: var(--bg-700);
          color: var(--accent-400);
          padding: 5px 12px;
          font-size: 13px;
          font-weight: 700;
        }

        .recordingMeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 12px;
        }

        .durationText {
          color: var(--text-100);
          font-size: 15px;
          font-weight: 500;
        }

        .transcriptStatus {
          font-size: 14px;
          font-weight: 700;
        }

        .transcriptStatus.ready {
          color: #34d399;
        }

        .transcriptStatus.missing {
          color: var(--text-300);
        }

        .deleteIconButton {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(239, 68, 68, 0.28);
          background: rgba(255, 255, 255, 0.04);
          color: #ef4444;
          cursor: pointer;
          transition: transform 160ms ease, background 160ms ease,
            border-color 160ms ease, box-shadow 160ms ease;
        }

        .deleteIconButton:hover {
          transform: scale(1.05);
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.55);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.14);
        }

        .deleteIconButton:active {
          transform: scale(0.96);
        }

        @media (max-width: 700px) {
          .recordingCardMain {
            padding: 16px 18px;
          }

          .recordingTitle {
            font-size: 16px;
            max-width: calc(100% - 60px);
          }

          .recordingDate,
          .recordingType {
            font-size: 13px;
          }

          .recordingMeta {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .deleteIconButton {
            top: 16px;
            right: 16px;
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
