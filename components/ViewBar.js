export default function ViewBar({ title, onBack, right }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 24px",
        background: "rgba(15,17,21,.7)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        className="u-pill"
        onClick={onBack}
        style={{ padding: "6px 10px" }}
      >
        ← Back
      </button>
      <h1
        style={{
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          marginRight: "auto",
        }}
      >
        {title}
      </h1>
      <div style={{ display: "flex", gap: 8 }}>{right}</div>
    </header>
  );
}
