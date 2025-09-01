const UtilityPanel = () => {
  return (
    <div className="utility-panel">
      <div className="utility-header">
        <h2>AI Insights</h2>
      </div>

      <div className="utility-content">
        <div className="utility-section">
          <h3>Summary</h3>
          <div className="utility-card">
            <p className="muted">
              Select a recording to view AI-generated insights
            </p>
          </div>
        </div>

        <div className="utility-section">
          <h3>Key Points</h3>
          <div className="utility-card">
            <p className="muted">
              Important moments and action items will appear here
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .utility-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .utility-header {
          padding: var(--space-4);
          border-bottom: 1px solid var(--muted-600);
        }

        .utility-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-100);
          margin: 0;
        }

        .utility-content {
          flex: 1;
          padding: var(--space-4);
          overflow-y: auto;
        }

        .utility-section {
          margin-bottom: var(--space-5);
        }

        .utility-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-300);
          margin: 0 0 var(--space-3);
        }

        .utility-card {
          background: var(--bg-700);
          border-radius: var(--radius-card);
          padding: var(--space-4);
        }

        .utility-card p {
          margin: 0;
          font-size: 14px;
        }

        @media (max-width: 1024px) {
          .utility-panel {
            position: fixed;
            top: var(--header-height);
            right: 0;
            width: 88vw;
            height: calc(100vh - var(--header-height));
            background: var(--bg-800);
            border-left: 1px solid var(--muted-600);
            transform: translateX(100%);
            transition: transform var(--transition-spring);
          }

          .utility-panel.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default UtilityPanel;
