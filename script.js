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
      body: JSON.stringify({ plano, valor: plano, email, telefone })
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