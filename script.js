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
    <h3 style="color:#facc15;">Gerando Pix...</h3>
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

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao gerar Pix");
    }

    pixBox.innerHTML = `
      <h3 style="color:#facc15;">ESCANEIE O QR CODE</h3>
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
      <h3 style="color:#ef4444;">Erro ao gerar Pix</h3>
      <p>${error.message}</p>
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
// NORMALIZAR TELEFONE
// ==========================
function normalizarTelefone(telefone) {
  return String(telefone || "").replace(/\D/g, "");
}

// ==========================
// DECODIFICAR RETORNO DO PAINEL
// ==========================
function decodificarRespostaPainel(texto) {
  return String(texto || "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, codigo) => {
      return String.fromCharCode(parseInt(codigo, 16));
    });
}

// ==========================
// EXTRAIR LOGIN E SENHA
// ==========================
function extrairLoginSenha(respostaOriginal) {
  const resposta = decodificarRespostaPainel(respostaOriginal);

  let login = null;
  let senha = null;

  const linhas = resposta
    .split("\n")
    .map(linha => linha.trim())
    .filter(Boolean);

  for (const linha of linhas) {
    const linhaLimpa = linha.replace(/\*/g, "").trim();

    if (!login) {
      const loginMatch = linhaLimpa.match(/^(usu[aá]rio|usuario|login|user)\s*:?\s*(.+)$/i);
      if (loginMatch) {
        login = loginMatch[2].trim();
      }
    }

    if (!senha) {
      const senhaMatch = linhaLimpa.match(/^(senha|password|pass)\s*:?\s*(.+)$/i);
      if (senhaMatch) {
        senha = senhaMatch[2].trim();
      }
    }
  }

  if (!login) {
    const loginUrlMatch = resposta.match(/username=([^&\s\n\r]+)/i);
    if (loginUrlMatch) {
      login = loginUrlMatch[1].trim();
    }
  }

  if (!senha) {
    const senhaUrlMatch = resposta.match(/password=([^&\s\n\r]+)/i);
    if (senhaUrlMatch) {
      senha = senhaUrlMatch[1].trim();
    }
  }

  return {
    login: login || "Verifique seu email",
    senha: senha || "Verifique seu email"
  };
}

// ==========================
// TESTE IPTV GRÁTIS
// ==========================
async function gerarTesteGratis() {
  const email = document.getElementById("testeEmail").value.trim().toLowerCase();
  const telefoneOriginal = document.getElementById("testeTelefone").value;
  const telefone = normalizarTelefone(telefoneOriginal);
  const resultado = document.getElementById("resultadoTeste");

  if (!email || !telefone) {
    resultado.innerHTML = `
      <h3 style="color:#facc15;">Preencha todos os campos</h3>
      <p>Informe email e WhatsApp para gerar o teste.</p>
    `;
    return;
  }

  resultado.innerHTML = `
    <h3 style="color:#facc15;">Gerando teste...</h3>
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
      resultado.innerHTML = `
        <h3 style="color:#ef4444;">Não foi possível gerar o teste</h3>
        <p>${data.error || "Erro ao gerar teste."}</p>
      `;
      return;
    }

    const dados = extrairLoginSenha(data.resposta);

    const mensagemWhatsApp = encodeURIComponent(
      `Olá! Meu teste SG IPTV foi gerado.\n\nLogin: ${dados.login}\nSenha: ${dados.senha}\n\nEmail: ${email}`
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
        max-width:420px;
      ">
        <p style="margin:8px 0;">
          <strong style="color:#facc15;">Login:</strong>
          <span style="color:#fff;">${dados.login}</span>
        </p>

        <p style="margin:8px 0;">
          <strong style="color:#facc15;">Senha:</strong>
          <span style="color:#fff;">${dados.senha}</span>
        </p>
      </div>

      <a
        href="https://wa.me/55${telefone}?text=${mensagemWhatsApp}"
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
          max-width:420px;
        "
      >
        Enviar no WhatsApp
      </a>
    `;

  } catch (error) {
    console.error(error);

    resultado.innerHTML = `
      <h3 style="color:#ef4444;">Erro ao gerar teste</h3>
      <p>Não foi possível conectar ao servidor. Tente novamente.</p>
    `;
  }
}