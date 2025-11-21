let cardapioData = {};
let cart = [];
let currentItem = {};
let confirmCallback = null;
let splitPayments = [];
let currentPaymentIndex = -1;
let dividirFocusedInput = null;

// Carregar cardápio do JSON
async function loadCardapio() {
  try {
    const response = await fetch("cardapio.json");
    cardapioData = await response.json();
    showCategory("Promoções", document.querySelector(".sessao-topo button"));
  } catch (err) {
    console.error("Erro ao carregar cardápio:", err);
    alert("Erro ao carregar cardápio. Verifique o arquivo cardapio.json");
  }
}

function showCategory(category, btn) {
  document
    .querySelectorAll(".sessao-topo button")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  const container = document.getElementById("cardapio");

  // Animate out old cards
  const oldCards = container.querySelectorAll(".card");
  oldCards.forEach((card) => card.classList.add("hide-out"));

  setTimeout(() => {
    container.innerHTML = "";

    if (!cardapioData[category]) {
      container.innerHTML =
        '<p style="color:white; text-align:center; width:100%;" class="hidden">Categoria vazia</p>';
      // Animate in the message
      setTimeout(() => {
        container.querySelector("p").classList.remove("hidden");
      }, 50);
      return;
    }

    cardapioData[category].forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "card hidden";
      card.innerHTML = `
        <img src="${item.img || "./img/default.png"}" alt="${
        item.nome
      }" onclick="openImagePopup('${item.img || "./img/default.png"}')">
        <h3>${item.nome}</h3>
        <p class="descricao">${item.descricao || ""}</p>
        <div class="options-row">
      `;

      if (item.opcoes && item.opcoes.length > 1) {
        item.opcoes.forEach((op, opi) => {
          const precoOp = item.precoBase[opi];
          card.innerHTML += `
            <div class="small-option">
              <p>${op}</p>
              <p>R$ ${precoOp.toFixed(2)}</p>
              <button class="btn" onclick="addToCart('${category}', ${index}, ${opi}, this)">Adicionar</button>
            </div>
          `;
        });
      } else {
        const preco = Array.isArray(item.precoBase)
          ? item.precoBase[0]
          : item.precoBase;
        const opcoesTexto = item.opcoes ? item.opcoes.join(" ") : "";
        card.innerHTML += `
          <div class="small-option">
            <p>${opcoesTexto}</p>
            <p>R$ ${preco.toFixed(2)}</p>
          </div>
        </div>
        <button class="btn" onclick="addToCart('${category}', ${index}, 0, this)">Adicionar</button>
        `;
      }

      container.appendChild(card);
    });

    // Animate in new cards with stagger
    setTimeout(() => {
      container.querySelectorAll(".card").forEach((card, idx) => {
        setTimeout(() => {
          card.classList.remove("hidden");
        }, idx * 50);
      });
    }, 50);
  }, 300); // Duration of hide-out animation
}

let currentComboIndex = 0;
let comboMods = [];
let comboTotalExtras = 0;

function addToCart(category, index, op = 0, button = null) {
  const item = cardapioData[category][index];
  currentItem = {
    cat: category,
    i: index,
    op: op,
    precoBase: item.precoBase[op] || item.precoBase[0],
    button: button,
  };

  if (item.nome === "Batata G") {
    openBatataModal(item);
  } else if (item.combo) {
    currentComboIndex = 0;
    comboMods = [];
    comboTotalExtras = 0;
    customizeNextBurger(item);
  } else if (category === "Milk Shakes") {
    openMilkShakeModal(item);
  } else {
    openSingleBurgerModal(item);
  }
}

// === BATATA G ===
function openBatataModal(item) {
  document.getElementById(
    "popupCustomTitle"
  ).textContent = `Personalize sua ${item.nome}`;

  let optionsHTML = item.adicionais
    .map(
      (add) => `
    <label>
      <span>${add.nome}</span>
      <input type="checkbox" data-name="${add.nome}">
    </label>
  `
    )
    .join("");

  document.getElementById("popupQuestion").innerHTML = `
    <h4>Opções para Batata G</h4>
    <div class="veggie-options">
      ${optionsHTML}
    </div>
  `;

  document.getElementById("popupResumo").innerHTML = ""; // No extras pagos for Batata G

  document.getElementById("confirmCustomBtn").textContent =
    "Adicionar ao carrinho";
  document.getElementById("confirmCustomBtn").onclick = () =>
    confirmBatataCustom(item);

  openPopup("popupCustom");
}

