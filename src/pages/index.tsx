import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/getting-started/introduction">
            Get Started with RGB v0.12
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({title, description, link}: {
  title: string;
  description: string;
  link: string;
}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md padding-vert--lg">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <Link to={link}>Learn more →</Link>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className="padding-vert--xl">
      <div className="container">
        <div className="row">
          <Feature
            title="Client-Side Validation"
            description="RGB uses a revolutionary approach where validation happens on the client side, not on the blockchain. This ensures privacy, scalability, and efficiency."
            link="/core-concepts/client-side-validation"
          />
          <Feature
            title="Smart Contracts on Bitcoin"
            description="Build complex, Turing-complete smart contracts on Bitcoin using AluVM and the RGB protocol, without modifying the Bitcoin consensus layer."
            link="/guides/contracts/schemas"
          />
          <Feature
            title="Lightning Network Ready"
            description="RGB integrates seamlessly with the Lightning Network, enabling instant, low-cost transfers of RGB assets across payment channels."
            link="/guides/lightning/overview"
          />
        </div>
        <div className="row margin-top--lg">
          <Feature
            title="Fungible Assets (RGB20)"
            description="Create and manage fungible tokens like stablecoins, utility tokens, and securities on Bitcoin with the RGB20 interface."
            link="/guides/rgb20/creating-tokens"
          />
          <Feature
            title="NFTs (RGB21)"
            description="Issue non-fungible tokens with metadata attachments for digital art, collectibles, and unique digital assets using RGB21."
            link="/guides/rgb21/creating-nfts"
          />
          <Feature
            title="Zero-Knowledge Ready"
            description="RGB v0.12 is designed for zk-STARK integration, enabling future zero-knowledge proof compression for ultimate privacy and scalability."
            link="/core-concepts/overview"
          />
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
