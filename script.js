const API = "https://sgiptv-backend.onrender.com";
let pixStatusTimer = null;

window.addEventListener("load", () => {
  const loader = document.getElementById("loader");

  if (loader) {
    setTimeout(() => {
      loader.style.display = "none";
    }, 700);
  }
});

function selecionarPlano(valor) {
  const plano = document.getElementById("plano");
  const checkout = document.getElementById("checkout");
  const planoPorValor = {
    "30": "mensal_1_tela",
    "50": "mensal_2_telas",
    "80": "trimestral_1_tela",
    "140": "trimestral_2_telas"
  };

  if (plano) plano.value = planoPorValor[String(valor)] || valor;
  if (checkout) checkout.scrollIntoView({ behavior: "smooth" });
}

function normalizarTelefone(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pararMonitoramentoPix() {
  if (pixStatusTimer) {
    clearInterval(pixStatusTimer);
    pixStatusTimer = null;
  }
}

function criarLinkComprovante({ plano, email, telefone }) {
  const mensagemWhatsApp = encodeURIComponent(
    `Olá, segue comprovante de pagamento.\n\nPlano: ${plano}\nEmail: ${email}\nWhatsApp: ${telefone}`
  );

  return `https://wa.me/5511951623333?text=${mensagemWhatsApp}`;
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

function iniciarMonitoramentoPix({ paymentId, email, telefone, plano, pixBox }) {
  pararMonitoramentoPix();

  const linkComprovante = criarLinkComprovante({ plano, email, telefone });

  async function verificar() {
    try {
      const pagamento = await consultarStatusPix({ paymentId, email, telefone });

      if (pagamento.status === "cancelado") {
        pararMonitoramentoPix();

        pixBox.innerHTML = `
          <h3 style="color:#ef4444;">Pix cancelado</h3>
          <p>O prazo de 15 minutos expirou. Gere um novo Pix para continuar.</p>
        `;
        return;
      }

      if (pagamento.status !== "confirmado") return;

      pararMonitoramentoPix();
      localStorage.setItem("cliente_email", email);
      localStorage.setItem("cliente_telefone", telefone);

      pixBox.innerHTML = `
        <h3 style="color:#22c55e;">Pix recebido!</h3>
        <p>Pagamento confirmado. Você será enviado para a Área do Cliente.</p>
        <a class="whatsapp-btn" href="${linkComprovante}" target="_blank">
          Enviar comprovante no WhatsApp
        </a>
        <button class="generate-btn" onclick="window.location.href='cliente.html'">
          Ir para Área do Cliente
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
  const email = document.getElementById("email").value.trim().toLowerCase();
  const telefone = normalizarTelefone(document.getElementById("telefone").value);
  const pixBox = document.getElementById("pix");

  if (!email || !telefone) {
    pixBox.innerHTML = `<h3 style="color:#ef4444;">Preencha todos os campos</h3>`;
    return;
  }

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
      <h3 style="color:#facc15;">ESCANEIE O QR CODE</h3>
      <img src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">
      <textarea id="codigoPix" readonly>${escaparHtml(data.qr_code)}</textarea>
      <button class="generate-btn" onclick="copiarPix()">Copiar Pix</button>
      <a class="whatsapp-btn" href="https://wa.me/5511951623333?text=${mensagemWhatsApp}" target="_blank">
        Enviar comprovante no WhatsApp
      </a>
      <p style="color:#facc15;margin-top:15px;">Aguardando confirmação automática do Pix...</p>
    `;

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

function copiarPix() {
  const codigo = document.getElementById("codigoPix");
  if (!codigo) return;

  navigator.clipboard.writeText(codigo.value);
  alert("Pix copiado com sucesso!");
}

async function gerarTesteGratis() {
  const tipoTeste = document.getElementById("tipoTeste").value;
  const email = document.getElementById("testeEmail").value.trim().toLowerCase();
  const telefone = normalizarTelefone(document.getElementById("testeTelefone").value);
  const resultado = document.getElementById("resultadoTeste");

  if (!email || !telefone) {
    resultado.innerHTML = `<h3 style="color:#facc15;">Preencha todos os campos</h3>`;
    return;
  }

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
      <p>Redirecionando para a Área do Cliente...</p>
    `;

    setTimeout(() => {
      window.location.href = "cliente.html";
    }, 1500);

  } catch (error) {
    resultado.innerHTML = `<h3 style="color:#ef4444;">Erro ao gerar teste</h3>`;
  }
}
