const API = "https://sgiptv-backend.onrender.com";
let clienteAtual = null;

function normalizarTelefone(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function nomePlano(valor) {
  const planos = {
    "30": "Mensal - 1 Tela",
    "50": "Mensal - 2 Telas",
    "80": "Trimestral - 1 Tela",
    "140": "Trimestral - 2 Telas"
  };

  return planos[String(valor)] || "Plano SG IPTV";
}

function formatarData(data) {
  if (!data) return "Não informado";

  try {
    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return "Não informado";
  }
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, telefone })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.innerHTML = `<p class="erro">${data.error || "Cliente não encontrado."}</p>`;
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

  // ===== CLIENTE DE TESTE =====
  if (cliente.tipoCliente === "teste") {
    const teste = cliente.ultimoTeste;

    box.innerHTML = `
      <h3 style="color:#facc15;">🎁 Teste Gratuito Ativo</h3>

      <div class="info-grid">
        <div class="info"><strong>Email</strong><p>${cliente.email}</p></div>
        <div class="info"><strong>WhatsApp</strong><p>${cliente.telefone}</p></div>
        <div class="info"><strong>Login IPTV</strong><p>${teste.login}</p></div>
        <div class="info"><strong>Senha IPTV</strong><p>${teste.senha}</p></div>
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#facc15;">📺 Tipo de Acesso</h3>
        <select>
          <option>IPTV COM ADULTO</option>
          <option>IPTV SEM ADULTO</option>
          <option>P2P</option>
        </select>
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#facc15;">💳 Ativar Plano</h3>

        <select id="planoRenovacao">
          <option value="30">Mensal 1 Tela - R$30</option>
          <option value="50">Mensal 2 Telas - R$50</option>
          <option value="80">Trimestral 1 Tela - R$80</option>
          <option value="140">Trimestral 2 Telas - R$140</option>
        </select>

        <button onclick="gerarPixRenovacao()" style="margin-top:10px;">
          Gerar Pix
        </button>

        <div id="pixRenovacao" style="margin-top:20px;"></div>
      </div>
    `;
    return;
  }

  // ===== CLIENTE COM PAGAMENTO =====
  const pagamento = cliente.ultimoPagamento;

  if (!pagamento) {
    box.innerHTML = `<p class="erro">Nenhum pagamento encontrado.</p>`;
    return;
  }

  const statusClass = pagamento.status === "confirmado"
    ? "status-confirmado"
    : "status-pendente";

  box.innerHTML = `
    <div class="info-grid">
      <div class="info"><strong>Email</strong><p>${cliente.email}</p></div>
      <div class="info"><strong>WhatsApp</strong><p>${cliente.telefone}</p></div>
      <div class="info"><strong>Plano atual</strong><p>${pagamento.plano || nomePlano(pagamento.valor)}</p></div>
      <div class="info"><strong>Valor</strong><p>R$ ${pagamento.valor}</p></div>
      <div class="info"><strong>Status</strong><p class="${statusClass}">${pagamento.status}</p></div>
      <div class="info"><strong>Data</strong><p>${formatarData(pagamento.criado_em)}</p></div>
    </div>

    <div style="margin-top:30px;">
      <h3 style="color:#facc15;">🔄 Renovar Plano</h3>

      <select id="planoRenovacao">
        <option value="30">Mensal 1 Tela - R$30</option>
        <option value="50">Mensal 2 Telas - R$50</option>
        <option value="80">Trimestral 1 Tela - R$80</option>
        <option value="140">Trimestral 2 Telas - R$140</option>
      </select>

      <button onclick="gerarPixRenovacao()" style="margin-top:10px;">
        Gerar Pix
      </button>

      <div id="pixRenovacao" style="margin-top:20px;"></div>
    </div>
  `;
}

async function gerarPixRenovacao() {
  if (!clienteAtual) return;

  const valor = document.getElementById("planoRenovacao").value;
  const plano = nomePlano(valor);
  const email = clienteAtual.email;
  const telefone = clienteAtual.telefone;
  const box = document.getElementById("pixRenovacao");

  box.innerHTML = `<p style="color:#facc15;">Gerando Pix...</p>`;

  try {
    const res = await fetch(`${API}/pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano, valor, email, telefone })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    box.innerHTML = `
      <img src="data:image/png;base64,${data.qr_base64}">
      <textarea readonly>${data.qr_code}</textarea>
    `;

  } catch (error) {
    box.innerHTML = `<p class="erro">${error.message}</p>`;
  }
}

function sairCliente() {
  localStorage.clear();
  location.reload();
}

window.addEventListener("load", () => {
  const email = localStorage.getItem("cliente_email");
  const telefone = localStorage.getItem("cliente_telefone");

  if (email && telefone) {
    document.getElementById("clienteEmail").value = email;
    document.getElementById("clienteTelefone").value = telefone;
  }
});