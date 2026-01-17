import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import EncodingPlayground from '@site/src/components/Playground/EncodingPlayground';

export default function Playground(): ReactNode {
  return (
    <Layout
      title="Interactive Playground"
      description="Try RGB Protocol features interactively - encode/decode, create contracts, and more">

      {/* Hero Section */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '3rem 2rem',
        textAlign: 'center',
        color: 'white'
      }}>
        <div className="container">
          <Heading as="h1" style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            marginBottom: '1rem',
            color: 'white',
            fontWeight: '900'
          }}>
            🎮 RGB Playground
          </Heading>
          <p style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            opacity: 0.95,
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            Try RGB Protocol features interactively in your browser. No installation required!
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <section style={{
          padding: '3rem 2rem',
          background: '#f8f9fa'
        }}>
          <div className="container">
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '3rem',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <Heading as="h2" style={{
                fontSize: '1.8rem',
                marginBottom: '1rem',
                color: '#1a1a1a'
              }}>
                📝 Encoding Tools
              </Heading>
              <p style={{
                color: '#666',
                fontSize: '1.05rem',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                Work with RGB's encoding formats: BAID64, hex conversions, commitment hashes, and invoice parsing.
                All processing happens in your browser - your data never leaves your device.
              </p>

              <EncodingPlayground />
            </div>

            {/* Coming Soon Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem'
            }}>
              <ComingSoonCard
                emoji="🏗️"
                title="Contract Builder"
                description="Create RGB20 tokens, RGB21 NFTs, and RGB25 collectibles with an interactive visual builder."
              />
              <ComingSoonCard
                emoji="🔄"
                title="Transfer Simulator"
                description="Visualize state transitions, seal operations, and transaction bundles in real-time."
              />
              <ComingSoonCard
                emoji="📦"
                title="Consignment Inspector"
                description="Upload and inspect RGB consignments, view state history, and validate proofs."
              />
              <ComingSoonCard
                emoji="⚙️"
                title="AluVM Debugger"
                description="Write and debug AluVM bytecode with step-by-step execution visualization."
              />
            </div>
          </div>
        </section>

        {/* Features Info */}
        <section style={{
          padding: '3rem 2rem',
          background: 'white'
        }}>
          <div className="container" style={{maxWidth: '800px'}}>
            <Heading as="h2" style={{
              textAlign: 'center',
              fontSize: '2rem',
              marginBottom: '2rem',
              color: '#1a1a1a'
            }}>
              Why Use the Playground?
            </Heading>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              <FeatureRow
                emoji="🚀"
                title="Learn by Doing"
                description="Understand RGB concepts through hands-on experimentation with real encoding and validation."
              />
              <FeatureRow
                emoji="🔒"
                title="100% Client-Side"
                description="All processing happens in your browser. Your data is never sent to any server."
              />
              <FeatureRow
                emoji="⚡"
                title="Instant Feedback"
                description="See results immediately as you type. No waiting, no setup, no compilation."
              />
              <FeatureRow
                emoji="🎯"
                title="Real Implementations"
                description="Uses the same algorithms as production RGB libraries for accurate results."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '3rem 2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <div className="container">
            <Heading as="h2" style={{
              fontSize: '2rem',
              color: 'white',
              marginBottom: '1rem'
            }}>
              Ready to Build for Real?
            </Heading>
            <p style={{
              fontSize: '1.2rem',
              marginBottom: '2rem',
              opacity: 0.9
            }}>
              Install RGB and start building production applications
            </p>
            <a
              href="/getting-started/installation"
              style={{
                display: 'inline-block',
                padding: '1rem 2.5rem',
                background: 'white',
                color: '#667eea',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                borderRadius: '8px',
                textDecoration: 'none'
              }}>
              Get Started →
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
}

function ComingSoonCard({emoji, title, description}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e0e0e0',
      padding: '1.5rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        background: '#fbbf24',
        color: '#78350f',
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0.25rem 0.75rem',
        borderRadius: '12px'
      }}>
        COMING SOON
      </div>
      <div style={{fontSize: '2.5rem', marginBottom: '0.75rem'}}>{emoji}</div>
      <h3 style={{fontSize: '1.2rem', marginBottom: '0.5rem', color: '#1a1a1a'}}>
        {title}
      </h3>
      <p style={{color: '#666', lineHeight: '1.5', margin: 0}}>
        {description}
      </p>
    </div>
  );
}

function FeatureRow({emoji, title, description}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start'
    }}>
      <div style={{
        fontSize: '2rem',
        flexShrink: 0
      }}>
        {emoji}
      </div>
      <div>
        <h3 style={{
          fontSize: '1.2rem',
          marginBottom: '0.5rem',
          color: '#1a1a1a'
        }}>
          {title}
        </h3>
        <p style={{
          color: '#666',
          lineHeight: '1.6',
          margin: 0
        }}>
          {description}
        </p>
      </div>
    </div>
  );
}
