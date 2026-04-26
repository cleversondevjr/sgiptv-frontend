const API = "https://sgiptv-backend.onrender.com";

function selecionarPlano(valor) {
  document.getElementById("plano").value = valor;
  document.getElementById("checkout").scrollIntoView();
}

async function gerarPix() {
  const plano = document.getElementById("plano").value;
  const email = document.getElementById("email").value;
  const telefone = document.getElementById("telefone").value;

  const pixBox = document.getElementById("pix");

  pixBox.innerHTML = "Gerando PIX...";

  try {
    const res = await fetch(`${API}/pix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plano,
        valor: plano,
        email,
        telefone
      })
    });

    const data = await res.json();

    pixBox.innerHTML = `
      <img src="data:image/png;base64,${data.qr_base64}" />
      <textarea>${data.qr_code}</textarea>
    `;

  } catch {
    pixBox.innerHTML = "Erro ao gerar PIX";
  }
}

// 🔥 NOVO: GERAR TESTE COM LOGIN AUTOMÁTICO
async function gerarTeste() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const telefone = document.getElementById("telefone").value.replace(/\D/g, "");
  const tipoTeste = document.getElementById("tipoTeste")?.value || "iptv_com_adulto";

  const box = document.getElementById("resultadoTeste");

  if (!email || !telefone) {
    box.innerHTML = "Preencha email e WhatsApp.";
    return;
  }

  box.innerHTML = "Gerando teste...";

  try {
    const res = await fetch(`${API}/teste-iptv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        telefone,
        tipoTeste
      })
    });

    const data = await res.json();

    if (!res.ok) {
      box.innerHTML = data.error || "Erro ao gerar teste.";
      return;
    }

    // 🔥 SALVA PARA LOGIN AUTOMÁTICO
    localStorage.setItem("cliente_email", email);
    localStorage.setItem("cliente_telefone", telefone);

    box.innerHTML = `
      <p style="color:#22c55e;">Teste gerado com sucesso!</p>
      <p>Redirecionando para área do cliente...</p>
    `;

    // 🔥 REDIRECIONA AUTOMATICAMENTE
    setTimeout(() => {
      window.location.href = "cliente.html";
    }, 1500);

  } catch (error) {
    console.error(error);
    box.innerHTML = "Erro ao gerar teste.";
  }
}