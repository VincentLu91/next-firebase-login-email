import Header from "./Header";
import Footer from "./Footer";

const SimpleLayout = ({ children }) => {
  return (
    <div className="simple-layout">
      <Header />
      <main className="simple-content">{children}</main>
      <Footer />
    </div>
  );
};

export default SimpleLayout;
