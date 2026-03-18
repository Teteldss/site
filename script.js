const fallbackProducts = [
  {
    id: "f-1",
    slug: "agenda-a5",
    name: "Agenda A5",
    description: "Agenda catolica com opcoes de capa e folhas para planejamento diario.",
    price: 70,
    image: "linear-gradient(140deg, #f2b5ca, #e89ab6)",
    images: ["linear-gradient(140deg, #f2b5ca, #e89ab6)", "linear-gradient(140deg, #f3cad8, #ecb2c7)"],
    rating: 4.8,
    reviewCount: 12,
    reviews: [],
  },
  {
    id: "f-2",
    slug: "caderno-a5",
    name: "Caderno A5",
    description: "Caderno tamanho A5 com capa personalizada e miolo premium.",
    price: 40,
    image: "linear-gradient(140deg, #efadc4, #e392af)",
    images: ["linear-gradient(140deg, #efadc4, #e392af)", "linear-gradient(140deg, #f7d2df, #efafc5)"],
    rating: 4.6,
    reviewCount: 8,
    reviews: [],
  },
];

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const selected = new Map();
let products = [];
let currentProduct = null;
let WHATSAPP_LOJA = "55119997635107";

const gallery = document.getElementById("gallery");
const selectedCount = document.getElementById("selected-count");
const selectedTotal = document.getElementById("selected-total");
const selectedList = document.getElementById("selected-list");
const sendButton = document.getElementById("send-whatsapp");
const customerName = document.getElementById("customer-name");
const notes = document.getElementById("notes");
const template = document.getElementById("product-card-template");
const sendButtonDefaultContent = sendButton ? sendButton.innerHTML : "";

const modal = document.getElementById("product-modal");
const modalClose = document.getElementById("product-modal-close");
const productMainImage = document.getElementById("product-main-image");
const productThumbs = document.getElementById("product-thumbs");
const productTitle = document.getElementById("product-title");
const productPrice = document.getElementById("product-price");
const productRating = document.getElementById("product-rating");
const productDescription = document.getElementById("product-description");
const productAddButton = document.getElementById("product-add");
const productReviewsList = document.getElementById("product-reviews-list");
const reviewForm = document.getElementById("review-form");

function normalizeWhatsapp(value) {
  return String(value || "").replace(/\D/g, "");
}

function showSkeletons(count = 6) {
  gallery.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const card = document.createElement("article");
    card.className = "card skeleton";
    const imageDiv = document.createElement("div");
    imageDiv.className = "image-wrap";
    const body = document.createElement("div");
    body.className = "card-body";
    const line1 = document.createElement("div");
    line1.className = "skeleton-line";
    line1.style.cssText = "width:70%;height:16px;margin-bottom:8px";
    const line2 = document.createElement("div");
    line2.className = "skeleton-line";
    line2.style.cssText = "width:55%;height:14px";
    body.append(line1, line2);
    card.append(imageDiv, body);
    gallery.appendChild(card);
  }
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("toast-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("toast-visible"), 2200);
}

function renderStatus(message) {
  let statusNode = document.getElementById("data-status");

  if (!statusNode) {
    statusNode = document.createElement("p");
    statusNode.id = "data-status";
    statusNode.className = "data-status";
    statusNode.setAttribute("role", "status");
    statusNode.setAttribute("aria-live", "polite");
    gallery.parentElement.insertBefore(statusNode, gallery);
  }

  statusNode.textContent = message;
}

function renderGallery() {
  const fragment = document.createDocumentFragment();

  products.forEach((product, index) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".card");
    const selectBtn = node.querySelector(".select-btn");
    const image = node.querySelector(".image-wrap");
    const viewBtn = node.querySelector(".view-btn");

    card.dataset.productId = product.id;
    card.style.animationDelay = `${index * 55}ms`;

    node.querySelector("h3").textContent = product.name;
    node.querySelector(".price").textContent = brl.format(product.price);

    const previewImage = product.image || (product.images || [])[0];
    if (previewImage && /^https?:\/\//i.test(previewImage)) {
      const img = document.createElement("img");
      img.alt = product.name;
      img.decoding = "async";
      if (index < 4) img.fetchPriority = "high";
      img.addEventListener("load", () => {
        img.classList.add("img-ready");
        image.classList.add("img-loaded");
      });
      img.addEventListener("error", () => {
        image.classList.add("img-loaded");
        image.style.background = "linear-gradient(145deg, #f5aabf, #e88aa5)";
      });
      img.src = previewImage;
      image.appendChild(img);
    } else {
      image.classList.add("img-loaded");
      image.style.background = previewImage || "linear-gradient(145deg, #f5aabf, #e88aa5)";
    }

    selectBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleProduct(product, card);
    });

    viewBtn.addEventListener("click", () => {
      openProductModal(product);
    });

    card.addEventListener("dblclick", () => {
      openProductModal(product);
    });

    fragment.appendChild(node);
  });

  gallery.innerHTML = "";
  gallery.appendChild(fragment);
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    const payload = await response.json().catch(() => ({}));

    if (payload.whatsapp) {
      WHATSAPP_LOJA = normalizeWhatsapp(payload.whatsapp) || WHATSAPP_LOJA;
    }

    if (!response.ok || !Array.isArray(payload.products) || payload.products.length === 0) {
      products = [...fallbackProducts];
      renderStatus("Usando catalogo local de exemplo.");
      return;
    }

    products = payload.products.map((p) => ({
      ...p,
      images: Array.isArray(p.images) ? p.images : [p.image].filter(Boolean),
      reviews: Array.isArray(p.reviews) ? p.reviews : [],
    }));
    renderStatus("Nossos produtos");
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    products = [...fallbackProducts];
    renderStatus("Erro ao carregar API. Exibindo produtos locais de exemplo.");
  }
}

