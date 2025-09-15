import { useState } from "react";
import styles from "./FAQ.module.css";

const FAQItem = ({ question, answer, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={styles.faqItem}>
      <button
        className={styles.faqButton}
        onClick={toggleExpansion}
        aria-expanded={isExpanded}
        aria-controls={`answer-${id}`}
      >
        <span className={styles.question}>{question}</span>
        <svg
          className={`${styles.icon} ${isExpanded ? styles.iconExpanded : ""}`}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M8 0v16M0 8h16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </button>
      <div
        id={`answer-${id}`}
        role="region"
        className={`${styles.answerContainer} ${
          isExpanded ? styles.answerExpanded : ""
        }`}
      >
        <div className={styles.answer}>{answer}</div>
      </div>
    </div>
  );
};

const faqData = [
  {
    id: 1,
    question: "What can I record with EchoAlly?",
    answer:
      "EchoAlly can record both microphone audio (for in-person conversations or online meetings) and phone calls. The app works on both desktop and mobile devices.",
  },
  {
    id: 2,
    question: "How does the AI assistant work?",
    answer:
      "After recording, our AI transcribes the conversation and creates a searchable record. You can then ask questions about what was discussed, and the AI will find and explain the relevant parts of the conversation.",
  },
  {
    id: 3,
    question: "Is my data private and secure?",
    answer:
      "Yes! Your recordings and transcripts are private by default and encrypted. You have full control over your data and can delete it at any time.",
  },
  {
    id: 4,
    question: "Do I need to install anything?",
    answer:
      "For basic recording and transcription, you just need a web browser. Phone call recording requires our mobile app (coming soon to iOS and Android).",
  },
  {
    id: 5,
    question: "Can I try it for free?",
    answer:
      "Yes! You can sign up and start using EchoAlly without a credit card. The free tier includes basic recording and transcription features.",
  },
];

export default function FAQ() {
  return (
    <section className={styles.faqSection}>
      <div className={styles.faqInner}>
        <h1 className={styles.faqTitle}>FAQ</h1>
        <div className={styles.faqContent}>
          {faqData.map((faq) => (
            <FAQItem key={faq.id} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
}
