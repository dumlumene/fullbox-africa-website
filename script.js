const orders = document.getElementById("orders");
const weight = document.getElementById("weight");
const storage = document.getElementById("storage");
const ordersOut = document.getElementById("ordersOut");
const weightOut = document.getElementById("weightOut");
const storageOut = document.getElementById("storageOut");
const estimate = document.getElementById("estimate");

function naira(n){ return "₦" + Math.round(n).toLocaleString("en-NG"); }
function updateCalc(){
  const o = Number(orders.value), w = Number(weight.value), s = Number(storage.value);
  ordersOut.textContent = o.toLocaleString();
  weightOut.textContent = w.toFixed(1) + " kg";
  storageOut.textContent = s + " m³";
  // Indicative model only — not a production pricing engine.
  const pickPack = o * (650 + Math.min(w,5)*70);
  const storageCost = s * 25000;
  const carrierAllocation = o * (900 + Math.min(w,5)*90);
  estimate.textContent = naira(pickPack + storageCost + carrierAllocation);
}
[orders,weight,storage].forEach(x=>x.addEventListener("input",updateCalc));
updateCalc();

const menu = document.querySelector(".menu");
const links = document.getElementById("main-navigation");

function setMenu(open) {
  links.toggleAttribute("data-open", open);
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
links.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});

const form = document.getElementById("pilotForm");
const status = document.getElementById("formStatus");
const submit = form.querySelector("button[type=submit]");
let widget;
let challenge = "";

function feedback(message, error = false) {
  status.textContent = message;
  status.toggleAttribute("data-error", error);
}

for (const link of document.querySelectorAll('a[href="#pilot"]')) {
  link.addEventListener("click", () => { form.elements.intent.value = link.dataset.enquiry ?? "pilot"; });
}

function enableAnalytics() {
  window.va = (...args) => { (window.vaq ||= []).push(args); };
  const script = document.createElement("script");
  script.src = "/_vercel/insights/script.js";
  script.defer = true;
  document.head.append(script);
}

async function prepareForm() {
  try {
    const response = await fetch("/api/enquiries", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Configuration unavailable");
    const config = await response.json();
    if (config.analytics === true) enableAnalytics();
    if (config.available !== true || !config.siteKey) {
      feedback("Online enquiries are currently unavailable. Please check back later.", true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.onerror = () => feedback("The spam prevention check could not load. Please refresh and try again.", true);
    script.onload = () => {
      const invalidate = () => { challenge = ""; submit.disabled = true; };
      widget = window.turnstile.render("#lead-challenge", {
        sitekey: config.siteKey, action: "merchant_enquiry",
        size: document.getElementById("lead-challenge").clientWidth < 300 ? "compact" : "flexible",
        callback(token) { challenge = token; submit.disabled = false; if (status.textContent === "Complete the spam prevention check to send your enquiry.") feedback(""); },
        "expired-callback"() { invalidate(); feedback("Complete the spam prevention check again.", true); },
        "error-callback"() { invalidate(); feedback("Could not verify the spam prevention check.", true); }
      });
    };
    document.head.append(script);
    feedback("Complete the spam prevention check to send your enquiry.");
  } catch {
    feedback("Online enquiries are currently unavailable. Please check back later.", true);
  }
}
void prepareForm();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!challenge || submit.disabled) return;
  submit.disabled = true;
  feedback("Sending your enquiry…");
  const payload = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch("/api/enquiries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, challenge }), signal: AbortSignal.timeout(12_000)
    });
    const result = await response.json();
    if (response.status === 201 && result.accepted === true) {
      form.reset();
      feedback(result.message);
      window.va?.("event", { name: "merchant_enquiry_accepted", data: { intent: payload.intent } });
    } else {
      feedback(result.message || "We could not confirm receipt. Please try again.", true);
    }
  } catch {
    feedback("We could not confirm receipt of your enquiry. Please try again.", true);
  } finally {
    challenge = "";
    window.turnstile.reset(widget);
  }
});
