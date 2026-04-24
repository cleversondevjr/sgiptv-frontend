window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loader").style.display = "none";
  }, 700);
});

function selecionarPlano(valor) {
  document.getElementById("plano").value = valor;
  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}

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
    const res = await fetch("https://0225-2804-14c-bf43-3092-f893-2434-3b6-7446.ngrok-free.app/pix", {
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
      <p>Verifique se o backend e o ngrok estão rodando.</p>
    `;
  }
}

function copiarPix() {
  const codigo = document.getElementById("codigoPix").value;
  navigator.clipboard.writeText(codigo);
  alert("Pix copiado com sucesso!");
}