function confirmBatataCustom(item) {
  let nomeFinal = item.nome;
  let selected = [];
  document
    .querySelectorAll('#popupQuestion input[type="checkbox"]:checked')
    .forEach((checkbox) => {
      selected.push(checkbox.dataset.name);
    });
  if (selected.length > 0) {
    nomeFinal += ` (${selected.join(", ")})`;
  }

  cart.push({ item: nomeFinal, price: currentItem.precoBase });
  flyToCart();
  updateCart();
  playSound("soundAdd");
  closePopup("popupCustom");
}

function customizeNextBurger(item) {
  if (currentComboIndex >= item.burgers.length) {
    // All burgers customized, add to cart
    let nomeFinal = item.nome;
    let modsStr = comboMods
      .map((mod, idx) => {
        let burgerName = item.burgers[idx];
        return mod ? `${burgerName}${mod}` : burgerName;
      })
      .join(" + ");
    nomeFinal += ` (${modsStr})`;

    const precoTotal = currentItem.precoBase + comboTotalExtras;

    cart.push({ item: nomeFinal, price: precoTotal });
    flyToCart();
    updateCart();
    playSound("soundAdd");

    // If Combo Plus, open Batata modal after
    if (item.nome === "Combo Plus!") {
      openBatataModalForCombo(item);
    } else {
      closePopup("popupCustom");
    }
    return;
  }

  const burger = item.burgers[currentComboIndex];
  const isSimples = burger.includes("Simples");

  let ingredients = getIngredsForComboCompat(item, burger).ingredients;

  ingredients = [...new Set(ingredients)];

  let ingredHTML = ingredients
    .map(
      (ing) => `
    <label>
      <span>${ing}</span>
      <input type="checkbox" data-ing="${ing}">
    </label>
  `
    )
    .join("");

  document.getElementById(
    "popupCustomTitle"
  ).textContent = `Personalize seu ${burger.toLowerCase()}`;

  document.getElementById("popupQuestion").innerHTML = `
    <h4>Ingredientes inclusos (marque para retirar)</h4>
    <div class="veggie-options">
      ${ingredHTML}
    </div>
  `;

  let paidExtras = item.paidExtras || [];
  if (!paidExtras.find((e) => e.nome === "Carne Costela Bovina")) {
    paidExtras.push({ nome: "Carne Costela Bovina", preco: 6 });
  }

  let extrasHTML = paidExtras
    .map(
      (extra) => `
    <div class="extra-option">
      <div class="nome-extra">${extra.nome}</div>
      <div class="preco-extra">R$ ${extra.preco.toFixed(2)}</div>
      <div class="extra-counter">
        <button onclick="changeExtra(this, -1)">−</button>
        <span data-preco="${extra.preco}" data-nome="${extra.nome}">0</span>
        <button onclick="changeExtra(this, 1)">+</button>
      </div>
    </div>
  `
    )
    .join("");

  document.getElementById("popupResumo").innerHTML = `
    <h4>Adicionais pagos</h4>
    <div class="extra-options">
      ${extrasHTML}
    </div>
    <div id="totalExtra" style="text-align: right; margin-top: 16px; font-weight: bold;">Total adicionais: R$ 0.00</div>
    <div id="totalItem" style="text-align: right; margin-top: 8px; font-size: 18px; font-weight: bold; color: var(--verde);">Total deste burger: R$ 0.00</div>
  `;

  // Alterar botão para "Próximo" ou "Adicionar ao carrinho"
  const btn = document.getElementById("confirmCustomBtn");
  if (currentComboIndex < item.burgers.length - 1) {
    btn.textContent = "Próximo";
    btn.onclick = () => confirmBurgerCustom(item, false); // false = não add ao cart ainda
  } else {
    btn.textContent = "Adicionar ao carrinho";
    btn.onclick = () => confirmBurgerCustom(item, true); // true = add ao cart
  }

  openPopup("popupCustom");
}

