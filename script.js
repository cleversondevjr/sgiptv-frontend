const API = "https://sgiptv-backend.onrender.com";
let pixStatusTimer = null;
let pixCountdownTimer = null;

let catalogIndex = 0;
let catalogAutoTimer = null;

window.addEventListener("load", () => {
  const loader = document.getElementById("loader");

  if (loader) {
    setTimeout(() => {
      loader.style.display = "none";
    }, 700);
  }

  aplicarMascaraTelefone("telefone");
  aplicarMascaraTelefone("testeTelefone");

  iniciarCatalogoAuto();
});

function obterItensCatalogo() {
  const row = document.getElementById("catalogRow");
  if (!row) return null;
  const itens = Array.from(row.querySelectorAll(".catalog-item"));
  return { row, itens };
}

function irParaItemCatalogo(novoIndex) {
  const data = obterItensCatalogo();
  if (!data) return;

  const { row, itens } = data;
  if (itens.length === 0) return;

  catalogIndex = ((novoIndex % itens.length) + itens.length) % itens.length;
  const alvo = itens[catalogIndex];
  const left = alvo.offsetLeft - row.offsetLeft;
  row.scrollTo({ left, behavior: "smooth" });
}

function scrollCatalog(direcao) {
  const row = document.getElementById("catalogRow");
  if (!row) return;

  pararCatalogoAuto();
  irParaItemCatalogo(catalogIndex + direcao);
  iniciarCatalogoAuto();
}

function iniciarCatalogoAuto() {
  pararCatalogoAuto();
  catalogAutoTimer = setInterval(() => {
    irParaItemCatalogo(catalogIndex + 1);
  }, 5000);
}

function pararCatalogoAuto() {
  if (catalogAutoTimer) {
    clearInterval(catalogAutoTimer);
    catalogAutoTimer = null;
  }
}

function selecionarPlano(valor) {
  const planoPorValor = {
    "30": "mensal_1_tela",
    "50": "mensal_2_telas",
    "80": "trimestral_1_tela",
    "140": "trimestral_2_telas"
  };
  const planoId = planoPorValor[String(valor)] || valor;

  localStorage.setItem("plano_selecionado", planoId);
  window.location.href = "cliente.html";
}

function normalizarTelefone(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function formatarTelefone(numero) {
  const digitos = normalizarTelefone(numero).slice(0, 11);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function aplicarMascaraTelefone(id) {
  const campo = document.getElementById(id);
  if (!campo) return;

  campo.addEventListener("input", () => {
    campo.value = formatarTelefone(campo.value);
    limparErroCampo(id);
  });
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ""));
}

function telefoneValido(telefone) {
  const digitos = normalizarTelefone(telefone);
  return digitos.length >= 10 && digitos.length <= 13;
}

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mostrarErroCampo(id, mensagem) {
  const campo = document.getElementById(id);
  if (!campo) return;

  campo.classList.add("input-error");

  let aviso = campo.parentElement.querySelector(`[data-field-error="${id}"]`);
  if (!aviso) {
    aviso = document.createElement("p");
    aviso.className = "field-message";
    aviso.dataset.fieldError = id;
    campo.insertAdjacentElement("afterend", aviso);
  }

  aviso.textContent = mensagem;
}

function limparErroCampo(id) {
  const campo = document.getElementById(id);
  if (!campo) return;

  campo.classList.remove("input-error");

  const aviso = campo.parentElement.querySelector(`[data-field-error="${id}"]`);
  if (aviso) aviso.remove();
}

function validarContatoFormulario({ emailId, telefoneId, destino }) {
  const email = document.getElementById(emailId).value.trim().toLowerCase();
  const telefone = normalizarTelefone(document.getElementById(telefoneId).value);
  let valido = true;

  limparErroCampo(emailId);
  limparErroCampo(telefoneId);

  if (!emailValido(email)) {
    mostrarErroCampo(emailId, "Digite um email valido.");
    valido = false;
  }

  if (!telefoneValido(telefone)) {
    mostrarErroCampo(telefoneId, "Digite um WhatsApp com DDD.");
    valido = false;
  }

  if (!valido && destino) {
    destino.innerHTML = `
      <h3 style="color:#ef4444;">Revise seus dados</h3>
      <p>Corrija os campos destacados para continuar.</p>
    `;
  }

  return { valido, email, telefone };
}

