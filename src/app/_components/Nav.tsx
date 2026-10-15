"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "../_lib/cx";
import { siteConfig } from "../site-config";
import { Arrow } from "./Arrow";
import { Logo } from "./Logo";
import styles from "./Nav.module.css";

// Docs and blog are separate static sites under the same origin, so they get plain anchors.
const separateSites = new Set<string>([siteConfig.links.docs, siteConfig.links.blog]);
const trimSlash = (path: string) => path.replace(/\/$/, "") || "/";

function NavLink({
  href,
  current,
  onNavigate,
  children,
}: {
  href: string;
  current: boolean;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  if (separateSites.has(href)) {
    return (
      <a href={href} onClick={onNavigate}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-current={current ? "page" : undefined} onClick={onNavigate}>
      {children}
    </Link>
  );
}

export function Nav() {
  const pathname = trimSlash(usePathname() ?? "/");
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const element = menu.current;
    if (!element) return;
    const close = () => {
      element.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && element.open) {
        close();
        element.querySelector("summary")?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (element.open && !element.contains(event.target as Node)) close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const closeMenu = () => {
    if (menu.current) menu.current.open = false;
  };

  return (
    <header className={cx(styles["nav-wrap"], "on-night")}>
      <nav className={styles.nav} aria-label="Primary">
        <Link className={styles.nav__brand} href="/" aria-label="agentshield, home">
          <Logo height={26} eager />
        </Link>

        <ul className={styles.nav__links}>
          {siteConfig.nav.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} current={pathname === trimSlash(item.href)}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <a
          className={cx("btn", "btn--primary", "btn--sm", styles.nav__cta)}
          href={siteConfig.links.repo}
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>

        <details className={styles.nav__menu} ref={menu}>
          <summary>
            <span>Menu</span>
            <Arrow direction="down" size={14} />
          </summary>
          <ul className={styles.nav__sheet}>
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  current={pathname === trimSlash(item.href)}
                  onNavigate={closeMenu}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <a href={siteConfig.links.repo} target="_blank" rel="noopener" onClick={closeMenu}>
                GitHub
                <Arrow direction="up-right" size={14} />
              </a>
            </li>
          </ul>
        </details>
      </nav>
    </header>
  );
}
