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
              Be present now. Remember everything later.
            </h1>
            <p className={styles.description}>
              A simple app that records your mic or phone calls, transcribes in
              real time, and lets an AI answer questions about what was
              said&mdash;so you can listen without fear of missing anything.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/signin" className={styles.primaryCta}>
                Sign up free
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
            A Personal AI that travels with you.
          </h1>
          <p className={styles.description} style={{ textAlign: "center" }}>
            Have your personal assistant follow any convo, like a second brain
            that never forgets.
          </p>
          <section id="use-cases" className={styles.useCases}>
            <div className={styles.useCase}>
              <h2>Works anywhere</h2>
              <p>Mic recording and phone call recording. Phone and Desktop.</p>
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
              <p>Private by default, delete anytime</p>
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
              <p>We capture the words so you can keep eye contact.</p>
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
              <p>Listen back or scan clean transcripts on any device.</p>
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
                &quot;What did we agree?&quot; &quot;What are my next
                steps?&quot; Get answers instantly.
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
          <h1 className={styles.sectionTitle}>Your day-to-day. Remembered</h1>
          <section className={styles.splitSection}>
            <div className={styles.splitContent}>
              <p>
                If you&apos;re busy, you drift. You nod, but details blur. Later
                you need to respond, and you&apos;re not 100% sure what was
                said.
              </p>
            </div>
            <div className={styles.splitDivider} />
            <div className={styles.splitContent}>
              <p>
                This app is your safety net. It records, transcribes, and gives
                you an AI you can ask&mdash;so you can be present now and still
                have perfect recall later.
              </p>
            </div>
          </section>
        </section>

        <section className={styles.featuresGrid}>
          <h1 className={styles.sectionTitle}>Use Cases</h1>
          <section id="use-cases" className={styles.useCases}>
            <div className={styles.useCase}>
              <h2>Work calls</h2>
              <p>Leave the note-taking to us; leave with clear next steps.</p>
            </div>
            <div className={styles.useCase}>
              <h2>Personal life</h2>
              <p>Remember details loved ones share, from dates to to-dos.</p>
            </div>
            <div className={styles.useCase}>
              <h2>Learning</h2>
              <p>
                Interview, lecture, or podcast&mdash;capture and extract key
                ideas.
              </p>
            </div>
            <div className={styles.useCase}>
              <h2>Errands &amp; planning</h2>
              <p>Turn shopping lists and chores into actionable tasks.</p>
            </div>
          </section>
        </section>

        <section className={styles.featuresGrid}>
          <FAQ />
        </section>

        <section className={styles.closingCta}>
          <h2 className={styles.title}>
            Ready to feel present and still remember it all?
          </h2>
          <Link href="/signin" className={styles.primaryCta}>
            Sign up free (no credit card needed)
          </Link>
        </section>
      </main>
    </div>
  );
}
