import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import UtilityPanel from "./UtilityPanel";

const Layout = ({ children }) => {
  const [isUtilityOpen, setIsUtilityOpen] = useState(false);

  return (
    <div className="app-container">
      <Header />

      <aside className="app-sidebar">
        <Sidebar />
        <div className="resizer resizer-right" />
      </aside>

      <main className="app-content">{children}</main>

      {/* Utility Panel - commented out for now, may be used later for right-side pull-out
      <aside className={`app-utility ${isUtilityOpen ? "open" : ""}`}>
        <div className="resizer resizer-left" />
        <UtilityPanel />
      </aside>
      */}
    </div>
  );
};

export default Layout;
