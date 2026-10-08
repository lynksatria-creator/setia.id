import { useEffect, useState } from 'react';
import { billingApi } from '../lib/api';

export default function Pricing({ plans, onChoose }) {
  const [livePlans, setLivePlans] = useState(null);

  useEffect(() => {
    let active = true;
    billingApi.getConfig()
      .then((config) => { if (active && config.plans?.length) setLivePlans(config.plans); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const displayedPlans = livePlans || plans;

  return (
    <section id="pricing" className="section-wrap muted-bg invitation-pricing-section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Paket & pricing</p>
          <h2>Pilih paket yang sesuai kebutuhan acara Anda</h2>
        </div>
        <div className="pricing-grid">
          {displayedPlans.map((plan) => (
            <article key={plan.id || plan.name} className={`price-card ${plan.highlight || plan.id === 'premium' ? 'featured-price' : ''}`}>
              <h3>{plan.name}</h3>
              <strong>{typeof plan.price === 'number' ? `Rp ${plan.price.toLocaleString('id-ID')}` : plan.price}</strong>
              {plan.duration_days ? <p className="pricing-plan-term">{plan.duration_days} hari aktif · maks. {plan.max_invitations} undangan · link {plan.slug_mode === 'custom' ? 'pilihan' : 'otomatis'}</p> : null}
              <ul>{(Array.isArray(plan.features) ? plan.features : []).map((item) => <li key={item}>{item}</li>)}</ul>
              <button onClick={onChoose}>Pilih Paket</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
