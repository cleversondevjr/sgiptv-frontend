// 🔧 URL DO BACKEND
const API_URL = "https://sgiptv-backend.onrender.com";

// 🔄 NORMALIZA TELEFONE
function normalizarTelefone(numero) {
  return numero.replace(/\D/g, "");
}

// 🔐 EXTRAIR LOGIN E SENHA
function extrairLoginSenha(texto) {
  const userMatch = texto.match(/Usu[aá]rio[:\s]*([0-9]+)/i);
  const passMatch = texto.match(/Senha[:\s]*([0-9]+)/i);

  return {
    usuario: userMatch ? userMatch[1] : null,
    senha: passMatch ? passMatch[1] : null
  };
}

// 🚀 GERAR TESTE
async function gerarTesteGratis() {
  const email = document.getElementById("testeEmail").value.trim().toLowerCase();
  const telefoneOriginal = document.getElementById("testeTelefone").value;
  const telefone = normalizarTelefone(telefoneOriginal);
  const tipoTeste = document.getElementById("tipoTeste").value;

  const resultadoBox = document.getElementById("resultadoTeste");

  // VALIDAÇÃO
  if (!email || !telefone) {
    resultadoBox.innerHTML = `
      <h3 style="color:red;">Erro</h3>
      <p>Preencha email e WhatsApp corretamente.</p>
    `;
    return;
  }

  // LOADING
  resultadoBox.innerHTML = `
    <h3>Gerando teste...</h3>
    <p>Aguarde alguns segundos ⏳</p>
  `;

  try {
    const response = await fetch(`${API_URL}/teste-iptv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, telefone, tipoTeste })
    });

    const data = await response.json();

    if (!response.ok) {
      resultadoBox.innerHTML = `
        <h3 style="color:red;">Erro ao gerar teste</h3>
        <p>${data.error || "Tente novamente mais tarde."}</p>
      `;
      return;
    }

    // 🔥 EXTRAIR LOGIN E SENHA
    const credenciais = extrairLoginSenha(data.resposta);

    if (!credenciais.usuario || !credenciais.senha) {
      resultadoBox.innerHTML = `
        <h3 style="color:red;">Erro</h3>
        <p>Não foi possível identificar login e senha.</p>
      `;
      return;
    }

    // ✅ SUCESSO
    resultadoBox.innerHTML = `
      <h3 style="color:#22c55e;">Teste gerado com sucesso!</h3>
      <p>As configurações completas foram enviadas para seu email.</p>

      <div style="
        margin-top:15px;
        padding:15px;
        border-radius:10px;
        background:#020617;
        border:1px solid #7e22ce;
        text-align:left;
      ">
        <p><strong>Login:</strong> ${credenciais.usuario}</p>
        <p><strong>Senha:</strong> ${credenciais.senha}</p>
      </div>
    `;

  } catch (error) {
    console.error("Erro:", error);

    resultadoBox.innerHTML = `
      <h3 style="color:red;">Erro</h3>
      <p>Falha ao conectar com o servidor.</p>
    `;
  }
}

// 🚀 SCROLL SUAVE MENU
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    const target = document.querySelector(this.getAttribute("href"));

    if (target) {
      target.scrollIntoView({
        behavior: "smooth"
      });
    }
  });
});

// 🔄 REMOVER LOADING INICIAL
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
});