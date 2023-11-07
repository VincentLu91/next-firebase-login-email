import Link from "next/link";
const Footer = () => {
  return (
    <div className="footerstyle">
      <Link href="/blog">
        Blog
      </Link>
      <br />
      <Link href="/privacypolicy">
        Privacy Policy
      </Link>
      <br />
      <Link href="/termsofuse/">
        Terms of Use
      </Link>
    </div>
  );
};

export default Footer;