function confirmBurgerCustom(item, addToCartNow) {
  let removidos = [];
  document
    .querySelectorAll('#popupQuestion input[type="checkbox"]:checked')
    .forEach((checkbox) => {
      removidos.push(checkbox.dataset.ing);
    });
  let mods = removidos.length > 0 ? ` sem ${removidos.join(", ")}` : "";

  let adicionais = [];
  let extrasThis = 0;
  document.querySelectorAll(".extra-counter span").forEach((span) => {
    const qtd = parseInt(span.textContent);
    if (qtd > 0) {
      adicionais.push(`+${qtd} ${span.dataset.nome}`);
      extrasThis += qtd * parseFloat(span.dataset.preco);
    }
  });
  if (adicionais.length > 0) {
    mods += ` ${adicionais.join(" ")}`;
  }

  comboMods.push(mods);
  comboTotalExtras += extrasThis;

  closePopup("popupCustom");
  setTimeout(() => {
    currentComboIndex++;
    if (addToCartNow) {
      // All done, add to cart
      let nomeFinal = item.nome;
      let modsStr = comboMods
        .map((mod, idx) => {
          let burgerName = item.burgers[idx];
          return mod ? `${burgerName}${mod}` : burgerName;
        })
        .join(" + ");
      nomeFinal += ` (${modsStr})`;

      const precoTotal = currentItem.precoBase + comboTotalExtras;

      cart.push({ item: nomeFinal, price: precoTotal });
      flyToCart();
      updateCart();
      playSound("soundAdd");

      // If Combo Plus, open Batata modal after
      if (item.nome === "Combo Plus!") {
        openBatataModalForCombo(item);
      }
    } else {
      customizeNextBurger(item);
    }
  }, 300); // Delay for smooth transition
}

function openBatataModalForCombo(item) {
  document.getElementById(
    "popupCustomTitle"
  ).textContent = `Personalize sua Batata G`;

  let optionsHTML = item.adicionais
    .map(
      (add) => `
    <label>
      <span>${add.nome}</span>
      <input type="checkbox" data-name="${add.nome}">
    </label>
  `
    )
    .join("");

  document.getElementById("popupQuestion").innerHTML = `
    <h4>Opções para Batata G</h4>
    <div class="veggie-options">
      ${optionsHTML}
    </div>
  `;

  document.getElementById("popupResumo").innerHTML = "";

  document.getElementById("confirmCustomBtn").textContent =
    "Adicionar ao carrinho";
  document.getElementById("confirmCustomBtn").onclick = () =>
    confirmBatataCustomForCombo(item);

  openPopup("popupCustom");
}

function confirmBatataCustomForCombo(item) {
  let nomeFinal = "Batata G";
  let selected = [];
  document
    .querySelectorAll('#popupQuestion input[type="checkbox"]:checked')
    .forEach((checkbox) => {
      selected.push(checkbox.dataset.name);
    });
  if (selected.length > 0) {
    nomeFinal += ` (${selected.join(", ")})`;
  }

  // Add to last cart item
  cart[cart.length - 1].item += ` + ${nomeFinal}`;
  cart[cart.length - 1].price += currentItem.precoBase;

  flyToCart();
  updateCart();
  playSound("soundAdd");
  closePopup("popupCustom");
}

