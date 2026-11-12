const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Other"];

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
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      process.env.GEMINI_MODEL + ":generateContent";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const text =
      (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0].text) || "";

    // Only accept an answer from our allowed list. Anything else becomes "Other".
    const match = CATEGORIES.find(function (c) {
      return text.toLowerCase().includes(c.toLowerCase());
    });

    return res.status(200).json({ category: match || "Other" });
  } catch (err) {
    return res.status(200).json({ category: "Other" });
  }
};
