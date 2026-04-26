const API = "https://sgiptv-backend.onrender.com";

function selecionarPlano(valor) {
  document.getElementById("plano").value = valor;
  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}

async function gerarPix() {
  const valor = document.getElementById("plano").value;
  const email = document.getElementById("email").value;
  const telefone = document.getElementById("telefone").value;

  const pixBox = document.getElementById("pix");

  pixBox.innerHTML = "Gerando pagamento...";

  const res = await fetch(API + "/pix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ valor, email, telefone })
  });

  const data = await res.json();

  pixBox.innerHTML = `
    <img src="data:image/png;base64,${data.qr_base64}" width="200">
    <textarea>${data.qr_code}</textarea>

    <p>Após pagar, envie o comprovante pelo WhatsApp:</p>

    <a href="https://wa.me/5511951623333?text=Olá, paguei o plano IPTV. Segue comprovante."
       target="_blank">
       FALAR NO WHATSAPP
    </a>
  `;
}