function openSingleBurgerModal(item) {
  let opcao = item.opcoes ? item.opcoes[currentItem.op] : "";
  document.getElementById("popupCustomTitle").textContent =
    item.nome + (opcao ? ` (${opcao})` : "");

  let ingredients =
    item.ingredients ||
    item.ingredientesPadrao ||
    item.ingredientesPorOpcao?.[opcao] ||
    [];

  let ingredHTML = ingredients
    .map(
      (ing) => `
    <label class="checkbox-item">
      <input type="checkbox" data-ing="${ing}">
      <span>${ing}</span>
    </label>
  `
    )
    .join("");

  let extras = item.adicionais || [];
  let extrasHTML = extras
    .map(
      (extra) => `
    <div class="extra-option">
      <div class="nome-extra">${extra.nome}</div>
      <div class="preco-extra">+ R$ ${extra.preco.toFixed(2)}</div>
      <div class="extra-counter">
        <button type="button" onclick="changeExtra(this, -1)">−</button>
        <span data-preco="${extra.preco}" data-nome="${extra.nome}">0</span>
        <button type="button" onclick="changeExtra(this, 1)">+</button>
      </div>
    </div>
  `
    )
    .join("");

  // Monta o novo layout com duas colunas
  document.getElementById("popupQuestion").innerHTML = `
    <div style="font-weight: bold; margin-bottom: 12px; color: var(--amarelo);">
      Personalize seu lanche
    </div>
    <div class="custom-columns">
      <div class="column">
        <h4 style="margin: 0 0 10px 0; color: #fff;">Ingredientes inclusos</h4>
        <div class="veggie-options">
          ${ingredHTML || "<p style='color:#aaa'>Nenhum ingrediente padrão</p>"}
        </div>
      </div>
      <div class="column">
        <h4 style="margin: 0 0 10px 0; color: #fff;">Adicionais pagos</h4>
        <div class="extra-options">
          ${
            extrasHTML || "<p style='color:#aaa'>Sem adicionais disponíveis</p>"
          }
        </div>
      </div>
    </div>
  `;

  // Resumo e botão centralizados abaixo
  document.getElementById("popupResumo").innerHTML = `
    <div id="totalExtra" style="text-align: center; margin: 16px 0; font-weight: bold; font-size: 16px;">
      Adicionais: R$ 0,00
    </div>
    <div id="totalItem" style="text-align: center; font-size: 22px; font-weight: 900; color: var(--verde); margin: 8px 0;">
      Total: R$ ${currentItem.precoBase.toFixed(2)}
    </div>
  `;

  // Atualiza ação do botão
  document.getElementById("confirmCustomBtn").textContent =
    "Adicionar ao carrinho";
  document.getElementById("confirmCustomBtn").onclick = () =>
    confirmSingleBurgerCustom(item);

  openPopup("popupCustom");
}

function confirmSingleBurgerCustom(item) {
  let removidos = [];
  document
    .querySelectorAll('#popupQuestion input[type="checkbox"]:checked')
    .forEach((checkbox) => {
      removidos.push(checkbox.dataset.ing);
    });
  let mods = removidos.length > 0 ? ` sem ${removidos.join(", ")}` : "";

  let adicionais = [];
  let extrasTotal = 0;
  document.querySelectorAll(".extra-counter span").forEach((span) => {
    const qtd = parseInt(span.textContent);
    if (qtd > 0) {
      adicionais.push(`+${qtd} ${span.dataset.nome}`);
      extrasTotal += qtd * parseFloat(span.dataset.preco);
    }
  });
  if (adicionais.length > 0) {
    mods += ` ${adicionais.join(" ")}`;
  }

  let nomeFinal = item.nome;
  let opcao = item.opcoes ? item.opcoes[currentItem.op] : "";
  if (opcao) nomeFinal += ` (${opcao})`;
  if (mods) nomeFinal += mods;

  const precoTotal = currentItem.precoBase + extrasTotal;

  cart.push({ item: nomeFinal, price: precoTotal });
  flyToCart();
  updateCart();
  playSound("soundAdd");
  closePopup("popupCustom");
}

function changeExtra(btn, delta) {
  let counter = btn.parentElement.querySelector("span");
  let qtd = parseInt(counter.textContent) + delta;
  qtd = Math.max(0, qtd);
  counter.textContent = qtd;

  updateExtrasTotal();
}