function pararContadorPix() {
  if (pixCountdownTimer) {
    clearInterval(pixCountdownTimer);
    pixCountdownTimer = null;
  }
}

function pararMonitoramentoPix() {
  if (pixStatusTimer) {
    clearInterval(pixStatusTimer);
    pixStatusTimer = null;
  }

  pararContadorPix();
}

function formatarTempoRestante(ms) {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
  const segundos = String(totalSegundos % 60).padStart(2, "0");
  return `${minutos}:${segundos}`;
}

function iniciarContadorPix(expiraEm, idElemento, aoExpirar) {
  pararContadorPix();

  const elemento = document.getElementById(idElemento);
  const dataExpiracao = new Date(expiraEm);

  if (!elemento || Number.isNaN(dataExpiracao.getTime())) return;

  function atualizar() {
    const restante = dataExpiracao.getTime() - Date.now();

    if (restante <= 0) {
      elemento.textContent = "Pix expirado. Gere um novo codigo para continuar.";
      pararMonitoramentoPix();
      if (typeof aoExpirar === "function") aoExpirar();
      return;
    }

    elemento.textContent = `Este Pix expira em ${formatarTempoRestante(restante)}.`;
  }

  atualizar();
  pixCountdownTimer = setInterval(atualizar, 1000);
}

function criarLinkComprovante({ plano, email, telefone }) {
  const mensagemWhatsApp = encodeURIComponent(
    `Olá, segue comprovante de pagamento.\n\nPlano: ${plano}\nEmail: ${email}\nWhatsApp: ${telefone}`
  );

  return `https://wa.me/5511919628194?text=${mensagemWhatsApp}`;
}

