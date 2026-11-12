const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Other"];

// If one model is busy or missing, try the next one
const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"];

async function askGemini(model, prompt) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model + ":generateContent";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = await response.json();
  console.log(model, "status:", response.status);
  return { status: response.status, data: data };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const note = String((req.body && req.body.note) || "").slice(0, 100);
  if (!note) {
    return res.status(400).json({ category: "Other" });
  }

  const prompt =
    "Classify this expense into exactly one of these categories: " +
    CATEGORIES.join(", ") +
    ". Reply with only the category name, nothing else.\nExpense: " + note;

  try {
    for (const model of MODELS) {
      const result = await askGemini(model, prompt);

      if (result.status === 200) {
        const d = result.data;
        const text =
          (d.candidates &&
            d.candidates[0] &&
            d.candidates[0].content &&
            d.candidates[0].content.parts &&
            d.candidates[0].content.parts[0].text) || "";

        const match = CATEGORIES.find(function (c) {
          return text.toLowerCase().includes(c.toLowerCase());
        });
        return res.status(200).json({ category: match || "Other" });
      }

      // Busy (503), rate-limited (429) or model not found (404): try the next model
      console.log("Trying next model. Reply:", JSON.stringify(result.data).slice(0, 300));
    }
  } catch (err) {
    console.error("Function error:", String(err));
  }

  return res.status(200).json({ category: "Other" });
};
