import Image from "next/image";
import { cx } from "../../_lib/cx";
import { siteConfig } from "../../site-config";
import { Arrow } from "../Arrow";
import styles from "./Findings.module.css";

const points = [
  {
    title: "Evidence you can follow",
    text: "Every finding lists the resources it affects and the evidence signals behind it, pinned to the graph digest it was raised on.",
  },
  {
    title: "Uncertainty, stated",
    text: "Each finding carries a severity and the model’s own uncertainty, so you know what to read first and what to doubt.",
  },
  {
    title: "Fixes from the plugins that can apply them",
    text: "Kubernetes, Cilium, and Istio declare the actions they can take. You pick one, review the change it prepared, and approve it. Agentshield applies it and re-reads the policy to verify it landed.",
  },
];

const sizes = "(min-width: 60rem) 28rem, 90vw";

export function Findings() {
  return (
    <section className="band band--tint" id="findings" aria-labelledby="product-title">
      <div className={cx("container", styles.product__grid)}>
        <div className={styles.product__copy}>
          <h2 id="product-title">Findings that show their work.</h2>
          <ul className={styles.points}>
            {points.map((point) => (
              <li key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </li>
            ))}
          </ul>
          <a className="link" href={siteConfig.links.remediation}>
            How remediation works
            <Arrow />
          </a>
        </div>

        <figure className={styles.product__media}>
          <div className={styles.shots}>
            <div className={cx(styles.shot, styles["shot--finding"])}>
              <Image
                src="/images/product/finding.webp"
                width={960}
                height={1441}
                alt="The finding view for shop/cart: severity, model uncertainty, graph digest, affected resources, evidence signals, and a remediation with a Prepare button."
                sizes={sizes}
              />
            </div>
            <div className={cx(styles.shot, styles["shot--approval"])}>
              <Image
                src="/images/product/approval.webp"
                width={960}
                height={856}
                alt="The approval dialog for network.declare-ingress-isolation, showing the provider, the target, and the exact NetworkPolicy change to apply, with Cancel and Approve and apply buttons."
                sizes={sizes}
              />
            </div>
          </div>
          <figcaption className={styles.product__caption}>
            The explorer running against a demo environment: a shop on Kubernetes and Istio.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
