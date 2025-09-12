import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SimpleFooter = () => {
  const footerRef = useRef(null);
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    // Handle subscription logic here
    setEmail("");
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("footer-visible");
        }
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="footer"
      style={{
        backgroundColor: "#0B0B0D",
        boxShadow:
          "0 10px 40px rgba(0,0,0,0.35) inset, 0 -1px 0 rgba(255,255,255,0.02)",
      }}
    >
      <div
        className="footer-content"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "48px 24px 40px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          color: "var(--text-300)",
          fontFamily: 'Inter, "SF Pro Text", system-ui',
          letterSpacing: "0.01em",
          lineHeight: 1.5,
        }}
      >
        <div className="footer-grid">
          <div className="brand-column">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6B21A8] to-[#8B5CF6]" />
              <h3 className="text-xl font-semibold text-white">test</h3>
            </div>
            <p className="text-[rgba(255,255,255,0.7)] mt-4 max-w-[220px]">
              record/transcribe easily
            </p>
            <div className="social-links mt-4">
              <a href="#" className="social-link">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a href="#" className="social-link">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="footer-links">
            <Link href="/about" className="footer-link">
              About
            </Link>
            <Link href="/blog" className="footer-link">
              Blog
            </Link>
            <Link href="/privacypolicy" className="footer-link">
              Privacy Policy
            </Link>
            <Link href="/termsofuse" className="footer-link">
              Terms of Use
            </Link>
          </div>
          <div className="footer-links">
            <Link href="/about" className="footer-link">
              About
            </Link>
            <Link href="/blog" className="footer-link">
              Blog
            </Link>
            <Link href="/privacypolicy" className="footer-link">
              Privacy Policy
            </Link>
            <Link href="/termsofuse" className="footer-link">
              Terms of Use
            </Link>
          </div>
          <div className="newsletter">
            <h4 className="newsletter-title">Stay in Touch</h4>
            <form onSubmit={handleSubscribe} className="newsletter-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="newsletter-input"
              />
              <button type="submit" className="newsletter-button">
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <div
          className="footer-copyright"
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "var(--text-300)",
            fontSize: "0.875rem",
          }}
        >
          © {new Date().getFullYear()} All rights reserved.
        </div>
      </div>

      <style jsx>{`
        .footer {
          width: 100%;
        }

        .footer-grid {
          display: flex;
          align-items: flex-start;
          gap: 160px;
          margin-bottom: 32px;
        }

        .brand-column {
          max-width: 280px;
        }

        .social-links {
          display: flex;
          gap: 16px;
          margin-top: 12px;
        }

        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          opacity: 0.6;
          transition: opacity 150ms ease-out;
          color: var(--text-300);
        }

        .social-link:hover {
          opacity: 1;
          color: var(--text-100);
        }

        .social-link svg {
          width: 20px;
          height: 20px;
        }

        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .footer-links :global(a) {
          color: var(--text-300) !important;
          text-decoration: none;
          transition: color 200ms ease, transform 200ms ease,
            text-decoration-color 200ms ease;
        }

        .footer-links :global(a:hover) {
          color: var(--text-100) !important;
          transform: translateY(-1px);
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
        }

        .footer-links :global(a:focus) {
          color: var(--text-100) !important;
          outline: none;
          box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.35);
          border-radius: 6px;
        }

        .newsletter {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .newsletter-title {
          color: var(--text-300);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .newsletter-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .newsletter-input {
          width: 100%;
          max-width: 200px;
          padding: 8px 12px;
          background-color: #171717;
          color: white;
          border: 1px solid #262626;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .newsletter-input::placeholder {
          color: #6b7280;
        }

        .newsletter-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .newsletter-button {
          background-color: #8b5cf6;
          color: white;
          font-weight: 500;
          padding: 8px 24px;
          border-radius: 6px;
          transition: background-color 200ms ease;
          width: fit-content;
        }

        .newsletter-button:hover {
          background-color: #7c3aed;
        }

        .footer-visible {
          animation: footerReveal 320ms ease-out forwards;
        }

        @keyframes footerReveal {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1024px) {
          .footer-content {
            padding: 32px 24px;
          }
        }

        @media (max-width: 768px) {
          .footer-grid {
            flex-direction: column;
            gap: 32px;
          }
        }

        @media (max-width: 640px) {
          .footer-content {
            padding: 24px 16px;
          }
        }
      `}</style>
    </footer>
  );
};

export default SimpleFooter;
