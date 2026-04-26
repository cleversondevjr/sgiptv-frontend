const API = "https://sgiptv-backend.onrender.com";

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

  if (plano) {
    plano.value = valor;
  }

  if (checkout) {
    checkout.scrollIntoView({ behavior: "smooth" });
  }
}

async function gerarPix() {
  const valor = document.getElementById("plano").value;
  const plano = document.getElementById("plano").selectedOptions[0].text;
  const email = document.getElementById("email").value.trim().toLowerCase();
  const telefone = document.getElementById("telefone").value.trim();
  const pixBox = document.getElementById("pix");

  if (!email || !telefone) {
    pixBox.innerHTML = `
      <h3 style="color:#ef4444;">Preencha os dados</h3>
      <p>Informe email e WhatsApp.</p>
    `;
    return;
  }

  pixBox.innerHTML = `
    <h3 style="color:#facc15;">Gerando QR Code Pix...</h3>
    <p>Aguarde alguns segundos...</p>
  `;

  try {
    const res = await fetch("https://sgiptv-backend.onrender.com/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ valor, email, telefone })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao gerar Pix");
    }

    pixBox.innerHTML = `
      <h3 style="color:#22c55e;">Pagamento gerado</h3>

      <p>Escaneie o QR Code:</p>

      <img 
        src="data:image/png;base64,${data.qr_base64}" 
        style="width:220px; margin:15px 0;"
      >

      <p>Ou copie o código:</p>

      <textarea id="codigoPix">${data.qr_code}</textarea>

      <button onclick="copiarPix()">Copiar Pix</button>

      <p style="margin-top:15px;">
        Após pagar, envie o comprovante no WhatsApp
      </p>

      <a 
        href="https://wa.me/5511951623333"
        target="_blank"
        class="generate-btn"
      >
        Enviar comprovante
      </a>
    `;

  } catch (error) {
    console.error(error);

    pixBox.innerHTML = `
      <h3 style="color:#ef4444;">Erro ao gerar Pix</h3>
      <p>${error.message}</p>
    `;
  }
}

function copiarPix() {
  const codigo = document.getElementById("codigoPix");

  if (!codigo) return;

  navigator.clipboard.writeText(codigo.value);
  alert("Código Pix copiado!");
}

function normalizarTelefone(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function decodificarRespostaPainel(texto) {
  return String(texto || "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, codigo) => {
      return String.fromCharCode(parseInt(codigo, 16));
    });
}

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

async function gerarTesteGratis() {
  const tipoTeste = document.getElementById("tipoTeste").value;
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
    const res = await fetch(`${API}/teste-iptv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, telefone, tipoTeste })
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
    `;

  } catch (error) {
    console.error(error);

    resultado.innerHTML = `
      <h3 style="color:#ef4444;">Erro ao gerar teste</h3>
      <p>Não foi possível conectar ao servidor. Tente novamente.</p>
    `;
  }
}