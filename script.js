// ==========================
// LOADER
// ==========================
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");

  if (loader) {
    setTimeout(() => {
      loader.style.display = "none";
    }, 700);
  }
});

// ==========================
// SELECIONAR PLANO
// ==========================
function selecionarPlano(valor) {
  document.getElementById("plano").value = valor;
  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}

// ==========================
// GERAR PIX
// ==========================
async function gerarPix() {
  const valor = document.getElementById("plano").value;
  const plano = document.getElementById("plano").selectedOptions[0].text;
  const email = document.getElementById("email").value;
  const pixBox = document.getElementById("pix");

  if (!email) {
    alert("Digite seu email antes de gerar o Pix.");
    return;
  }

  pixBox.innerHTML = `
    <h3>Gerando Pix...</h3>
    <p>Aguarde alguns segundos.</p>
  `;

  try {
    const res = await fetch("https://sgiptv-backend.onrender.com/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plano, valor, email })
    });

    if (!res.ok) {
      throw new Error("Erro ao gerar Pix");
    }

    const data = await res.json();

    pixBox.innerHTML = `
      <h3>ESCANEIE O QR CODE</h3>
      <p>OU COPIE O CÓDIGO PIX</p>
      <img src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">
      <textarea id="codigoPix" readonly>${data.qr_code}</textarea>
      <br><br>
      <button class="generate-btn" onclick="copiarPix()">Copiar Pix</button>
      <p>Após o pagamento, a confirmação será automática.</p>
    `;

  } catch (error) {
    console.error(error);
    pixBox.innerHTML = `
      <h3>Erro ao gerar Pix</h3>
      <p>Verifique se o backend está online.</p>
    `;
  }
}

// ==========================
// COPIAR PIX
// ==========================
function copiarPix() {
  const codigo = document.getElementById("codigoPix").value;
  navigator.clipboard.writeText(codigo);
  alert("Pix copiado com sucesso!");
}

// ==========================
// TESTE IPTV GRÁTIS
// ==========================
async function gerarTesteGratis() {
  const email = document.getElementById("testeEmail").value;
  const telefone = document.getElementById("testeTelefone").value;
  const resultado = document.getElementById("resultadoTeste");

  if (!email || !telefone) {
    resultado.innerHTML = `
      <h3 style="color:#facc15;">Preencha todos os campos</h3>
      <p>Informe email e WhatsApp para gerar o teste.</p>
    `;
    return;
  }

  resultado.innerHTML = `
    <h3>Gerando teste...</h3>
    <p>Aguarde alguns segundos.</p>
  `;

  try {
    const res = await fetch("https://sgiptv-backend.onrender.com/teste-iptv", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, telefone })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao gerar teste.");
    }

    // ==========================
    // EXTRAIR LOGIN E SENHA
    // ==========================
    const resposta = data.resposta || "";

    const usuarioMatch = resposta.match(/usu[aá]rio[:\s]+([^,\n\r]+)/i);
    const senhaMatch = resposta.match(/senha[:\s]+([^,\n\r]+)/i);

    const usuario = usuarioMatch ? usuarioMatch[1].trim() : "Verifique seu email";
    const senha = senhaMatch ? senhaMatch[1].trim() : "Verifique seu email";

    // ==========================
    // MENSAGEM WHATSAPP
    // ==========================
    const mensagemWhatsApp = encodeURIComponent(
      `Olá! Meu teste SG IPTV foi gerado.\n\nLogin: ${usuario}\nSenha: ${senha}\n\nEmail: ${email}`
    );

    resultado.innerHTML = `
      <h3 style="color:#facc15;">Teste gerado com sucesso!</h3>
      <p>As configurações completas foram enviadas para seu email.</p>

      <div style="
        background:#020617;
        border:1px solid #7e22ce;
        border-radius:12px;
        padding:18px;
        margin-top:15px;
        text-align:left;
      ">
        <p><strong style="color:#facc15;">Login:</strong> ${usuario}</p>
        <p><strong style="color:#facc15;">Senha:</strong> ${senha}</p>
      </div>

      <a
        href="https://wa.me/${telefone}?text=${mensagemWhatsApp}"
        target="_blank"
        style="
          display:block;
          margin-top:15px;
          background:#22c55e;
          color:#000;
          text-align:center;
          padding:13px;
          border-radius:8px;
          font-weight:bold;
          text-decoration:none;
        "
      >
        Enviar no WhatsApp
      </a>
    `;

  } catch (error) {
    console.error(error);

    resultado.innerHTML = `
      <h3 style="color:#ef4444;">Erro ao gerar teste</h3>
      <p>${error.message}</p>
    `;
  }
}