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
      headers: {
        "Content-Type": "application/json"
      },
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
  const pagamento = cliente.ultimoPagamento;

  if (!pagamento) {
    box.innerHTML = `
      <p class="erro">Nenhum pagamento encontrado para este email e WhatsApp.</p>
    `;
    return;
  }

  const statusClass = pagamento.status === "confirmado"
    ? "status-confirmado"
    : "status-pendente";

  box.innerHTML = `
    <div class="info-grid">
      <div class="info">
        <strong>Email</strong>
        <p>${cliente.email}</p>
      </div>

      <div class="info">
        <strong>WhatsApp</strong>
        <p>${cliente.telefone}</p>
      </div>

      <div class="info">
        <strong>Plano atual</strong>
        <p>${pagamento.plano || nomePlano(pagamento.valor)}</p>
      </div>

      <div class="info">
        <strong>Valor</strong>
        <p>R$ ${pagamento.valor}</p>
      </div>

      <div class="info">
        <strong>Status</strong>
        <p class="${statusClass}">${pagamento.status}</p>
      </div>

      <div class="info">
        <strong>Data</strong>
        <p>${formatarData(pagamento.criado_em)}</p>
      </div>
    </div>

    <p style="margin-top:20px;">
      Caso seu pagamento esteja confirmado, envie seu nome de usuário pelo WhatsApp para ativação ou renovação no painel IPTV.
    </p>
  `;
}

async function gerarPixRenovacao() {
  if (!clienteAtual) {
    return;
  }

  const valor = document.getElementById("planoRenovacao").value;
  const plano = nomePlano(valor);
  const email = clienteAtual.email;
  const telefone = clienteAtual.telefone;
  const box = document.getElementById("pixRenovacao");

  box.innerHTML = `
    <h3 style="color:#facc15;">Gerando Pix...</h3>
    <p>Aguarde alguns segundos.</p>
  `;

  try {
    const res = await fetch(`${API}/pix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plano, valor, email, telefone })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao gerar Pix.");
    }

    const mensagem = encodeURIComponent(
      `Olá, segue comprovante de pagamento para renovação.\n\n` +
      `📦 Plano: ${plano}\n` +
      `💰 Valor: R$ ${valor},00\n` +
      `📧 Email: ${email}\n` +
      `📱 WhatsApp: ${telefone}\n\n` +
      `Vou enviar o comprovante agora para ativação/renovação.`
    );

    box.innerHTML = `
      <h3 style="color:#facc15;">Pix de renovação gerado</h3>

      <img src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">

      <p>Copie o código Pix:</p>

      <textarea id="codigoPixRenovacao" readonly>${data.qr_code}</textarea>

      <button onclick="copiarPixRenovacao()">Copiar Pix</button>

      <a class="whatsapp-btn" href="https://wa.me/5511951623333?text=${mensagem}" target="_blank">
        Enviar comprovante no WhatsApp
      </a>
    `;

  } catch (error) {
    console.error(error);
    box.innerHTML = `<p class="erro">${error.message}</p>`;
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
  }
});
