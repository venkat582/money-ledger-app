const savedUser = localStorage.getItem("ledgerUser");

if (savedUser) {
  user = JSON.parse(savedUser);
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";
  loadLoans();
}


let user = null;
let currentView = "ACTIVE"; // ACTIVE | HISTORY
let editId = null;


/* ================= DATE & INTEREST ================= */

function todayDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}


function calculateInterestWithDuration(amount, startDate, endDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  // Fix negative days
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Fix negative months
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) years = months = days = 0;

  // Interest calculation
  const totalMonths = years * 12 + months;
  const monthlyInterest = (amount * 2) / 100; // village rule
  const dailyInterest = monthlyInterest / 30;

  const interest =
    (totalMonths * monthlyInterest) +
    (days * dailyInterest);

  return {
    interest: Math.round(interest),
    duration: `${years}Y ${months}M ${days}D`
  };
}


/* ================= LOGIN ================= */

async function login() {
  const name = document.getElementById("name").value.trim();
  const mobile = document.getElementById("mobile").value.trim();

  if (!name || !mobile) {
    alert("Enter name and mobile");
    return;
  }

  const res = await fetch("https://money-ledger-app.onrender.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mobile })
  });

  user = await res.json();
localStorage.setItem("ledgerUser", JSON.stringify(user));


  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";

  loadLoans();
}

/* ================= ADD / UPDATE ================= */

async function addLoan() {
  const personName = document.getElementById("personName").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const givenDate = document.getElementById("givenDate").value;
  const type = document.getElementById("type").value;

  if (!personName || !amount || !givenDate) {
    alert("Fill all fields");
    return;
  }

  const body = {
    userId: user._id,
    personName,
    amount,
    givenDate,
    type
  };

  const url = editId ? `https://money-ledger-app.onrender.com/api/loans/${editId}` : "/api/loans/add";
  const method = editId ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  editId = null;
  document.getElementById("saveBtn").innerText = "Save";
  document.getElementById("personName").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("givenDate").value = "";
  document.getElementById("type").value = "LEND";

  loadLoans();
}

/* ================= LOAD ================= */

async function loadLoans() {
  const res = await fetch(`https://money-ledger-app.onrender.com/api/loans/${user._id}`);
  const loans = await res.json();
  window.allLoans = loans;

  if (currentView === "HISTORY") {
    renderHistory(loans);
  } else {
    renderActive(loans.filter(l => !l.isClosed));
  }
}

/* ================= TABLE RENDER ================= */

