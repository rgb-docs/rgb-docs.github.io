import type {ReactNode} from 'react';
import {useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import EncodingPlayground from '@site/src/components/Playground/EncodingPlayground';
import ContractBuilder from '@site/src/components/Playground/ContractBuilder';
import TransferSimulator from '@site/src/components/Playground/TransferSimulator';
import ConsignmentInspector from '@site/src/components/Playground/ConsignmentInspector';

type Module = 'encoding' | 'contracts' | 'transfers' | 'consignments';

export default function Playground(): ReactNode {
  return (
    <Layout
      title="Interactive Playground"
      description="Browser tools for RGB: Baid64 ids for both RGB lines, tagged hashes, invoice parsing, and illustrative contract and transfer diagrams">

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
            Encode and decode RGB ids, hashes and invoices for both RGB lines (v0.11 and v0.12) in your browser.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <PlaygroundModules />

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
                description="Decode real ids and invoices from both RGB lines and see how their parts fit together."
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
                title="Checked against the real code"
                description="The Baid64 and tagged-hash tools are ports of the baid64 0.4.x and commit_verify code, and reproduce real ids from rgb-cmd 0.11.1 and rgb-wallet 0.12.0-rc.3. The contract builder and the consignment diagram are illustrative only."
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
              Explore RGB implementations and start building on testnet
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

function PlaygroundModules() {
  const [activeModule, setActiveModule] = useState<Module>('encoding');

  return (
    <section style={{
      padding: '3rem 2rem',
      background: '#f8f9fa'
    }}>
      <div className="container">
        {/* Module Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e0e0e0',
          flexWrap: 'wrap',
          overflowX: 'auto'
        }}>
          <ModuleTab
            active={activeModule === 'encoding'}
            onClick={() => setActiveModule('encoding')}
            emoji="📝"
            label="Encodings"
          />
          <ModuleTab
            active={activeModule === 'contracts'}
            onClick={() => setActiveModule('contracts')}
            emoji="🏗️"
            label="Contract Builder"
          />
          <ModuleTab
            active={activeModule === 'transfers'}
            onClick={() => setActiveModule('transfers')}
            emoji="🔄"
            label="Transfer Simulator"
          />
          <ModuleTab
            active={activeModule === 'consignments'}
            onClick={() => setActiveModule('consignments')}
            emoji="📦"
            label="Consignments"
          />
        </div>

        {/* Module Content */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          {activeModule === 'encoding' && (
            <>
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
                Baid64 ids in the formats of both RGB lines (rgb: for v0.11, contract: for v0.12), tagged SHA-256, and an invoice parser.
              </p>
              <EncodingPlayground />
            </>
          )}

          {activeModule === 'contracts' && (
            <>
              <Heading as="h2" style={{
                fontSize: '1.8rem',
                marginBottom: '1rem',
                color: '#1a1a1a'
              }}>
                🏗️ Contract Builder
              </Heading>
              <p style={{
                color: '#666',
                fontSize: '1.05rem',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                See which fields a fungible token, an NFT (UDA) or a collectible (CFA) has. Illustrative only: it does not create a real contract.
              </p>
              <ContractBuilder />
            </>
          )}

          {activeModule === 'transfers' && (
            <>
              <Heading as="h2" style={{
                fontSize: '1.8rem',
                marginBottom: '1rem',
                color: '#1a1a1a'
              }}>
                🔄 Transfer Simulator
              </Heading>
              <p style={{
                color: '#666',
                fontSize: '1.05rem',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                A simplified picture of how a transfer moves state from one seal to others. Illustrative only.
              </p>
              <TransferSimulator />
            </>
          )}

          {activeModule === 'consignments' && (
            <>
              <Heading as="h2" style={{
                fontSize: '1.8rem',
                marginBottom: '1rem',
                color: '#1a1a1a'
              }}>
                📦 Consignments
              </Heading>
              <p style={{
                color: '#666',
                fontSize: '1.05rem',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                Identify an RGB file from its header, and see what a transfer consignment proves.
              </p>
              <ConsignmentInspector />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ModuleTab({active, onClick, emoji, label}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1.5rem',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '3px solid #667eea' : '3px solid transparent',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: active ? '600' : '500',
        color: active ? '#667eea' : '#666',
        transition: 'all 0.2s ease',
        position: 'relative',
        bottom: '-2px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#667eea';
          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#666';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
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