function updateExtrasTotal() {
  let totalExtra = 0;
  document.querySelectorAll(".extra-counter span").forEach((span) => {
    totalExtra += parseInt(span.textContent) * parseFloat(span.dataset.preco);
  });

  document.getElementById(
    "totalExtra"
  ).textContent = `Total adicionais: R$ ${totalExtra.toFixed(2)}`;

  let totalItem = (currentItem.precoBase || 0) + totalExtra;
  document.getElementById(
    "totalItem"
  ).textContent = `Total deste burger: R$ ${totalItem.toFixed(2)}`;
}

function updateCart() {
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItemsHeader");
  const cartTotal = document.getElementById("cartTotalHeader");

  cartCount.textContent = cart.length;
  cartItems.innerHTML = cart
    .map(
      (c, idx) => `
    <p>${c.item} <span>R$ ${c.price.toFixed(2)}</span>
      <button class="removeBtn" onclick="removeFromCart(${idx})">x</button>
    </p>
  `
    )
    .join("");
  cartTotal.textContent = getCartTotal().toFixed(2);

  localStorage.setItem("cart", JSON.stringify(cart));
}

function getCartTotal() {
  return cart.reduce((sum, c) => sum + c.price, 0);
}

function removeFromCart(idx) {
  customConfirm("Remover este item do carrinho?", () => {
    cart.splice(idx, 1);
    updateCart();
    playSound("soundClick");
  });
}

function clearCart() {
  if (cart.length === 0) return;
  customConfirm("Limpar todo o carrinho?", () => {
    cart = [];
    updateCart();
    playSound("soundClick");
  });
}

function openPopup(id) {
  const popup = document.getElementById(id);
  popup.classList.add("show");
  document.getElementById("backdrop").classList.add("show");
  playSound("soundClick");
  currentPopup = id; // Track current popup
}

function closePopup(id, callback) {
  const popup = document.getElementById(id);
  popup.classList.remove("show");
  closeBackdrop(callback);
  currentPopup = null; // Reset current popup
}

function closeBackdrop(callback) {
  const backdrop = document.getElementById("backdrop");
  backdrop.classList.remove("show");
  if (callback) setTimeout(callback, 300);
}

function closePopupCustom() {
  closePopup("popupCustom");
}

function confirmPopupCustom() {
  // Esta função é sobrescrita dinamicamente
}

function openImagePopup(src) {
  document.getElementById("enlargedImage").src = src;
  openPopup("popupImage");
  playSound("soundClick");
}

