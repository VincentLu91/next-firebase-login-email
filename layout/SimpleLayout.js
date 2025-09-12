import Header from "./Header";
import SimpleFooter from "./SimpleFooter";

const SimpleLayout = ({ children }) => {
  return (
    <div className="simple-layout">
      <Header />
      <main className="simple-content">{children}</main>
      <SimpleFooter />
    </div>
  );
};

export default SimpleLayout;
