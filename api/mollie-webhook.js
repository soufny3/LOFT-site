// api/mollie-webhook.js
// Mollie POST l'id du paiement ici après chaque changement de statut.
// Pour l'instant on répond simplement 200. Étape suivante (quand tu veux) :
// vérifier le statut via l'API Mollie, puis enregistrer la résa (Supabase)
// et envoyer l'email de confirmation (Brevo).
export default async function handler(req, res) {
  // const paymentId = req.body?.id;
  return res.status(200).send('ok');
}
