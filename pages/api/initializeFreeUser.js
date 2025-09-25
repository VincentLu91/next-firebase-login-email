import { supabase } from "../../utils/initSupabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, email } = req.body;
    if (!id || !email) {
      return res.status(400).json({ error: "id and email are required" });
    }

    // First check if a customer record already exists
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .single();

    if (existingCustomer) {
      return res.status(200).json({ message: "Customer already initialized" });
    }

    // If no customer record exists, create one with free tokens
    const { error } = await supabase.from("customers").insert([
      {
        id: id,
        email_address: email,
        mic_tokens: 0, // otherwise 2000, but should be no credits - indie hacking
        call_tokens: 0, // otherwise 2000, but should be no credits - indie hacking
        num_calls: 0, // otherwise 2000, but should be no credits - indie hacking
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Error creating customer record:", error);
      return res
        .status(500)
        .json({ error: "Failed to create customer record" });
    }

    return res
      .status(200)
      .json({ message: "Free user initialized successfully" });
  } catch (err) {
    console.error("Error initializing free user:", err);
    return res.status(500).json({ error: "Error initializing free user" });
  }
}
