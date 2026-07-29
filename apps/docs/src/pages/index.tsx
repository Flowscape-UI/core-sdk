import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import UiBadge from '@site/src/components/UiBadge';

import styles from './index.module.css';
import FlowscapeEditor from '../components/FlowscapeEditor';
import Layout from '@theme/Layout';

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroBackground} />

      <div className="container">
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <UiBadge as="div" className={clsx(styles.heroBadge, styles.reveal, styles.revealDelay1)}>
              Framework-agnostic 2D engine
            </UiBadge>

            <Heading as="h1" className={clsx(styles.heroTitle, styles.reveal, styles.revealDelay2)}>
              Build powerful editors with{' '}
              <span className={styles.gradientText}>Flowscape</span>
            </Heading>

            <p className={clsx(styles.heroSubtitle, styles.reveal, styles.revealDelay3)}>
              A modern 2D engine for infinite canvas apps, visual builders,
              whiteboards and editor-like tools.
            </p>

            <div className={clsx(styles.buttons, styles.reveal, styles.revealDelay4)}>
              <Link
                className={clsx('button button--lg', styles.primaryButton)}
                to="/intro">
                Get Started
              </Link>

              <Link
                className={clsx('button button--lg', styles.secondaryButton)}
                to="/intro">
                Explore Docs
              </Link>
            </div>

            <div className={clsx(styles.heroMeta, styles.reveal, styles.revealDelay5)}>
              <span>TypeScript-first</span>
              <span>Engine architecture</span>
              <span>Infinite canvas</span>
            </div>
          </div>

          <div className={clsx(styles.heroPreview, styles.reveal, styles.revealDelay4)}>
            <FlowscapeEditor
              className={styles.heroEditor}
              height="clamp(300px, 38vw, 500px)"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
