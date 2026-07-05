// api/create-payment.js
// Route serverless Vercel — crée un paiement Mollie et renvoie l'URL de checkout.
//
//   npm i @mollie/api-client
//   Vercel → Env : MOLLIE_API_KEY = live_xxx (ou test_xxx) · BASE_URL = https://loft.brussels
//
// Le site POST sur /api/create-payment avec :
//   { space, date, email, quantity, start, end }
//   - coworking : quantity = nb de places
//   - reunion   : start / end = heures (ex. 9 et 12)

import { createMollieClient } from '@mollie/api-client';
const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

// Source de vérité des prix — JAMAIS le montant envoyé par le client.
const PRICES = {
  coworking: { day: 18 },
  reunion:   { hour: 25, halfday: 60, day: 120 },
};
const OPEN_FROM = 8, OPEN_TO = 22;

function computeReunion(start, end) {
  const s = parseInt(start, 10), e = parseInt(end, 10);
  if (isNaN(s) || isNaN(e) || e <= s) return null;
  if (s < OPEN_FROM || e > OPEN_TO) return null;     // hors heures d'ouverture
  const h = e - s;
  if (h >= 8) return { total: PRICES.reunion.day,     label: 'journée' };
  if (h >= 4) return { total: PRICES.reunion.halfday, label: 'demi-journée' };
  return { total: h * PRICES.reunion.hour, label: h + 'h' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { space, date, email, quantity, start, end } = req.body || {};
    if (!space || !date || !email) return res.status(400).json({ error: 'Champs manquants.' });

    let total, desc;
    if (space === 'coworking') {
      const q = Math.max(1, parseInt(quantity, 10) || 1);
      total = PRICES.coworking.day * q;
      desc = `Loft — Coworking · ${date} · ${q} place(s)`;
    } else if (space === 'reunion') {
      const r = computeReunion(start, end);
      if (!r) return res.status(400).json({ error: 'Créneau invalide.' });
      total = r.total;
      desc = `Loft — Salle de réunion · ${date} · ${String(start).padStart(2,'0')}h–${String(end).padStart(2,'0')}h (${r.label})`;
    } else {
      return res.status(400).json({ error: 'Espace non payable en ligne.' });
    }
    if (!(total > 0)) return res.status(400).json({ error: 'Montant invalide.' });

    const base = process.env.BASE_URL || `https://${req.headers.host}`;
    const payment = await mollie.payments.create({
      amount: { currency: 'EUR', value: total.toFixed(2) },
      description: desc,
      redirectUrl: `${base}/merci`,
      webhookUrl:  `${base}/api/mollie-webhook`,
      metadata: { space, date, email, quantity: quantity || 1, start: start ?? null, end: end ?? null },
    });

    return res.status(200).json({ checkoutUrl: payment.getCheckoutUrl() });
  } catch (err) {
    console.error('Mollie error:', err);
    return res.status(500).json({ error: 'Paiement indisponible pour le moment.' });
  }
}
