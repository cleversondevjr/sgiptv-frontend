window.onload = () => {
  document.getElementById("loader").style.display = "none";
};

function scrollCheckout() {
  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}

function selecionarPlano(valor) {
  document.getElementById("plano").value = valor;
  scrollCheckout();
}

async function gerarPix() {
  const valor = document.getElementById("plano").value;
  const plano = document.getElementById("plano").selectedOptions[0].text;
  const email = document.getElementById("email").value;

  if (!email) {
    alert("Digite seu email antes de gerar o Pix.");
    return;
  }

  document.getElementById("pix").innerHTML = "<p>Gerando Pix...</p>";

  try {
    const res = await fetch("https://0225-2804-14c-bf43-3092-f893-2434-3b6-7446.ngrok-free.app/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plano, valor, email })
    });

    if (!res.ok) {
      throw new Error("Erro na resposta do servidor");
    }

    const data = await res.json();

    document.getElementById("pix").innerHTML = `
      <img src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">
      <p><strong>Pix copia e cola:</strong></p>
      <textarea id="codigoPix" readonly>${data.qr_code}</textarea>
      <br><br>
      <button onclick="copiarPix()">Copiar Pix</button>
      <p>Após o pagamento, aguarde a confirmação automática.</p>
    `;

  } catch (error) {
    console.error(error);
    alert("Erro ao gerar Pix. Verifique se o backend e o ngrok estão rodando.");
    document.getElementById("pix").innerHTML = "";
  }
}

function copiarPix() {
  const texto = document.getElementById("codigoPix").value;
  navigator.clipboard.writeText(texto);
  alert("Pix copiado!");
}