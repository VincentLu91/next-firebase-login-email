import Link from "next/link";
const Footer = () => {
  return (
    <div className="footerstyle">
      <Link href="/about">About</Link>
      <Link href="/blog">Blog</Link>
      <Link href="/privacypolicy">Privacy Policy</Link>
      <Link href="/termsofuse">Terms of Use</Link>
    </div>
  );
};

export default Footer;
