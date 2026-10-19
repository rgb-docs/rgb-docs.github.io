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
    <header style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '5rem 2rem',
      textAlign: 'center',
      color: 'white',
      boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
    }}>
      <div className="container">
        <Heading as="h1" style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          marginBottom: '1rem',
          fontWeight: '900',
          color: 'white',
          textShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          RGB Protocol
        </Heading>
        <p style={{
          fontSize: 'clamp(1.3rem, 3.5vw, 2.2rem)',
          marginBottom: '2rem',
          opacity: 0.95,
          fontWeight: '300'
        }}>
          Smart Contracts for Bitcoin & Lightning
        </p>
        <div style={{
          fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)',
          marginBottom: '2.5rem',
          fontWeight: '500',
          letterSpacing: '0.05em'
        }}>
          Client-side validation • Single-use seals • Two implementations
        </div>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: '2rem'
        }}>
          <Link
            to="/getting-started/introduction"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 2.5rem',
              background: 'white',
              color: '#667eea',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              lineHeight: '1',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}>
            Get Started →
          </Link>
          <Link
            to="/playground"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 2.5rem',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.5)',
              fontSize: '1.1rem',
              fontWeight: '600',
              lineHeight: '1',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}>
            🎮 Try Playground
          </Link>
          <Link
            to="https://github.com/RGB-WG"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 2.5rem',
              background: 'transparent',
              color: 'white',
              border: '2px solid white',
              fontSize: '1.1rem',
              fontWeight: '600',
              lineHeight: '1',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}>
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function StatCard({emoji, number, label}: {emoji: string; number: string; label: string}) {
  const gradients = {
    '⚡': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    '🌍': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    '🔒': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    '💎': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  };

  return (
    <div style={{
      padding: '2rem',
      background: gradients[emoji] || gradients['⚡'],
      borderRadius: '16px',
      color: 'white',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      textAlign: 'center',
      transition: 'transform 0.3s ease'
    }}>
      <div style={{fontSize: '3.5rem', marginBottom: '0.5rem'}}>{emoji}</div>
      <h3 style={{color: 'white', fontSize: '1.8rem', marginBottom: '0.3rem'}}>{number}</h3>
      <p style={{fontSize: '1.1rem', opacity: 0.9, margin: 0}}>{label}</p>
    </div>
  );
}

function StatsSection() {
  return (
    <section style={{
      padding: '3rem 2rem',
      background: '#f8f9fa'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem'
        }}>
          <StatCard emoji="🅰️" number="v0.12" label="RGB-WG · rgb-wallet 0.12.0-rc.3" />
          <StatCard emoji="🅱️" number="v0.11" label="RGB Protocol Association · rgb-cmd 0.11.1" />
          <StatCard emoji="🔒" number="Off-chain state" label="Client-side validation" />
          <StatCard emoji="₿" number="Bitcoin seals" label="Ownership is a UTXO" />
        </div>
      </div>
    </section>
  );
}

function Feature({title, description, link, emoji}: {
  title: string;
  description: string;
  link: string;
  emoji: string;
}) {
  return (
    <div className={clsx('col col--4')}>
      <div style={{
        padding: '1.5rem',
        height: '100%',
        borderRadius: '12px',
        background: 'white',
        border: '1px solid #e0e0e0',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>{emoji}</div>
        <Heading as="h3" style={{marginBottom: '0.8rem'}}>{title}</Heading>
        <p style={{color: '#666', lineHeight: '1.6'}}>{description}</p>
        <Link to={link} style={{
          color: '#667eea',
          fontWeight: '600',
          textDecoration: 'none'
        }}>
          Learn more →
        </Link>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section style={{padding: '4rem 2rem'}}>
      <div className="container">
        <Heading as="h2" style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          marginBottom: '3rem',
          color: '#1a1a1a'
        }}>
          Why RGB Protocol?
        </Heading>
        <div className="row" style={{marginBottom: '2rem'}}>
          <Feature
            emoji="🔐"
            title="Client-Side Validation"
            description="Contract state and history are passed between the parties and validated by each client. Bitcoin only sees a commitment, so state stays private and off-chain."
            link="/core-concepts/client-side-validation"
          />
          <Feature
            emoji="🎯"
            title="Smart Contracts on Bitcoin"
            description="Contracts run on AluVM and are bound to Bitcoin UTXOs through single-use seals, without any change to Bitcoin consensus."
            link="/guides/contracts/schemas"
          />
          <Feature
            emoji="⚡"
            title="Lightning (v0.11 line)"
            description="RGB Lightning Node runs RGB assets in Lightning channels on the v0.11 line. It is alpha and supports regtest and testnet. The v0.12 line has no Lightning implementation yet."
            link="/guides/lightning/overview"
          />
        </div>
        <div className="row">
          <Feature
            emoji="🪙"
            title="Fungible assets"
            description="Issue fixed-supply (NIA) and inflatable (IFA) tokens on the v0.11 line, or fungible tokens from an RGB20 issuer on the v0.12 line."
            link="/guides/rgb20/creating-tokens"
          />
          <Feature
            emoji="🖼️"
            title="Unique assets (UDA)"
            description="One-of-one assets with media attachments, using the UDA schema on the v0.11 line."
            link="/guides/rgb21/creating-nfts"
          />
          <Feature
            emoji="🎮"
            title="Collectible fungible (CFA)"
            description="Fungible assets with collectible metadata, using the CFA schema on the v0.11 line."
            link="/guides/rgb25/overview"
          />
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section style={{
      padding: '4rem 2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      textAlign: 'center'
    }}>
      <div className="container">
        <Heading as="h2" style={{
          fontSize: '2.5rem',
          color: 'white',
          marginBottom: '1.5rem'
        }}>
          Ready to Build on Bitcoin?
        </Heading>
        <p style={{
          fontSize: '1.3rem',
          marginBottom: '2rem',
          opacity: 0.9
        }}>
          Pick a line, install its CLI and issue a test asset on regtest or testnet.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link
            to="/getting-started/installation"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 2.5rem',
              background: 'white',
              color: '#667eea',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              lineHeight: '1',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}>
            Install Now →
          </Link>
          <Link
            to="/getting-started/quick-start"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 2.5rem',
              background: 'transparent',
              color: 'white',
              border: '2px solid white',
              fontSize: '1.1rem',
              fontWeight: '600',
              lineHeight: '1',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}>
            Quick Start Guide
          </Link>
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
      <StatsSection />
      <main>
        <HomepageFeatures />
      </main>
      <CTASection />
    </Layout>
  );
}