async function openProductModal(product) {
  let fullProduct = product;

  if (product.slug && !String(product.id || "").startsWith("f-")) {
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.slug)}`);
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.product) {
        fullProduct = payload.product;
      }
    } catch (error) {
      console.error("Erro ao carregar detalhe do produto:", error);
    }
  }

  currentProduct = {
    ...product,
    ...fullProduct,
    images: Array.isArray(fullProduct.images) ? fullProduct.images : [fullProduct.image].filter(Boolean),
  };

  productTitle.textContent = currentProduct.name;
  productPrice.textContent = brl.format(currentProduct.price || 0);
  const rating = Number(currentProduct.rating || 0);
  const reviewCount = Number(currentProduct.reviewCount || 0);
  productRating.textContent = reviewCount > 0 ? `Nota ${rating.toFixed(1)} (${reviewCount} avaliacoes)` : "Sem avaliacoes ainda";
  productDescription.textContent = currentProduct.description || "Sem descricao.";

  renderProductGallery(currentProduct.images || []);
  renderReviews(currentProduct.reviews || []);

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeProductModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function renderProductGallery(images) {
  const safeImages = images.length ? images : ["linear-gradient(140deg, #f2b5ca, #e89ab6)"];

  function setMainImage(src) {
    productMainImage.innerHTML = "";
    if (/^https?:\/\//i.test(src)) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = currentProduct?.name || "Produto";
      img.loading = "lazy";
      productMainImage.appendChild(img);
    } else {
      const div = document.createElement("div");
      div.style.width = "100%";
      div.style.height = "100%";
      div.style.background = src;
      productMainImage.appendChild(div);
    }
  }

  setMainImage(safeImages[0]);
  productThumbs.innerHTML = "";

  safeImages.forEach((src, idx) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = `thumb-btn${idx === 0 ? " is-active" : ""}`;

    if (/^https?:\/\//i.test(src)) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Miniatura";
      thumb.appendChild(img);
    } else {
      thumb.style.background = src;
    }

    thumb.addEventListener("click", () => {
      productThumbs.querySelectorAll(".thumb-btn").forEach((b) => b.classList.remove("is-active"));
      thumb.classList.add("is-active");
      setMainImage(src);
    });

    productThumbs.appendChild(thumb);
  });
}

function renderReviews(reviews) {
  productReviewsList.innerHTML = "";

  if (!reviews.length) {
    const li = document.createElement("li");
    li.className = "review-empty";
    li.textContent = "Ainda nao ha avaliacoes aprovadas.";
    productReviewsList.appendChild(li);
    return;
  }

  reviews.forEach((review) => {
    const li = document.createElement("li");
    li.className = "review-item";
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    li.innerHTML = `<strong>${review.authorName || "Cliente"}</strong> <span>${stars}</span><p>${review.comment || ""}</p>`;
    productReviewsList.appendChild(li);
  });
}

function toggleProduct(product, cardElement) {
  if (selected.has(product.id)) {
    selected.delete(product.id);
    cardElement?.classList.remove("is-selected");
    showToast(`${product.name} removido`);
  } else {
    selected.set(product.id, { product, qty: 1 });
    cardElement?.classList.add("is-selected");
    showToast(`${product.name} adicionado`);
  }

  updateSummary();
}

function addFromModal() {
  if (!currentProduct) return;

  if (selected.has(currentProduct.id)) {
    const entry = selected.get(currentProduct.id);
    selected.set(currentProduct.id, { ...entry, qty: entry.qty + 1 });
  } else {
    selected.set(currentProduct.id, { product: currentProduct, qty: 1 });
  }

  const card = gallery.querySelector(`[data-product-id="${currentProduct.id}"]`);
  if (card) card.classList.add("is-selected");

  updateSummary();
  showToast(`${currentProduct.name} adicionado ao pedido`);
}

function changeQty(productId, delta) {
  const entry = selected.get(productId);
  if (!entry) return;
  const newQty = entry.qty + delta;
  if (newQty <= 0) {
    selected.delete(productId);
    const card = gallery.querySelector(`[data-product-id="${productId}"]`);
    if (card) card.classList.remove("is-selected");
  } else {
    selected.set(productId, { ...entry, qty: newQty });
  }
  updateSummary();
}

function updateSummary() {
  const items = Array.from(selected.values());
  const totalQty = items.reduce((sum, { qty }) => sum + qty, 0);
  const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0);

  selectedCount.textContent = `${totalQty} ${totalQty === 1 ? "item selecionado" : "itens selecionados"}`;
  selectedTotal.textContent = brl.format(total);

  selectedList.innerHTML = "";
  items.forEach(({ product, qty }) => {
    const li = document.createElement("li");
    li.className = "cart-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "cart-item-name";
    nameSpan.textContent = product.name;

    const controls = document.createElement("div");
    controls.className = "cart-item-controls";

    const minusBtn = document.createElement("button");
    minusBtn.className = "qty-btn";
    minusBtn.textContent = "-";
    minusBtn.type = "button";
    minusBtn.addEventListener("click", () => changeQty(product.id, -1));

    const qtySpan = document.createElement("span");
    qtySpan.className = "qty-value";
    qtySpan.textContent = qty;

    const plusBtn = document.createElement("button");
    plusBtn.className = "qty-btn";
    plusBtn.textContent = "+";
    plusBtn.type = "button";
    plusBtn.addEventListener("click", () => changeQty(product.id, 1));

    const priceSpan = document.createElement("span");
    priceSpan.className = "cart-item-price";
    priceSpan.textContent = brl.format(product.price * qty);

    controls.append(minusBtn, qtySpan, plusBtn, priceSpan);
    li.append(nameSpan, controls);
    selectedList.appendChild(li);
  });

  sendButton.disabled = items.length === 0;
}

function buildMessage() {
  const items = Array.from(selected.values());
  const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  const lines = [];

  lines.push("Oi! Quero fazer um pedido:");
  lines.push("");

  if (items.length > 0) {
    lines.push("Itens:");
    items.forEach(({ product, qty }, index) => {
      const subtotal = product.price * qty;
      lines.push(qty > 1 ? `${index + 1}. ${product.name} x${qty} - ${brl.format(subtotal)}` : `${index + 1}. ${product.name} - ${brl.format(subtotal)}`);
    });
    lines.push("");
  }

  lines.push(`Total: ${brl.format(total)}`);
  lines.push("");

  if (customerName.value.trim()) {
    lines.push(`Nome: ${customerName.value.trim()}`);
  }

  if (notes.value.trim()) {
    lines.push(`Obs: ${notes.value.trim()}`);
  }

  return lines.join("\n");
}

sendButton.addEventListener("click", async () => {
  if (selected.size === 0) {
    alert("Selecione pelo menos um item antes de enviar.");
    return;
  }

  const message = buildMessage();
  const whatsappDestino = normalizeWhatsapp(WHATSAPP_LOJA);
  const url = `https://wa.me/${whatsappDestino}?text=${encodeURIComponent(message)}`;

  sendButton.disabled = true;
  sendButton.classList.add("is-loading");
  sendButton.innerHTML = '<span class="spinner" aria-hidden="true"></span> Preparando pedido...';

  await new Promise((resolve) => setTimeout(resolve, 700));
  showToast("Pedido pronto. Abrindo WhatsApp...");
  window.open(url, "_blank", "noopener,noreferrer");

  sendButton.classList.remove("is-loading");
  sendButton.innerHTML = sendButtonDefaultContent;
  updateSummary();
});

productAddButton.addEventListener("click", addFromModal);
modalClose.addEventListener("click", closeProductModal);
modal.addEventListener("click", (event) => {
  if (event.target && event.target.dataset.closeModal === "true") {
    closeProductModal();
  }
});

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentProduct) return;

  const authorName = document.getElementById("review-name").value.trim();
  const rating = Number(document.getElementById("review-rating").value || 0);
  const comment = document.getElementById("review-comment").value.trim();

  if (!authorName || !comment || rating < 1 || rating > 5) {
    showToast("Preencha os campos da avaliacao.");
    return;
  }

  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: currentProduct.id,
        authorName,
        rating,
        comment,
      }),
    });

    if (!response.ok) {
      throw new Error("Falha ao enviar avaliacao");
    }

    reviewForm.reset();
    showToast("Avaliacao enviada para aprovacao.");
  } catch (error) {
    showToast("Nao foi possivel enviar a avaliacao.");
  }
});

async function init() {
  showSkeletons();
  await loadProducts();
  renderGallery();
  updateSummary();
}

init();