function closeImagePopup(callback) {
  closePopup("popupImage", callback ? callback : () => closeBackdrop());
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    cart = JSON.parse(localStorage.getItem("cart") || "[]");
  } catch (e) {
    cart = [];
  }
  tryEnterFullscreen();
  showStartScreen();
  updateCart();
  loadCardapio();

  // Injetar estilos para animação
  const style = document.createElement("style");
  style.innerHTML = `
    .card {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .card.hidden {
      opacity: 0;
      transform: translateY(20px);
    }
    .card.hide-out {
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    #cardapio p.hidden {
      opacity: 0;
      transform: translateY(20px);
    }
    #cardapio p {
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // Relógio
  setInterval(() => {
    document.getElementById("relogio").textContent =
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
  }, 1000);

  // Som em todos os botões
  document.body.addEventListener(
    "click",
    (e) => {
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
        playSound("soundClick");
      }
    },
    true
  );

  // Toggle para o carrinho no header
  document.getElementById("toggleCartHeader").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("headerCartDropdown").classList.toggle("show");
    playSound("soundClick");
  });

  // Fechar dropdown se clicar fora
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("headerCartDropdown");
    if (
      !e.target.closest("#headerCart") &&
      dropdown.classList.contains("show")
    ) {
      dropdown.classList.remove("show");
    }
  });
});

function tryEnterFullscreen() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.documentElement.webkitRequestFullscreen) {
    document.documentElement.webkitRequestFullscreen().catch(() => {});
  }
}

function openPaymentPopup() {
  closePopup("popupResumoPedido", () => {
    openPopup("popupPayment");
  });
}

function closePaymentPopup(callback) {
  closePopup("popupPayment", callback);
}

function selectSinglePayment(method) {
  if (method === "Dinheiro") {
    closePaymentPopup(() => openTrocoPopup());
  } else if (method === "Dinheiro Exato") {
    splitPayments = [
      { value: getCartTotal(), method: "Dinheiro Exato", troco: 0 },
    ];
    closePaymentPopup(() => proceedToNome());
  } else {
    splitPayments = [{ value: getCartTotal(), method: method, troco: 0 }];
    closePaymentPopup(() => proceedToNome());
  }
}

function proceedToNome() {
  document.getElementById("inputNome").value = "";
  openPopup("popupNome");
}

function confirmNome() {
  const nome = document.getElementById("inputNome").value.trim();
  if (!nome) {
    showCustomAlert("Digite um nome para continuar.");
    return;
  }
  closeNome(() => enviarPedido(nome));
}

function closeNome() {
  closePopup("popupNome");
}

function openTrocoPopup() {
  document.getElementById("inputTroco").value = "";
  openPopup("popupTroco");
}

function confirmTroco() {
  const trocoStr = document.getElementById("inputTroco").value.trim();
  const troco = parseFloat(trocoStr);
  if (isNaN(troco) || troco < getCartTotal()) {
    showCustomAlert("Valor de troco inválido ou insuficiente.");
    return;
  }
  splitPayments = [
    { value: troco, method: "Dinheiro", troco: troco - getCartTotal() },
  ];
  closeTrocoPopup(() => proceedToNome());
}

function closeTrocoPopup() {
  closePopup("popupTroco");
}

function enviarPedido(nome) {
  const pedidos = JSON.parse(localStorage.getItem("pedidos") || "[]");
  const id = Date.now();
  const total = getCartTotal().toFixed(2);
  const itens = cart.map((c) => c.item).join("\n");
  const pagamento = splitPayments
    .map(
      (p) =>
        `${p.method}: R$ ${p.value.toFixed(2)}${
          p.troco ? ` (Troco: R$ ${p.troco.toFixed(2)})` : ""
        }`
    )
    .join(", ");

  pedidos.push({
    id,
    nomeCliente: nome,
    itens,
    total,
    pagamentos: splitPayments,
    status: "pendente",
  });

  localStorage.setItem("pedidos", JSON.stringify(pedidos));

  openPopup("popupAguarde");
  clearCart();
}

function flyToCart() {
  if (!currentItem.button) return;

  const card = currentItem.button.closest(".card");
  if (!card) return;

  const img = card.querySelector("img");
  if (!img) return;

  const clone = img.cloneNode(true);
  document.body.appendChild(clone);

  const rect = img.getBoundingClientRect();
  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.zIndex = "10000";
  clone.style.transition = "all 0.8s ease-out";

  const cartIcon = document.getElementById("cartCount");
  if (!cartIcon) return;

  const cartRect = cartIcon.getBoundingClientRect();

  setTimeout(() => {
    clone.style.left = `${
      cartRect.left + cartRect.width / 2 - rect.width / 2
    }px`;
    clone.style.top = `${
      cartRect.top + cartRect.height / 2 - rect.height / 2
    }px`;
    clone.style.width = "0px";
    clone.style.height = "0px";
    clone.style.opacity = "0";
  }, 10);

  setTimeout(() => {
    clone.remove();
  }, 800);
}

function showStartScreen() {
  document.body.classList.add("start-active");
  const startScreen = document.getElementById("startScreen");
  startScreen.classList.remove("hidden");
  startScreen.addEventListener("click", startApp, { once: true });
  startScreen.addEventListener("touchstart", startApp, { once: true });
}

function startApp() {
  const startScreen = document.getElementById("startScreen");
  startScreen.classList.add("hidden");
  document.body.classList.remove("start-active");
  playSound("soundConfirm");
}

function playSound(id) {
  const sound = document.getElementById(id);
  if (sound) sound.play().catch(() => {});
}

function getIngredsForComboCompat(item, burger) {
  if (item.simplesIngredients && burger.includes("Simples")) {
    return { ingredients: item.simplesIngredients };
  } else {
    return {
      ingredients:
        item.duploIngredients ||
        item.ingredients ||
        item.ingredientesPadrao ||
        [],
    };
  }
}

function mostrarResumo() {
  if (cart.length === 0) {
    showCustomAlert("Carrinho vazio");
    return;
  }

  const resumoDiv = document.getElementById("resumoItens");
  resumoDiv.innerHTML =
    cart
      .map(
        (
          c
        ) => `<div style="display:flex;justify-content:space-between;padding:6px 0;">
                <div>${escapeHtml(c.item)}</div>
                <div>R$ ${Number(c.price).toFixed(2)}</div>
              </div>`
      )
      .join("") +
    `<hr><div style="text-align:right;font-weight:bold">
       Total: R$ ${getCartTotal().toFixed(2)}
     </div>`;

  openPopup("popupResumoPedido");
  playSound("soundClick");
}

function closeResumoPopup() {
  closePopup("popupResumoPedido", () => closeBackdrop());
}

function reiniciarPedido() {
  cart = [];
  updateCart();
  closeAllPopups();
  showCategory("Promoções", document.querySelector(".sessao-topo button"));
  showStartScreen();
}

function openPixPopup() {
  document.getElementById(
    "pixTotal"
  ).innerText = `Total: R$ ${getCartTotal().toFixed(2)}`;
  closePaymentPopup(() => {
    openPopup("popupPix");
  });
}

function closePix(callback) {
  closePopup("popupPix", callback ? callback : () => closeBackdrop());
}

function confirmPix() {
  splitPayments = [{ value: getCartTotal(), method: "PIX", troco: 0 }];
  closePix(() => proceedToNome());
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

function showCustomAlert(message) {
  document.getElementById("alertMessage").innerText = message;
  openPopup("customAlert");
}

function closeCustomAlert() {
  closePopup("customAlert");
}

function customConfirm(message, callback) {
  document.getElementById("confirmMessage").innerText = message;
  confirmCallback = callback;
  openPopup("customConfirm");
}

function closeCustomConfirm(confirm) {
  if (confirm && confirmCallback) confirmCallback();
  confirmCallback = null;
  closePopup("customConfirm");
}

function closeAllPopups() {
  document
    .querySelectorAll(".popup.show")
    .forEach((p) => p.classList.remove("show"));
  closeBackdrop();
}

function abrirPopupDividirPagamento() {
  document.getElementById(
    "valorTotalDivisao"
  ).textContent = `Total: R$ ${getCartTotal().toFixed(2)}`;
  document.getElementById("quantidadePessoas").value = "";
  document.getElementById("inputsDivisao").innerHTML = "";
  document.getElementById("dividirKeypad").style.display = "none";
  document.getElementById(
    "faltandoValor"
  ).textContent = `Faltando R$ ${getCartTotal().toFixed(2)}`;
  document.getElementById("confirmarDivisao").disabled = true;
  closePaymentPopup(() => openPopup("popupDividirPagamento"));
}

function closePopupDividir() {
  closePopup("popupDividirPagamento");
}

function gerarCamposDivisao() {
  const qtd = parseInt(document.getElementById("quantidadePessoas").value);
  if (!qtd) return;

  const inputsDiv = document.getElementById("inputsDivisao");
  inputsDiv.innerHTML = "";
  splitPayments = [];

  for (let i = 1; i <= qtd; i++) {
    const row = document.createElement("div");
    row.className = "rowDiv";
    row.innerHTML = `
      <label>Pessoa ${i}:</label>
      <input type="text" id="payer${i}" readonly placeholder="R$ 0.00" onclick="focusDividirInput(this)">
      <select id="method${i}">
        <option value="PIX">PIX</option>
        <option value="Cartão">Cartão</option>
        <option value="Dinheiro">Dinheiro</option>
      </select>
    `;
    inputsDiv.appendChild(row);
  }

  document.getElementById("dividirKeypad").style.display = "grid";
  updateFaltandoValor();
}

function focusDividirInput(input) {
  dividirFocusedInput = input;
}

document.querySelectorAll(".key-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!dividirFocusedInput) return;
    let value = dividirFocusedInput.value.replace(/[^0-9.]/g, "");
    const key = btn.dataset.key;

    if (key === "⌫") {
      value = value.slice(0, -1);
    } else if (key === "." && value.includes(".")) {
      return;
    } else {
      value += key;
    }

    dividirFocusedInput.value = formatCurrency(value);
    updateFaltandoValor();
  });
});

function formatCurrency(value) {
  value = value.replace(/^0+(?=\d)/, ""); // Remove leading zeros
  if (!value) return "";
  const num = parseFloat(value);
  return num.toFixed(2);
}

function updateFaltandoValor() {
  let totalInserido = 0;
  document.querySelectorAll("#inputsDivisao input").forEach((input) => {
    totalInserido += parseFloat(input.value.replace(/[^0-9.]/g, "")) || 0;
  });

  const faltando = getCartTotal() - totalInserido;
  document.getElementById(
    "faltandoValor"
  ).textContent = `Faltando R$ ${faltando.toFixed(2)}`;

  document.getElementById("confirmarDivisao").disabled = faltando !== 0;
}

function confirmarDivisao() {
  splitPayments = [];
  document.querySelectorAll("#inputsDivisao .rowDiv").forEach((row, idx) => {
    const value = parseFloat(
      row.querySelector("input").value.replace(/[^0-9.]/g, "")
    );
    const method = row.querySelector("select").value;
    splitPayments.push({ value, method, troco: 0 });
  });

  closePopupDividir(() => proceedToNome());
}

// Inicializar teclado nome
const keys = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  "Q",
  "W",
  "E",
  "R",
  "T",
  "Y",
  "U",
  "I",
  "O",
  "P",
  "A",
  "S",
  "D",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "Ç",
  "Z",
  "X",
  "C",
  "V",
  "B",
  "N",
  "M",
  "Espaço",
  "⌫",
];

const keyboardDiv = document.getElementById("keyboard");
keys.forEach((key) => {
  const btn = document.createElement("button");
  if (key === "Espaço") btn.className = "space";
  if (key === "⌫") btn.className = "backspace";
  btn.textContent = key === "Espaço" ? " " : key;
  btn.onclick = () => {
    let input = document.getElementById("inputNome");
    if (key === "⌫") {
      input.value = input.value.slice(0, -1);
    } else {
      input.value += key === "Espaço" ? " " : key;
    }
    playSound("soundClick");
  };
  keyboardDiv.appendChild(btn);
});

// Inicializar teclado troco
const trocoKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "⌫"];
const trocoKeyboardDiv = document.getElementById("trocoKeyboard");
trocoKeys.forEach((key) => {
  const btn = document.createElement("button");
  btn.textContent = key;
  btn.dataset.key = key;
  btn.onclick = () => {
    let input = document.getElementById("inputTroco");
    let value = input.value;
    if (key === "⌫") {
      value = value.slice(0, -1);
    } else if (key === "." && value.includes(".")) {
      return;
    } else {
      value += key;
    }
    input.value = value;
    playSound("soundClick");
  };
  trocoKeyboardDiv.appendChild(btn);
});

// Adicionar fechamento ao clicar no backdrop
let currentPopup = null;
document.getElementById("backdrop").addEventListener("click", () => {
  if (currentPopup) {
    closePopup(currentPopup);
  }
});

// === MILK SHAKE ===
function openMilkShakeModal(item) {
  openPopup("popupMilkShake");
  // Removed currentItem = item; to avoid overwriting
}

function confirmMilkShake() {
  const selected = document.querySelector('input[name="cobertura"]:checked');
  if (!selected) {
    showCustomAlert("Selecione uma cobertura!");
    return;
  }

  const item = cardapioData[currentItem.cat][currentItem.i];
  const op = currentItem.op;
  const size = item.opcoes[op];
  const nomeFinal = `${item.nome} ${size}\n- Cobertura: ${selected.value}`;
  cart.push({ item: nomeFinal, price: currentItem.precoBase });
  flyToCart();
  updateCart();
  playSound("soundAdd");
  closeMilkShakePopup();
}

function closeMilkShakePopup() {
  closePopup("popupMilkShake");
}
