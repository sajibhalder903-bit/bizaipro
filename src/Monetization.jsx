import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Check, Sparkles, TrendingUp, ShieldCheck, Download, Zap, X, ShoppingBag, ExternalLink } from 'lucide-react';

export function AdSlot({ settings, slot, type = 'banner', format = 'auto' }) {
  useEffect(() => {
    if (settings?.adsensePublisherId && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // Ignore adsbygoogle push error
      }
    }
  }, [settings?.adsensePublisherId, slot]);

  // If AdSense is active and configured
  if (settings?.adsensePublisherId && settings?.adsenseEnabled !== false) {
    return (
      <div className={`ad-wrapper ad-${type}`} role="region" aria-label="Sponsored Content">
        <span className="ad-label">Advertisement</span>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', minHeight: type === 'banner' ? '90px' : type === 'sidebar' ? '250px' : '100px' }}
          data-ad-client={settings.adsensePublisherId}
          data-ad-slot={slot || ''}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // High-Yield Fallback Promo Banners when AdSense is pending or awaiting approval
  if (type === 'sidebar') {
    return (
      <div className="ad-fallback-card sidebar-promo">
        <span className="promo-badge">HOT DEAL</span>
        <h4>Scale with High-Speed Cloud Hosting</h4>
        <p>Run your AI apps, WordPress sites & tools on Hostinger with 78% OFF + Free Domain.</p>
        <a
          href={settings?.affiliateHostingerUrl || 'https://hostinger.com?REFERRALCODE=BIZAIPRO'}
          target="_blank"
          rel="noopener noreferrer"
          className="button small"
        >
          Claim 78% Discount <ArrowUpRight size={15} />
        </a>
      </div>
    );
  }

  return (
    <div className={`ad-fallback-card ${type}-promo`}>
      <div className="promo-inner">
        <div>
          <span className="promo-badge">RECOMMENDED FOR BUSINESSES</span>
          <h4>Supercharge Your Business Workflows with Make.com & AI</h4>
          <p>Connect your CRM, ads, and customer service into autonomous 24/7 automated pipelines.</p>
        </div>
        <a
          href={settings?.affiliateMakeUrl || 'https://www.make.com/en/register?pc=bizaipro'}
          target="_blank"
          rel="noopener noreferrer"
          className="button small light"
        >
          Try Free Automation <ArrowUpRight size={15} />
        </a>
      </div>
    </div>
  );
}

export function AuditFunnelBanner({ onOpenModal }) {
  return (
    <div className="audit-funnel-card">
      <div className="audit-left">
        <span className="audit-pill"><TrendingUp size={14} /> SCALE YOUR RESULTS</span>
        <h3>Want to turn these numbers into real revenue?</h3>
        <p>Get a personalized 1-on-1 Growth Audit & AI Automation roadmap for your ad spend and business workflows.</p>
        <div className="audit-features">
          <span><Check size={14} /> Ad Spend & ROAS Deep-Dive</span>
          <span><Check size={14} /> Automated AI Lead Pipeline</span>
          <span><Check size={14} /> 100% Free · No Obligation</span>
        </div>
      </div>
      <div className="audit-right">
        <button className="button audit-btn" onClick={onOpenModal}>
          Claim Free Growth Audit <ArrowUpRight size={18} />
        </button>
        <small className="audit-note">🔥 4 spots available this week</small>
      </div>
    </div>
  );
}

export function GrowthAuditModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ name: '', email: '', website: '', budget: '$1,000 - $5,000', notes: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ ok: false, msg: '' });

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus({ ok: false, msg: '' });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'growth-audit-modal' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      setStatus({ ok: true, msg: data.message });
      setFormData({ name: '', email: '', website: '', budget: '$1,000 - $5,000', notes: '' });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        {status.ok ? (
          <div className="modal-success">
            <span className="success-icon"><Check size={32} /></span>
            <h3>Application Received!</h3>
            <p>{status.msg}</p>
            <button className="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <span className="eyebrow"><Sparkles size={14} /> HIGH-CONVERSION ENGINE</span>
              <h2>Claim Your Free Business AI & Growth Audit</h2>
              <p>Tell us about your business. We will analyze your campaigns, find leakages, and outline a tailored scaling blueprint.</p>
            </div>
            <form onSubmit={handleSubmit} className="audit-form">
              {status.msg && <p className="form-error">{status.msg}</p>}
              <div className="form-row">
                <label>
                  Full Name
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>
                <label>
                  Work Email *
                  <input
                    type="email"
                    required
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Website / Brand URL
                  <input
                    type="text"
                    placeholder="https://yourbrand.com"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                  />
                </label>
                <label>
                  Monthly Ad Spend / Budget
                  <select
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                  >
                    <option value="Under $1,000">Under $1,000 / mo</option>
                    <option value="$1,000 - $5,000">$1,000 - $5,000 / mo</option>
                    <option value="$5,000 - $20,000">$5,000 - $20,000 / mo</option>
                    <option value="$20,000+">$20,000+ / mo</option>
                  </select>
                </label>
              </div>
              <label>
                What is your biggest bottleneck right now? (Optional)
                <textarea
                  rows={3}
                  placeholder="e.g. Scaling Meta Ads ROAS, automating lead follow-up, content creation..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="button" disabled={loading}>
                  {loading ? 'Submitting Application…' : 'Get My Free Audit Now'} <ArrowUpRight size={17} />
                </button>
                <span className="privacy-promise"><ShieldCheck size={14} /> Strict privacy. No spam guaranteed.</span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function DigitalProductsSection({ onOpenAudit }) {
  const products = [
    {
      id: 'viral-reels',
      title: 'Premiere Viral Reels & Short-Form Workstation',
      badge: 'BESTSELLER',
      price: '$29',
      originalPrice: '$97',
      desc: 'Complete production workstation for Premiere Pro & CapCut. Includes 150+ proven video hooks, sound effects library, dynamic LUTs, and animated caption presets.',
      features: ['150+ High-Retention Video Hooks', 'Professional SFX & Transition Sound Pack', 'Premiere Pro & After Effects Project Files', 'Lifetime Updates & Commercial License'],
      action: 'Instant Download',
      link: '/contact/?item=viral-reels'
    },
    {
      id: 'ai-blueprint',
      title: 'Ultimate Business AI & Meta Ads Blueprint',
      badge: 'TOP VALUE',
      price: '$19',
      originalPrice: '$49',
      desc: 'Tested prompt frameworks and automated workflows for scaling Meta Ads, generating high-converting sales copy, and building autonomous customer engagement pipelines.',
      features: ['200+ Plug & Play Marketing Prompts', 'Full Meta Ads Scaling SOP', 'Make.com & Zapier JSON Workflows', 'PDF & Notion Workspace Included'],
      action: 'Instant Download',
      link: '/contact/?item=ai-blueprint'
    },
    {
      id: 'enterprise-growth',
      title: 'Custom AI Automation & ROAS Scaling Audit',
      badge: 'HIGH IMPACT',
      price: 'Free',
      originalPrice: '$500',
      desc: 'Done-for-you technical review and strategic implementation roadmap by our seasoned performance marketers and automation engineers.',
      features: ['Full Ad Account & ROAS Review', 'Custom Automation Architecture Plan', '30-Minute 1-on-1 Video Consultation', 'Tailored Action Checklist'],
      action: 'Book Free Audit',
      isAudit: true
    }
  ];

  return (
    <section className="container section products-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><ShoppingBag size={15} /> DIGITAL ASSETS & GROWTH TOOLS</span>
          <h2>Assets Built to Accelerate Your Profits</h2>
          <p>Battle-tested templates, workstations, and high-impact resources designed for high ROI.</p>
        </div>
      </div>
      <div className="products-grid">
        {products.map(p => (
          <div className="product-card" key={p.id}>
            {p.badge && <span className="product-badge">{p.badge}</span>}
            <h3>{p.title}</h3>
            <div className="product-pricing">
              <span className="current-price">{p.price}</span>
              {p.originalPrice && <span className="old-price">{p.originalPrice}</span>}
            </div>
            <p className="product-desc">{p.desc}</p>
            <ul className="product-features">
              {p.features.map(f => (
                <li key={f}><Check size={14} className="feature-check" /> {f}</li>
              ))}
            </ul>
            {p.isAudit ? (
              <button className="button full-width" onClick={onOpenAudit}>
                Claim Free Audit <ArrowUpRight size={17} />
              </button>
            ) : (
              <a href={p.link} className="button dark full-width">
                <Download size={16} /> {p.action}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
