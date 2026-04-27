const API = "https://sgiptv-backend.onrender.com";
let clienteAtual = null;
let pixStatusTimer = null;

function normalizarTelefone(numero) {
  return String(numero || "").replace(/\D/g, "");
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

function pararMonitoramentoPix() {
  if (pixStatusTimer) {
    clearInterval(pixStatusTimer);
    pixStatusTimer = null;
  }
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

function iniciarMonitoramentoPix({ paymentId, email, telefone, plano, valor, box }) {
  pararMonitoramentoPix();

  const linkComprovante = criarLinkComprovante({ plano, valor, email, telefone });

  async function verificar() {
    try {
      const pagamento = await consultarStatusPix({ paymentId, email, telefone });

      if (pagamento.status === "cancelado") {
        pararMonitoramentoPix();

        box.innerHTML = `
          <h3 style="color:#ef4444;">Pix cancelado</h3>
          <p>O prazo de 15 minutos expirou. Gere um novo Pix para continuar.</p>
        `;
        return;
      }

      if (pagamento.status !== "confirmado") return;

      pararMonitoramentoPix();
      localStorage.setItem("cliente_email", email);
      localStorage.setItem("cliente_telefone", telefone);

      box.innerHTML = `
        <h3 style="color:#22c55e;">Pix recebido!</h3>
        <p>Pagamento confirmado. Atualizando sua Área do Cliente...</p>
        <a class="whatsapp-btn" href="${linkComprovante}" target="_blank">
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
  const email = document.getElementById("clienteEmail").value.trim().toLowerCase();
  const telefone = normalizarTelefone(document.getElementById("clienteTelefone").value);
  const msg = document.getElementById("loginMensagem");

  if (!email || !telefone) {
    msg.innerHTML = `<p class="erro">Informe email e WhatsApp.</p>`;
    return;
  }

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

function montarPainel(cliente) {
  const box = document.getElementById("dadosCliente");

  if (cliente.tipoCliente === "teste") {
    const teste = cliente.ultimoTeste;

    box.innerHTML = `
      <h3 style="color:#facc15;">🎁 Teste Gratuito Ativo</h3>

      <div class="info-grid">
        <div class="info">
          <strong>Email</strong>
          <p>${escaparHtml(cliente.email)}</p>
        </div>

        <div class="info">
          <strong>WhatsApp</strong>
          <p>${escaparHtml(cliente.telefone)}</p>
        </div>

        <div class="info">
          <strong>Login IPTV</strong>
          <p>${escaparHtml(teste.login)}</p>
        </div>

        <div class="info">
          <strong>Senha IPTV</strong>
          <p>${escaparHtml(teste.senha)}</p>
        </div>

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
        <h3 style="color:#facc15;">📺 Tipo de Acesso</h3>

        <select id="tipoTesteCliente">
          <option value="iptv_com_adulto">⚡ IPTV COMPLETO C/ ADULTO</option>
          <option value="iptv_sem_adulto">⚡ IPTV COMPLETO S/ ADULTO</option>
          <option value="p2p">🔥 P2P COMPLETO (CELULAR)</option>
        </select>

        <p style="margin-top:10px; color:#aaa;">
          Escolha o tipo de conteúdo desejado para sua ativação.
        </p>
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#facc15;">💳 Ativar Plano</h3>

        <select id="planoRenovacao">
          <option value="mensal_1_tela">Mensal 1 Tela - R$30</option>
          <option value="mensal_2_telas">Mensal 2 Telas - R$50</option>
          <option value="trimestral_1_tela">Trimestral 1 Tela - R$80</option>
          <option value="trimestral_2_telas">Trimestral 2 Telas - R$140</option>
        </select>

        <button onclick="gerarPixRenovacao()" style="margin-top:10px;">
          Gerar Pix
        </button>

        <div id="pixRenovacao" style="margin-top:20px;"></div>
      </div>
    `;

    return;
  }

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
        <p>${escaparHtml(cliente.telefone)}</p>
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

    <a class="whatsapp-btn" href="${linkComprovante}" target="_blank">
      Enviar comprovante no WhatsApp
    </a>

    <div style="margin-top:30px;">
      <h3 style="color:#facc15;">📺 Alterar Tipo de Acesso</h3>

      <select id="tipoTesteCliente">
        <option value="iptv_com_adulto">⚡ IPTV COMPLETO C/ ADULTO</option>
        <option value="iptv_sem_adulto">⚡ IPTV COMPLETO S/ ADULTO</option>
        <option value="p2p">🔥 P2P COMPLETO (CELULAR)</option>
      </select>

      <p style="margin-top:10px; color:#aaa;">
        Escolha o tipo de conteúdo desejado.
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
      `📦 Plano: ${plano}\n` +
      `💰 Valor: R$ ${valor},00\n` +
      `📧 Email: ${email}\n` +
      `📱 WhatsApp: ${telefone}`
    );

    box.innerHTML = `
      <h3 style="color:#facc15;">Pix gerado</h3>

      <img src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">

      <p>Copie o código Pix:</p>

      <textarea id="codigoPixRenovacao" readonly>${escaparHtml(data.qr_code)}</textarea>

      <button onclick="copiarPixRenovacao()">Copiar Pix</button>

      <a class="whatsapp-btn" href="https://wa.me/5511951623333?text=${mensagem}" target="_blank">
        Enviar comprovante no WhatsApp
      </a>
      <p style="color:#facc15;margin-top:15px;">Aguardando confirmação automática do Pix...</p>
    `;

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

function copiarPixRenovacao() {
  const codigo = document.getElementById("codigoPixRenovacao");

  if (!codigo) return;

  navigator.clipboard.writeText(codigo.value);
  alert("Pix copiado com sucesso!");
}

function sairCliente() {
  localStorage.removeItem("cliente_email");
  localStorage.removeItem("cliente_telefone");
  location.reload();
}

window.addEventListener("load", () => {
  const email = localStorage.getItem("cliente_email");
  const telefone = localStorage.getItem("cliente_telefone");

  if (email && telefone) {
    document.getElementById("clienteEmail").value = email;
    document.getElementById("clienteTelefone").value = telefone;

    consultarCliente();
  }
});
