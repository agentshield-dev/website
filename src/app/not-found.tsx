import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "./_components/Arrow";
import { cx } from "./_lib/cx";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Not found",
  description: "This page does not exist.",
};

export default function NotFound() {
  return (
    <section className={styles.lost}>
      <div className={cx("container", styles.inner)}>
        <h1 className={styles.title}>No path to that page.</h1>
        <p className="lead">The address is wrong or the page moved. Start from the beginning.</p>
        <div className={styles.lost__actions}>
          <Link className="btn btn--primary" href="/">
            Back to the start
            <Arrow />
          </Link>
          <Link className="link" href="/how-it-works/">
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
