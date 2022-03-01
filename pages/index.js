import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Recreate AI</title>
        <meta
          name="description"
          content="Let AI Recreate  Communication for you"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className={styles["hero-image"]}>
          <h1 className={styles.title}>
            Let AI Recreate Communication For You
          </h1>

          {/*<h2>
          <Link href="/signin">Sign in</Link>
        </h2>*/}

          <p className={styles.description}>
            So you won&apos;t lose sight of important information
          </p>
        </div>

        <h2>Ever forgotten what you have to do for your shopping list?</h2>
        <h2>
          Ever feeling bored in meetings and not paying attention to what topics
          your colleagues are talking about?
        </h2>
        <h2>Ever misinterpreted what your loved ones are telling you?</h2>
        <h3>
          Transform any communication in real time into visible information so
          you can always respond on the go or when you are ready.
        </h3>

        <h2>
          Sign Up For Free{" "}
          <Link href="/signin">
            <a className="register">Today</a>
          </Link>
        </h2>

        <div className="landing-page-container">
          <div className="vertical-align-image-left">
            <Image src="/random.png" alt="" width={300} height={400} />
          </div>
          <div className="vertical-align-text">
            <h1>Paris is one of the most beautiful cities in France.</h1>
          </div>
        </div>

        <div className="landing-page-container">
          <div className="vertical-align-image-right">
            <Image src="/random.png" alt="" width={300} height={400} />
          </div>
          <div className="vertical-align-text">
            <h1>London is the capital and largest city of England.</h1>
          </div>
        </div>
      </main>
    </div>
  );
}