function renderActive(loans) {
  let html = `
    <div style="margin-bottom:10px;font-weight:bold">
      Today Date: ${todayDate()}
      <button onclick="showHistory()" style="float:right">History</button>
    </div>
  `;

  let gAmt = 0, gInt = 0, tAmt = 0, tInt = 0;

  const given = loans.filter(l => l.type === "LEND");
  const taken = loans.filter(l => l.type === "BORROW");

  // ===== GIVEN TABLE =====
  html += `
    <h3 style="color:green">GIVEN (LEND)</h3>
    <table border="1" width="100%">
      <tr>
        <th>Name</th><th>Date</th><th>Amount</th>
        <th>Duration</th><th>Interest</th><th>Total</th><th>Action</th>
      </tr>
  `;

given.forEach(l => {
  const calc = calculateInterestWithDuration(l.amount, l.givenDate);

  gAmt += l.amount;
  gInt += calc.interest;

  html += `
    <tr>
      <td>${l.personName}</td>
      <td>${formatDate(l.givenDate)}</td>
      <td>+₹${l.amount.toLocaleString("en-IN")}</td>
      <td>${calc.duration}</td>
      <td>+₹${calc.interest.toLocaleString("en-IN")}</td>
      <td>+₹${(l.amount + calc.interest).toLocaleString("en-IN")}</td>
      <td>
        <button onclick="editLoan('${l._id}')">Edit</button>
        <button onclick="closeLoan('${l._id}')">Close</button>
      </td>
    </tr>
  `;
});

  html += `
    <tr style="font-weight:bold;background:#eaffea">
      <td colspan="2">TOTAL</td>
      <td>+₹${gAmt.toLocaleString("en-IN")}</td>
      <td></td>
      <td>+₹${gInt.toLocaleString("en-IN")}</td>
      <td>+₹${(gAmt + gInt).toLocaleString("en-IN")}</td>
      <td></td>
    </tr>
    </table>
  `;

  // ===== BORROWED TABLE =====
  html += `
    <h3 style="color:red;margin-top:20px">BORROWED</h3>
    <table border="1" width="100%">
      <tr>
        <th>Name</th><th>Date</th><th>Amount</th>
        <th>Duration</th><th>Interest</th><th>Total</th><th>Action</th>
      </tr>
  `;

taken.forEach(l => {
  const calc = calculateInterestWithDuration(l.amount, l.givenDate);

  tAmt += l.amount;
  tInt += calc.interest;

  html += `
    <tr style="color:red">
      <td>${l.personName}</td>
      <td>${formatDate(l.givenDate)}</td>
      <td>-₹${l.amount.toLocaleString("en-IN")}</td>
      <td>${calc.duration}</td>
      <td>-₹${calc.interest.toLocaleString("en-IN")}</td>
      <td>-₹${(l.amount + calc.interest).toLocaleString("en-IN")}</td>
      <td>
        <button onclick="editLoan('${l._id}')">Edit</button>
        <button onclick="closeLoan('${l._id}')">Close</button>
      </td>
    </tr>
  `;
});


  html += `
    <tr style="font-weight:bold;background:#ffecec;color:red">
      <td colspan="2">TOTAL</td>
      <td>-₹${tAmt.toLocaleString("en-IN")}</td>
      <td></td>
      <td>-₹${tInt.toLocaleString("en-IN")}</td>
      <td>-₹${(tAmt + tInt).toLocaleString("en-IN")}</td>
      <td></td>
    </tr>
    </table>
  `;

  const net = (gAmt + gInt) - (tAmt + tInt);

  html += `
    <h2 style="margin-top:20px;color:${net >= 0 ? "green" : "red"}">
      NET AMOUNT: ${net >= 0 ? "+" : "-"}₹${Math.abs(net).toLocaleString("en-IN")}
    </h2>
  `;

  document.getElementById("list").innerHTML = html;
}

/* ================= HISTORY ================= */

function renderHistory(loans) {
  const history = loans.filter(l => l.isClosed);

  let html = `
    <button onclick="showActive()">⬅ Active Records</button>
    <h3 style="margin-top:10px">Closed Records (History)</h3>

    <table border="1" width="100%" style="margin-top:10px">
      <tr>
        <th>Name</th>
        <th>Type</th>
        <th>Given / Taken Date</th>
        <th>Closed Date</th>
        <th>Principal</th>
        <th>Duration</th>
        <th>Interest</th>
        <th>Total</th>
      </tr>
  `;

  history.forEach(l => {
    const calc = calculateInterestWithDuration(
  l.amount,
  l.givenDate,
  l.closedDate
);


    const sign = l.type === "LEND" ? "+" : "-";
    const color = l.type === "LEND" ? "green" : "red";

    html += `
      <tr style="color:${color}">
        <td>${l.personName}</td>
        <td>${l.type}</td>
        <td>${formatDate(l.givenDate)}</td>
        <td>${formatDate(l.closedDate)}</td>
        <td>${sign}₹${l.amount.toLocaleString("en-IN")}</td>
        <td>${calc.duration}</td>
        <td>${sign}₹${calc.interest.toLocaleString("en-IN")}</td>
        <td>${sign}₹${(l.amount + calc.interest).toLocaleString("en-IN")}</td>
      </tr>
    `;
  });

  html += `</table>`;

  document.getElementById("list").innerHTML = html;
}


/* ================= ACTIONS ================= */

function showHistory() {
  currentView = "HISTORY";
  loadLoans();
}

function showActive() {
  currentView = "ACTIVE";
  loadLoans();
}

function editLoan(id) {
  const l = window.allLoans.find(x => x._id === id);
  if (!confirm("Edit this record?")) return;

  editId = id;
  document.getElementById("personName").value = l.personName;
  document.getElementById("amount").value = l.amount;
  document.getElementById("givenDate").value = l.givenDate.slice(0, 10);
  document.getElementById("type").value = l.type;
  document.getElementById("saveBtn").innerText = "Update";
}

async function closeLoan(id) {
  if (!confirm("Close this record?")) return;
  await fetch(`https://money-ledger-app.onrender.com/api/loans/close/${id}`, { method: "PUT" });
  loadLoans();
}

function logout() {
  localStorage.removeItem("ledgerUser");
  location.reload();
}

