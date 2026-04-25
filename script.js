// ==========================
// GERAR PIX
// ==========================
async function gerarPix() {
  const plano = document.getElementById("plano").value;
  const email = document.getElementById("email").value;
  const resultado = document.getElementById("pixResultado");

  if (!plano || !email) {
    resultado.innerHTML = `
      <p style="color:#facc15;">Preencha todos os campos</p>
    `;
    return;
  }

  resultado.innerHTML = `
    <p>Gerando pagamento...</p>
  `;

  try {
    const res = await fetch("https://sgiptv-backend.onrender.com/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plano,
        valor: plano.split("R$")[1]?.replace(",", ".") || 0,
        email
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error("Erro ao gerar Pix");
    }

    resultado.innerHTML = `
      <h3>Escaneie o QR Code</h3>
      <img src="data:image/png;base64,${data.qr_base64}" style="width:200px;">
      <p>Ou copie o código:</p>
      <textarea readonly style="width:100%; height:80px;">${data.qr_code}</textarea>
    `;

  } catch (error) {
    console.error(error);

    resultado.innerHTML = `
      <p style="color:red;">Erro ao gerar Pix</p>
    `;
  }
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

    // 🔥 FORMATAÇÃO BONITA
    const formatado = (data.resposta || "Sem resposta")
      .replace(/,/g, "\n")
      .replace(/:/g, ": ");

    resultado.innerHTML = `
      <h3 style="color:#facc15;">Teste gerado com sucesso!</h3>
      <p>Enviamos os dados para seu email.</p>

      <textarea readonly 
        style="
          width:100%;
          height:120px;
          background:#020617;
          color:#22c55e;
          border:1px solid #334155;
          border-radius:8px;
          padding:10px;
        ">
${formatado}
      </textarea>
    `;

  } catch (error) {
    console.error(error);

    resultado.innerHTML = `
      <h3 style="color:#ef4444;">Erro ao gerar teste</h3>
      <p>${error.message}</p>
    `;
  }
}