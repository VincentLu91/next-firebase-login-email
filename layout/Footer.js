import Link from "next/link";
const Footer = () => {
  return (
    <div className="footerstyle">
      <Link href="/blog">
        <a>Blog</a>
      </Link>
      <br />
      <Link href="/privacypolicy">
        <a>Privacy Policy</a>
      </Link>
      <br />
      <Link href="/termsofuse/">
        <a>Terms of Use</a>
      </Link>
      <footer>Copyright 2022 recreate.ai</footer>
    </div>
  );
};

export default Footer;
