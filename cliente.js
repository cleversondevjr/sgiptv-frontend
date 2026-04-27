const API = "https://sgiptv-backend.onrender.com";
let clienteAtual = null;
let pixStatusTimer = null;
let pixCountdownTimer = null;

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

function nomePlano(valor) {
  const planos = {
    mensal_1_tela: "Mensal - 1 Tela",
    mensal_2_telas: "Mensal - 2 Telas",
    trimestral_1_tela: "Trimestral - 1 Tela",
    trimestral_2_telas: "Trimestral - 2 Telas",
    "30": "Mensal - 1 Tela",
    "50": "Mensal - 2 Telas",
    "80": "Trimestral - 1 Tela",
    "140": "Trimestral - 2 Telas"
  };

  return planos[String(valor)] || "Plano SG IPTV";
}

function valorPlano(planoId) {
  const valores = {
    mensal_1_tela: 30,
    mensal_2_telas: 50,
    trimestral_1_tela: 80,
    trimestral_2_telas: 140,
    "30": 30,
    "50": 50,
    "80": 80,
    "140": 140
  };

  return valores[String(planoId)] || "";
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

function validarLoginCliente() {
  const email = document.getElementById("clienteEmail").value.trim().toLowerCase();
  const telefone = normalizarTelefone(document.getElementById("clienteTelefone").value);
  let valido = true;

  limparErroCampo("clienteEmail");
  limparErroCampo("clienteTelefone");

  if (!emailValido(email)) {
    mostrarErroCampo("clienteEmail", "Digite um email valido.");
    valido = false;
  }

  if (!telefoneValido(telefone)) {
    mostrarErroCampo("clienteTelefone", "Digite um WhatsApp com DDD.");
    valido = false;
  }

  return { valido, email, telefone };
}

function formatarData(data) {
  if (!data) return "Não informado";

  try {
    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return "Não informado";
  }
}

function textoExpiracao(item) {
  if (!item?.data_expiracao) return "Aguardando confirmação";

  return item.expirado
    ? `${formatarData(item.data_expiracao)} (vencido)`
    : formatarData(item.data_expiracao);
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

function criarLinkComprovante({ plano, valor, email, telefone }) {
  const mensagem = encodeURIComponent(
    `Olá, segue comprovante de pagamento.\n\n` +
    `Plano: ${plano}\n` +
    `Valor: R$ ${valor},00\n` +
    `Email: ${email}\n` +
    `WhatsApp: ${telefone}`
  );

  return `https://wa.me/5511951623333?text=${mensagem}`;
}

async function consultarStatusPix({ paymentId, email, telefone }) {
  const res = await fetch(`${API}/pix/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ payment_id: paymentId, email, telefone })
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Erro ao consultar Pix.");

  return data.pagamento;
}

function renderizarPixExpirado(box) {
  box.innerHTML = `
    <h3 style="color:#ef4444;">Pix expirado</h3>
    <p>O prazo de pagamento terminou. Gere um novo Pix para continuar.</p>
    <button onclick="gerarPixRenovacao()">Gerar novo Pix</button>
  `;
}

function iniciarMonitoramentoPix({ paymentId, email, telefone, plano, valor, box }) {
  const linkComprovante = criarLinkComprovante({ plano, valor, email, telefone });

  async function verificar() {
    try {
      const pagamento = await consultarStatusPix({ paymentId, email, telefone });

      if (pagamento.status === "cancelado") {
        pararMonitoramentoPix();
        renderizarPixExpirado(box);
        return;
      }

      if (pagamento.status !== "confirmado") return;

      pararMonitoramentoPix();
      localStorage.setItem("cliente_email", email);
      localStorage.setItem("cliente_telefone", telefone);

      box.innerHTML = `
        <h3 style="color:#22c55e;">Pix recebido!</h3>
        <p>Pagamento confirmado. Atualizando sua Area do Cliente...</p>
        <a class="whatsapp-btn" href="${linkComprovante}" target="_blank" rel="noopener noreferrer">
          Enviar comprovante no WhatsApp
        </a>
        <button onclick="consultarCliente()">Atualizar meu plano</button>
      `;

      setTimeout(() => {
        consultarCliente();
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  }

  verificar();
  pixStatusTimer = setInterval(verificar, 6000);
}

async function consultarCliente() {
  const msg = document.getElementById("loginMensagem");
  const contato = validarLoginCliente();

  if (!contato.valido) {
    msg.innerHTML = `<p class="erro">Revise email e WhatsApp para entrar.</p>`;
    return;
  }

  const { email, telefone } = contato;

  msg.innerHTML = `<p class="sucesso">Consultando...</p>`;

  try {
    const res = await fetch(`${API}/cliente/consulta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, telefone })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.innerHTML = `<p class="erro">${escaparHtml(data.error || "Cliente não encontrado.")}</p>`;
      return;
    }

    clienteAtual = data.cliente;

    localStorage.setItem("cliente_email", email);
    localStorage.setItem("cliente_telefone", telefone);

    document.getElementById("loginBox").style.display = "none";
    document.getElementById("painelCliente").style.display = "block";

    montarPainel(clienteAtual);

  } catch (error) {
    console.error(error);
    msg.innerHTML = `<p class="erro">Erro ao consultar cliente.</p>`;
  }
}

