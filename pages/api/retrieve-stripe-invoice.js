const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  console.log("invoice request body is: ", req.body);
  const { invoice_id } = req.body;
  try {
    // https://stripe.com/docs/api/invoices/retrieve
    const invoice = await stripe.invoices.retrieve(invoice_id);
    console.log("invoice in api is: ", invoice);
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error });
  }
}
