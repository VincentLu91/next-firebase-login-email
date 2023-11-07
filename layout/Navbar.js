import Link from "next/link";

const Navbar = () => {
  return (
    <nav>
      <div className="logo">
        <h1>EchoAlly</h1>
      </div>
      <Link href="/">
        Home
      </Link>
      <Link href="/about">
        About
      </Link>
      <Link href="/pricing">
        Pricing
      </Link>
      <Link href="/signin/">
        Sign In
      </Link>
    </nav>
  );
};

export default Navbar;