function renderizarCredencial(label, valor, id) {
  return `
    <div class="info secure-info">
      <strong>${escaparHtml(label)}</strong>
      <div class="secure-value">
        <input id="${id}" type="password" value="${escaparHtml(valor)}" readonly>
        <button type="button" onclick="alternarCredencial('${id}', this)">Mostrar</button>
        <button type="button" onclick="copiarValor('${id}', this)">Copiar</button>
      </div>
    </div>
  `;
}

function alternarCredencial(id, botao) {
  const campo = document.getElementById(id);
  if (!campo) return;

  const mostrando = campo.type === "text";
  campo.type = mostrando ? "password" : "text";
  botao.textContent = mostrando ? "Mostrar" : "Ocultar";
}

async function copiarValor(id, botao) {
  const campo = document.getElementById(id);
  if (!campo) return;

  try {
    await navigator.clipboard.writeText(campo.value);
  } catch {
    campo.select();
    document.execCommand("copy");
  }

  const textoOriginal = botao.textContent;
  botao.textContent = "Copiado";

  setTimeout(() => {
    botao.textContent = textoOriginal;
  }, 1800);
}

function configurarRenovacao(titulo) {
  const renovarBox = document.getElementById("renovarBox");
  const renovarTitulo = document.getElementById("renovarTitulo");
  const pixRenovacao = document.getElementById("pixRenovacao");

  if (renovarBox) renovarBox.style.display = "block";
  if (renovarTitulo) renovarTitulo.textContent = titulo;
  if (pixRenovacao) pixRenovacao.innerHTML = "";
}

function montarPainel(cliente) {
  const box = document.getElementById("dadosCliente");

  if (cliente.tipoCliente === "teste") {
    const teste = cliente.ultimoTeste;

    configurarRenovacao("Ativar Plano");

    box.innerHTML = `
      <h3 style="color:#facc15;">Teste Gratuito Ativo</h3>

      <div class="info-grid">
        <div class="info">
          <strong>Email</strong>
          <p>${escaparHtml(cliente.email)}</p>
        </div>

        <div class="info">
          <strong>WhatsApp</strong>
          <p>${escaparHtml(formatarTelefone(cliente.telefone))}</p>
        </div>

        ${renderizarCredencial("Login IPTV", teste.login, "credTesteLogin")}
        ${renderizarCredencial("Senha IPTV", teste.senha, "credTesteSenha")}

        <div class="info">
          <strong>Teste gerado em</strong>
          <p>${escaparHtml(formatarData(teste.criado_em))}</p>
        </div>

        <div class="info">
          <strong>Expira em</strong>
          <p class="${teste.expirado ? "status-pendente" : "status-confirmado"}">${escaparHtml(textoExpiracao(teste))}</p>
        </div>
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#facc15;">Tipo de Acesso</h3>

        <select id="tipoTesteCliente">
          <option value="iptv_com_adulto">IPTV completo com adulto</option>
          <option value="iptv_sem_adulto">IPTV completo sem adulto</option>
          <option value="p2p">P2P completo para celular</option>
        </select>

        <p style="margin-top:10px; color:#aaa;">
          Escolha o tipo de conteudo desejado para sua ativacao.
        </p>
      </div>
    `;

    return;
  }

  configurarRenovacao("Renovar Plano");

  const pagamento = cliente.ultimoPagamento;

  if (!pagamento) {
    box.innerHTML = `
      <p class="erro">Nenhum pagamento encontrado.</p>
    `;
    return;
  }

  const statusClass = pagamento.status === "confirmado"
    ? "status-confirmado"
    : "status-pendente";
  const linkComprovante = criarLinkComprovante({
    plano: pagamento.plano || nomePlano(pagamento.valor),
    valor: pagamento.valor,
    email: cliente.email,
    telefone: cliente.telefone
  });

  box.innerHTML = `
    <div class="info-grid">
      <div class="info">
        <strong>Email</strong>
        <p>${escaparHtml(cliente.email)}</p>
      </div>

      <div class="info">
        <strong>WhatsApp</strong>
        <p>${escaparHtml(formatarTelefone(cliente.telefone))}</p>
      </div>

      <div class="info">
        <strong>Plano atual</strong>
        <p>${escaparHtml(pagamento.plano || nomePlano(pagamento.valor))}</p>
      </div>

      <div class="info">
        <strong>Valor</strong>
        <p>R$ ${escaparHtml(pagamento.valor)}</p>
      </div>

      <div class="info">
        <strong>Status</strong>
        <p class="${statusClass}">${escaparHtml(pagamento.status)}</p>
      </div>

      <div class="info">
        <strong>Pagamento gerado em</strong>
        <p>${escaparHtml(formatarData(pagamento.criado_em))}</p>
      </div>

      <div class="info">
        <strong>Duração</strong>
        <p>${escaparHtml(pagamento.dias_plano ? `${pagamento.dias_plano} dias` : "Não informado")}</p>
      </div>

      <div class="info">
        <strong>Expira em</strong>
        <p class="${pagamento.expirado ? "status-pendente" : "status-confirmado"}">${escaparHtml(textoExpiracao(pagamento))}</p>
      </div>
    </div>

    <a class="whatsapp-btn" href="${linkComprovante}" target="_blank" rel="noopener noreferrer">
      Enviar comprovante no WhatsApp
    </a>

    <div style="margin-top:30px;">
      <h3 style="color:#facc15;">Alterar Tipo de Acesso</h3>

      <select id="tipoTesteCliente">
        <option value="iptv_com_adulto">IPTV completo com adulto</option>
        <option value="iptv_sem_adulto">IPTV completo sem adulto</option>
        <option value="p2p">P2P completo para celular</option>
      </select>

      <p style="margin-top:10px; color:#aaa;">
        Escolha o tipo de conteudo desejado.
      </p>
    </div>
  `;
}

