import Link from "next/link";
const Footer = () => {
  return (
    <>
      <nav>
        <Link href="/blog">
          <a>Blog</a>
        </Link>
        <Link href="/privacypolicy">
          <a>Privacy Policy</a>
        </Link>
        <Link href="/termsofuse/">
          <a>Terms of Use</a>
        </Link>
      </nav>
      <footer>Copyright 2022 recreate.ai</footer>
    </>
  );
};

export default Footer;
