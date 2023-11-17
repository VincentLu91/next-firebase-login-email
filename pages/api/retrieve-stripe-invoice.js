const stripe = require("stripe")(
  "sk_test_51Jx1cdLBlaDAR7THINnFtmhlbxt3oaeehIMdTtpTitqJtX5eTtBenCXEF1bnHUN8xvpzUSAxgFhut1BfRu1bZljo00F6QMtxgc",
  { apiVersion: "2023-10-16" }
);

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