async function gerarPixRenovacao() {
  if (!clienteAtual) return;

  const planoSelect = document.getElementById("planoRenovacao");
  const box = document.getElementById("pixRenovacao");

  if (!planoSelect || !box) return;

  const planoId = planoSelect.value;
  const valor = valorPlano(planoId);
  const plano = nomePlano(planoId);
  const email = clienteAtual.email;
  const telefone = clienteAtual.telefone;

  box.innerHTML = `<p style="color:#facc15;">Gerando Pix...</p>`;
  pararMonitoramentoPix();

  try {
    const res = await fetch(`${API}/pix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ planoId, email, telefone })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao gerar Pix.");
    }

    const mensagem = encodeURIComponent(
      `Olá, segue comprovante de pagamento.\n\n` +
      `Plano: ${plano}\n` +
      `Valor: R$ ${valor},00\n` +
      `Email: ${email}\n` +
      `WhatsApp: ${telefone}`
    );

    box.innerHTML = `
      <h3 style="color:#facc15;">Pix gerado</h3>

      <img src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">

      <p id="pixCountdownRenovacao" class="pix-countdown">Calculando validade do Pix...</p>

      <p>Copie o codigo Pix:</p>

      <textarea id="codigoPixRenovacao" readonly>${escaparHtml(data.qr_code)}</textarea>

      <button onclick="copiarPixRenovacao(this)">Copiar Pix</button>

      <a class="whatsapp-btn" href="https://wa.me/5511951623333?text=${mensagem}" target="_blank" rel="noopener noreferrer">
        Enviar comprovante no WhatsApp
      </a>
      <p style="color:#facc15;margin-top:15px;">Aguardando confirmacao automatica do Pix...</p>
    `;

    iniciarContadorPix(data.pix_expira_em, "pixCountdownRenovacao", () => {
      renderizarPixExpirado(box);
    });

    iniciarMonitoramentoPix({
      paymentId: data.payment_id,
      email,
      telefone,
      plano,
      valor,
      box
    });

  } catch (error) {
    console.error(error);
    box.innerHTML = `<p class="erro">${escaparHtml(error.message)}</p>`;
  }
}

function copiarPixRenovacao(botao) {
  copiarValor("codigoPixRenovacao", botao);
}

function sairCliente() {
  localStorage.removeItem("cliente_email");
  localStorage.removeItem("cliente_telefone");
  location.reload();
}

window.addEventListener("load", () => {
  aplicarMascaraTelefone("clienteTelefone");

  const email = localStorage.getItem("cliente_email");
  const telefone = localStorage.getItem("cliente_telefone");

  if (email && telefone) {
    document.getElementById("clienteEmail").value = email;
    document.getElementById("clienteTelefone").value = formatarTelefone(telefone);

    consultarCliente();
  }
});