async function consultarStatusPix({ paymentId, email, telefone }) {
  const res = await fetch(`${API}/pix/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_id: paymentId, email, telefone })
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Erro ao consultar Pix");

  return data.pagamento;
}

function renderizarPixExpirado(pixBox, acaoNovoPix) {
  pixBox.innerHTML = `
    <h3 style="color:#ef4444;">Pix expirado</h3>
    <p>O prazo de pagamento terminou. Gere um novo Pix para continuar com a assinatura.</p>
    <button class="generate-btn" onclick="${acaoNovoPix}">Gerar novo Pix</button>
  `;
}

function iniciarMonitoramentoPix({ paymentId, email, telefone, plano, pixBox }) {
  const linkComprovante = criarLinkComprovante({ plano, email, telefone });

  async function verificar() {
    try {
      const pagamento = await consultarStatusPix({ paymentId, email, telefone });

      if (pagamento.status === "cancelado") {
        pararMonitoramentoPix();
        renderizarPixExpirado(pixBox, "gerarPix()");
        return;
      }

      if (pagamento.status !== "confirmado") return;

      pararMonitoramentoPix();
      localStorage.setItem("cliente_email", email);
      localStorage.setItem("cliente_telefone", telefone);

      pixBox.innerHTML = `
        <h3 style="color:#22c55e;">Pix recebido!</h3>
        <p>Pagamento confirmado. Voce sera enviado para a Area do Cliente.</p>
        <a class="whatsapp-btn" href="${linkComprovante}" target="_blank" rel="noopener noreferrer">
          Enviar comprovante no WhatsApp
        </a>
        <button class="generate-btn" onclick="window.location.href='cliente.html'">
          Ir para Area do Cliente
        </button>
      `;

      setTimeout(() => {
        window.location.href = "cliente.html";
      }, 4000);
    } catch (error) {
      console.error(error);
    }
  }

  verificar();
  pixStatusTimer = setInterval(verificar, 6000);
}

async function gerarPix() {
  const planoId = document.getElementById("plano").value;
  const plano = document.getElementById("plano").selectedOptions[0].text;
  const pixBox = document.getElementById("pix");
  const contato = validarContatoFormulario({
    emailId: "email",
    telefoneId: "telefone",
    destino: pixBox
  });

  if (!contato.valido) return;

  const { email, telefone } = contato;

  pixBox.innerHTML = `<h3 style="color:#facc15;">Gerando Pix...</h3>`;
  pararMonitoramentoPix();

  try {
    const res = await fetch(`${API}/pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planoId, email, telefone })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Erro ao gerar Pix");

    const mensagemWhatsApp = encodeURIComponent(
      `Olá, segue comprovante de pagamento.\n\nPlano: ${plano}\nEmail: ${email}\nWhatsApp: ${telefone}`
    );

    pixBox.innerHTML = `
      <h3 style="color:#facc15;">Escaneie o QR Code</h3>
      <img src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">
      <p id="pixCountdown" class="pix-countdown">Calculando validade do Pix...</p>
      <textarea id="codigoPix" readonly>${escaparHtml(data.qr_code)}</textarea>
      <button class="generate-btn" onclick="copiarPix(this)">Copiar Pix</button>
      <a class="whatsapp-btn" href="https://wa.me/5511919628194?text=${mensagemWhatsApp}" target="_blank" rel="noopener noreferrer">
        Enviar comprovante no WhatsApp
      </a>
      <p style="color:#facc15;margin-top:15px;">Aguardando confirmacao automatica do Pix...</p>
    `;

    iniciarContadorPix(data.pix_expira_em, "pixCountdown", () => {
      renderizarPixExpirado(pixBox, "gerarPix()");
    });

    iniciarMonitoramentoPix({
      paymentId: data.payment_id,
      email,
      telefone,
      plano,
      pixBox
    });
  } catch (error) {
    pixBox.innerHTML = `<h3 style="color:#ef4444;">Erro ao gerar Pix</h3><p>${escaparHtml(error.message)}</p>`;
  }
}

async function copiarCodigo(id, botao) {
  const codigo = document.getElementById(id);
  if (!codigo) return;

  try {
    await navigator.clipboard.writeText(codigo.value);
  } catch {
    codigo.select();
    document.execCommand("copy");
  }

  if (botao) {
    const textoOriginal = botao.textContent;
    botao.textContent = "Pix copiado";
    botao.classList.add("copy-success");

    setTimeout(() => {
      botao.textContent = textoOriginal;
      botao.classList.remove("copy-success");
    }, 2200);
  }
}

function copiarPix(botao) {
  copiarCodigo("codigoPix", botao);
}

async function gerarTesteGratis() {
  const tipoTeste = document.getElementById("tipoTeste").value;
  const resultado = document.getElementById("resultadoTeste");
  const contato = validarContatoFormulario({
    emailId: "testeEmail",
    telefoneId: "testeTelefone",
    destino: resultado
  });

  if (!contato.valido) return;

  const { email, telefone } = contato;

  resultado.innerHTML = `<h3 style="color:#facc15;">Gerando teste...</h3>`;

  try {
    const res = await fetch(`${API}/teste-iptv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, telefone, tipoTeste })
    });

    const data = await res.json();

    if (!res.ok) {
      resultado.innerHTML = `<h3 style="color:#ef4444;">${escaparHtml(data.error || "Erro ao gerar teste.")}</h3>`;
      return;
    }

    localStorage.setItem("cliente_email", email);
    localStorage.setItem("cliente_telefone", telefone);

    resultado.innerHTML = `
      <h3 style="color:#22c55e;">Teste gerado com sucesso!</h3>
      <p>Redirecionando para a Area do Cliente...</p>
    `;

    setTimeout(() => {
      window.location.href = "cliente.html";
    }, 1500);

  } catch (error) {
    resultado.innerHTML = `<h3 style="color:#ef4444;">Erro ao gerar teste</h3>`;
  }
}
