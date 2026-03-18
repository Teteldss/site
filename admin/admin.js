const loginCard = document.getElementById("login-card");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const adminKeyInput = document.getElementById("admin-key");
const logoutBtn = document.getElementById("logout-btn");
const refreshBtn = document.getElementById("refresh-btn");
const syncBtn = document.getElementById("sync-btn");
const listTitle = document.getElementById("list-title");
const listSubtitle = document.getElementById("list-subtitle");
const reviewsList = document.getElementById("reviews-list");
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));

const SESSION_KEY = "admin_review_key";
let currentStatus = "pending";

function getAdminKey() {
  return sessionStorage.getItem(SESSION_KEY) || "";
}

function setAdminKey(value) {
  if (value) sessionStorage.setItem(SESSION_KEY, value);
  else sessionStorage.removeItem(SESSION_KEY);
}

function statusLabel(status) {
  if (status === "approved") return "aprovadas";
  if (status === "rejected") return "rejeitadas";
  return "pendentes";
}

function stars(rating) {
  const n = Math.max(1, Math.min(5, Number(rating) || 0));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-key": getAdminKey(),
  };
}

function renderItems(items, status) {
  reviewsList.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = `Nao ha avaliacoes ${statusLabel(status)}.`;
    reviewsList.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "review-item";

    const date = item.createdAt ? new Date(Number(item.createdAt) * 1000) : null;
    const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleString("pt-BR") : "data desconhecida";

    const head = document.createElement("div");
    head.className = "review-head";

    const headInner = document.createElement("div");

    const title = document.createElement("p");
    title.className = "review-title";
    title.textContent = `${item.productName || "Produto"} - ${item.authorName || "Cliente"}`;

    const meta = document.createElement("p");
    meta.className = "review-meta";
    meta.textContent = `${stars(item.rating)} - ${dateText}`;

    const comment = document.createElement("p");
    comment.className = "review-comment";
    comment.textContent = item.comment || "";

    headInner.append(title, meta);
    head.appendChild(headInner);
    li.append(head, comment);

    if (status === "pending") {
      const actions = document.createElement("div");
      actions.className = "review-actions";

      const approveBtn = document.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "review-action approve";
      approveBtn.textContent = "Aprovar";
      approveBtn.addEventListener("click", () => moderateReview(item.id, "approved"));

      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "review-action reject";
      rejectBtn.textContent = "Rejeitar";
      rejectBtn.addEventListener("click", () => moderateReview(item.id, "rejected"));

      actions.append(approveBtn, rejectBtn);
      li.appendChild(actions);
    }

    reviewsList.appendChild(li);
  });
}

function activateTab(status) {
  currentStatus = status;
  tabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.status === status);
  });
  listTitle.textContent = `Avaliacoes ${statusLabel(status)}`;
}

async function fetchReviews(status = "pending") {
  activateTab(status);
  listSubtitle.textContent = "Carregando...";

  try {
    const response = await fetch(`/api/admin/reviews?status=${encodeURIComponent(status)}`, {
      method: "GET",
      headers: authHeaders(),
    });

    if (response.status === 401) {
      setAdminKey("");
      dashboard.classList.add("hidden");
      loginCard.classList.remove("hidden");
      listSubtitle.textContent = "Sessao expirada. Entre novamente.";
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Falha ao listar avaliacoes");
    }

    const items = Array.isArray(payload.reviews) ? payload.reviews : [];
    renderItems(items, status);
    listSubtitle.textContent = `${items.length} item(ns) encontrado(s).`;
  } catch (error) {
    listSubtitle.textContent = `Erro: ${error.message}`;
    reviewsList.innerHTML = "";
  }
}

async function moderateReview(id, status) {
  try {
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Falha ao atualizar avaliacao");
    }

    await fetchReviews(currentStatus);
  } catch (error) {
    alert(`Nao foi possivel atualizar: ${error.message}`);
  }
}

async function syncNotion() {
  const original = syncBtn.textContent;
  syncBtn.disabled = true;
  syncBtn.textContent = "Sincronizando...";

  try {
    const response = await fetch("/api/admin/sync", {
      method: "POST",
      headers: authHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Falha ao sincronizar");
    }

    await fetchReviews(currentStatus);
  } catch (error) {
    alert(`Falha na sincronizacao: ${error.message}`);
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = original;
  }
}

async function tryLogin(key) {
  setAdminKey(key);
  const response = await fetch("/api/admin/reviews?status=pending", {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    setAdminKey("");
    throw new Error("Chave invalida.");
  }

  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  await fetchReviews("pending");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = adminKeyInput.value.trim();
  if (!key) return;

  try {
    await tryLogin(key);
    adminKeyInput.value = "";
  } catch (error) {
    alert(error.message);
  }
});

logoutBtn.addEventListener("click", () => {
  setAdminKey("");
  dashboard.classList.add("hidden");
  loginCard.classList.remove("hidden");
  reviewsList.innerHTML = "";
  listSubtitle.textContent = "Sessao encerrada.";
});

refreshBtn.addEventListener("click", () => fetchReviews(currentStatus));
syncBtn.addEventListener("click", syncNotion);

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => fetchReviews(btn.dataset.status || "pending"));
});

(async function init() {
  const key = getAdminKey();
  if (!key) return;

  try {
    await tryLogin(key);
  } catch (_) {
    // Sessao antiga invalida; usuario precisa entrar novamente.
  }
})();
