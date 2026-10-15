import Link from "next/link";
import { planned, plugins } from "../../_data/plugins";
import { cx } from "../../_lib/cx";
import { siteConfig } from "../../site-config";
import { Arrow } from "../Arrow";
import styles from "./PluginsTeaser.module.css";

export function PluginsTeaser() {
  return (
    <section className="band" id="plugins" aria-labelledby="plugins-title">
      <div className={cx("container", styles.plugins__grid)}>
        <div className={styles.plugins__intro}>
          <h2 id="plugins-title">Plugins are how it sees.</h2>
          <p className="lead">
            A plugin is a Go package. It reads one system, publishes what it finds into the graph,
            and can declare the fixes it knows how to apply. If a system can report changes, it can
            be a plugin.
          </p>
          <p className={styles.plugins__next}>
            Planned: {planned.map((item) => item.name).join(", ")}.
          </p>
          <div className={styles.plugins__actions}>
            <Link className="btn btn--primary" href="/plugins/">
              All plugins
              <Arrow />
            </Link>
            <a className="link" href={siteConfig.links.pluginGuide}>
              Write one
              <Arrow />
            </a>
          </div>
        </div>

        <ul className={styles["plugin-list"]}>
          {plugins.map((plugin) => (
            <li key={plugin.id} className={styles.plugin}>
              <div className={styles.plugin__head}>
                <h3>{plugin.name}</h3>
                {plugin.status === "early" ? <span className={styles.tag}>Early</span> : null}
              </div>
              <p>{plugin.summary}</p>
              <ul className={styles.caps} aria-label={`${plugin.name} capabilities`}>
                {plugin.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
