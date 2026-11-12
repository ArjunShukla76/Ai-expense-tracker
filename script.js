const RULES = {
  Food: ["swiggy", "zomato", "restaurant", "cafe", "pizza", "burger", "grocery", "blinkit", "zepto", "tea", "coffee", "lunch", "dinner", "breakfast"],
  Travel: ["uber", "ola", "rapido", "petrol", "diesel", "metro", "bus", "train", "irctc", "flight", "cab", "auto"],
  Shopping: ["amazon", "flipkart", "myntra", "shirt", "shoes", "mall", "clothes"],
  Bills: ["recharge", "electricity", "wifi", "rent", "jio", "airtel", "bill"],
  Entertainment: ["movie", "netflix", "spotify", "game", "pvr", "concert"]
};

let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
let chart = null;

// Step A: try simple keyword rules first (fast and free)
function categorizeByRules(note) {
  const text = note.toLowerCase();
  for (const category in RULES) {
    if (RULES[category].some(function (word) { return text.includes(word); })) {
      return category;
    }
  }
  return null;
}

// Step B: if no rule matched, ask our serverless function (which calls the AI)
async function categorizeWithAI(note) {
  try {
    const res = await fetch("/api/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note })
    });
    const data = await res.json();
    return data.category || "Other";
  } catch (err) {
    return "Other"; // if the AI fails, the app still works
  }
}

function save() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

function formatINR(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function render() {
  // list
  const list = document.getElementById("list");
  list.innerHTML = "";
  expenses.forEach(function (e) {
    const li = document.createElement("li");
    const left = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = e.note;
    const meta = document.createElement("small");
    meta.textContent = e.date + (e.source === "ai" ? " · categorized by AI" : "");
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = e.category;
    const amt = document.createElement("span");
    amt.textContent = " " + formatINR(e.amount);
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "Delete";
    del.addEventListener("click", function () {
      expenses = expenses.filter(function (x) { return x.id !== e.id; });
      save();
      render();
    });
    right.appendChild(badge);
    right.appendChild(amt);
    right.appendChild(del);

    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });

  // totals per category
  const totals = {};
  let grand = 0;
  expenses.forEach(function (e) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
    grand += e.amount;
  });
  document.getElementById("total").textContent = "Total: " + formatINR(grand);

  // chart
  if (chart) { chart.destroy(); }
  chart = new Chart(document.getElementById("chart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(totals),
      datasets: [{ data: Object.values(totals) }]
    }
  });
}

async function addExpense() {
  const noteEl = document.getElementById("note");
  const amountEl = document.getElementById("amount");
  const status = document.getElementById("status");
  const button = document.getElementById("add");

  const note = noteEl.value.trim();
  const amount = Number(amountEl.value);

  if (!note || amount <= 0) {
    status.textContent = "Please enter a description and a positive amount.";
    return;
  }

  button.disabled = true;
  let category = categorizeByRules(note);
  let source = "rules";

  if (!category) {
    status.textContent = "No keyword matched. Asking AI...";
    category = await categorizeWithAI(note);
    source = "ai";
  }

  expenses.unshift({
    id: Date.now(),
    note: note,
    amount: amount,
    category: category,
    source: source,
    date: new Date().toLocaleDateString("en-IN")
  });

  save();
  render();
  noteEl.value = "";
  amountEl.value = "";
  status.textContent = "Added under " + category + ".";
  button.disabled = false;
}

document.getElementById("add").addEventListener("click", addExpense);
render();
