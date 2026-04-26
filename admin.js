const API = "https://sgiptv-backend.onrender.com";

async function loginAdmin() {
  const usuario = document.getElementById("adminUser").value;
  const senha = document.getElementById("adminPass").value;
  const msg = document.getElementById("loginMsg");

  if (!usuario || !senha) {
    msg.innerHTML = `<p class="erro">Preencha usuário e senha</p>`;
    return;
  }

  msg.innerHTML = `<p class="sucesso">Entrando...</p>`;

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ usuario, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.innerHTML = `<p class="erro">${data.error}</p>`;
      return;
    }

    localStorage.setItem("admin_token", data.token);

    msg.innerHTML = `<p class="sucesso">Login realizado!</p>`;

    setTimeout(() => {
      window.location.href = "admin.html";
    }, 800);

  } catch (error) {
    console.error(error);
    msg.innerHTML = `<p class="erro">Erro ao conectar</p>`;
  }
}