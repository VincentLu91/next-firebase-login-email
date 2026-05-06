import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Link from "next/link";
import FAQ from "../components/FAQ";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>EchoAlly</title>
        <meta
          name="description"
          content="Be present now. Remember everything later"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              Remember important calls without taking notes.
            </h1>
            <p className={styles.description}>
              A simple app for remembering important calls. Record, transcribe,
              replay, and ask AI what was said later.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/signin" className={styles.primaryCta}>
                Try free
              </Link>
              <Link href="#how-it-works" className={styles.secondaryCta}>
                See how it works
              </Link>
            </div>
            <p>iOS and Android TBA</p>
          </div>
          <div className={styles.heroImage}>
            <Image
              src="/transcriptSept2025.png"
              alt="App interface showing transcription"
              width={500}
              height={400}
              priority
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </section>

        <section className={styles.featuresGrid}>
          <h1 className={styles.sectionTitle}>
            A memory layer for your important calls.
          </h1>
          <p className={styles.description} style={{ textAlign: "center" }}>
            Save the important parts of a call so you can come back to them
            later.
          </p>
          <section id="use-cases" className={styles.useCases}>
            <div className={styles.useCase}>
              <h2>Works anywhere</h2>
              <p>
                Record calls on your phone, then review them later on mobile or
                desktop.
              </p>
              <Image
                src="/mic_call.png"
                alt="Transcript interface on mobile"
                width={500}
                height={300}
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.useCase}>
              <h2>Your data, your control</h2>
              <p>
                Your saved calls stay private, and you can delete them anytime.
              </p>
              <Image
                src="/deleteanytime.png"
                alt="Transcript interface on mobile"
                width={500}
                height={300}
                style={{ objectFit: "cover" }}
              />
            </div>
          </section>
        </section>

        <section id="how-it-works" className={styles.featuresGrid}>
          <h1 className={styles.sectionTitle}>How it works</h1>
          <div className={styles.featureCard}>
            <div className={styles.featureContent}>
              <h2>Focus on people, not notes</h2>
              <p>
                Record the call so you can listen now and review the details
                later.
              </p>
            </div>
            <div className={styles.featureImage}>
              <Image
                src="/people_not_notes.png"
                alt="People having a conversation"
                width={500}
                height={300}
                style={{ objectFit: "cover", width: "100%", height: "auto" }}
              />
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureContent}>
              <h2>Replay or skim</h2>
              <p>
                Replay the call or skim the transcript when you need the
                details.
              </p>
            </div>
            <div className={styles.featureImage}>
              <Image
                src="/view_transcript_mobile.png"
                alt="Transcript interface on mobile"
                width={500}
                height={300}
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureContent}>
              <h2>Ask the AI</h2>
              <p>
                Ask what was said on a call, what details mattered, or what you
                need to remember next.
              </p>
            </div>
            <div className={styles.featureImage}>
              <Image
                src="/askAI.png"
                alt="AI answering questions about the transcript"
                width={500}
                height={300}
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        </section>

        <section className={styles.featuresGrid}>
          <h1 className={styles.sectionTitle}>Important calls. Remembered.</h1>
          <section className={styles.splitSection}>
            <div className={styles.splitContent}>
              <p>
                Important calls move fast. Names, dates, decisions, and details
                are easy to miss when you are trying to listen.
              </p>
            </div>
            <div className={styles.splitDivider} />
            <div className={styles.splitContent}>
              <p>
                The app records and transcribes your call so you can replay it,
                search the transcript, and ask AI what was said later.
              </p>
            </div>
          </section>
        </section>

        <section className={styles.featuresGrid}>
          <h1 className={styles.sectionTitle}>Built for important calls</h1>
          <section id="use-cases" className={styles.useCases}>
            <div className={styles.useCase}>
              <h2>Important calls</h2>
              <p>
                Record the call, then review what was said when you need the
                details.
              </p>
            </div>
            <div className={styles.useCase}>
              <h2>Personal calls</h2>
              <p>
                Keep track of details from family calls, appointments, and
                everyday conversations.
              </p>
            </div>
            <div className={styles.useCase}>
              <h2>Learning conversations</h2>
              <p>
                Record interviews, lectures, or study conversations so you can
                revisit the key details later.
              </p>
            </div>
            <div className={styles.useCase}>
              <h2>Appointments and admin calls</h2>
              <p>
                Remember details from appointments, service calls, and planning
                conversations.
              </p>
            </div>
          </section>
        </section>

        <section className={styles.featuresGrid}>
          <FAQ />
        </section>

        <section className={styles.closingCta}>
          <h2 className={styles.title}>
            Ready to remember your important calls?
          </h2>
          <Link href="/signin" className={styles.primaryCta}>
            Start recording important calls
          </Link>
        </section>
      </main>
    </div>
  );
}
