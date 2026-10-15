import { cx } from "../_lib/cx";
import styles from "./PageHead.module.css";

export function PageHead({ title, lede }: { title: string; lede: string }) {
  return (
    <header className={styles["page-head"]}>
      <div className={cx("container", styles.inner)}>
        <h1 className={styles.title}>{title}</h1>
        <p className="lead">{lede}</p>
      </div>
    </header>
  );
}
