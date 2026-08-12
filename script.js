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

document.getElementById("pilotForm").addEventListener("submit", e=>{
  e.preventDefault();
  const status = document.getElementById("formStatus");
  status.textContent = "Thanks — your pilot request has been captured in this demo. Connect this form to HubSpot/Apollo before launch.";
  e.target.reset();
});

document.querySelector(".menu").addEventListener("click", ()=>{
  const links=document.querySelector(".nav-links");
  links.style.display = links.style.display==="flex" ? "" : "flex";
  if(links.style.display==="flex"){
    links.style.position="absolute";
    links.style.top="76px";
    links.style.left="0";
    links.style.right="0";
    links.style.padding="20px";
    links.style.background="#f5f7f4";
    links.style.flexDirection="column";
    links.style.borderBottom="1px solid #dfe5df";
  }
});