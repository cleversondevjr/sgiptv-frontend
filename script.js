const API = "https://sgiptv-backend.onrender.com";

window.onload = () => {
  document.getElementById("loader").style.display = "none";
};

function selecionarPlano(valor) {
  document.getElementById("plano").value = valor;
  document.getElementById("checkout").scrollIntoView();
}

async function gerarPix() {
  const valor = document.getElementById("plano").value;
  const email = document.getElementById("email").value;
  const telefone = document.getElementById("telefone").value;

  const res = await fetch(API + "/pix", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({valor,email,telefone})
  });

  const data = await res.json();

  document.getElementById("pix").innerHTML = `
    <img src="data:image/png;base64,${data.qr_base64}">
    <textarea>${data.qr_code}</textarea>
    <a href="https://wa.me/5511951623333" target="_blank">Enviar comprovante</a>
  `;
}

async function gerarTesteGratis() {
  const tipoTeste = document.getElementById("tipoTeste").value;
  const email = document.getElementById("testeEmail").value;
  const telefone = document.getElementById("testeTelefone").value;

  const res = await fetch(API + "/teste-iptv", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({tipoTeste,email,telefone})
  });

  const data = await res.json();

  document.getElementById("resultadoTeste").innerHTML = data.resposta;
}