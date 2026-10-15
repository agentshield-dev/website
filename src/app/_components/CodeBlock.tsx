"use client";

import { useRef, useState } from "react";
import { cx } from "../_lib/cx";
import styles from "./CodeBlock.module.css";

type CopyState = "idle" | "copied" | "select";

export function CodeBlock({
  lines,
  label = "Copy commands",
  prompt = true,
}: {
  lines: readonly string[];
  label?: string;
  prompt?: boolean;
}) {
  const code = useRef<HTMLElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [state, setState] = useState<CopyState>("idle");

  const flash = (next: CopyState) => {
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash("copied");
    } catch {
      if (code.current) window.getSelection()?.selectAllChildren(code.current);
      flash("select");
    }
  };

  const status = {
    idle: "",
    copied: "Copied to clipboard",
    select: "Copy failed. The text is selected; press Command or Control C.",
  }[state];

  return (
    <div className={cx(styles.code, prompt && styles["code--prompt"])}>
      <pre className={styles.code__pre} tabIndex={0}>
        <code ref={code}>
          {lines.map((line, index) => (
            <span key={index} className={styles.code__line}>
              {line}
            </span>
          ))}
        </code>
      </pre>
      <button className={styles.code__copy} type="button" aria-label={label} onClick={copy}>
        {state === "copied" ? "Copied" : state === "select" ? "Select" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
