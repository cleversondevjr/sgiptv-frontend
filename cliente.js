// 🔥 CLIENTE DE TESTE (ATUALIZADO)
if (cliente.tipoCliente === "teste") {
  const teste = cliente.ultimoTeste;

  box.innerHTML = `
    <h3 style="color:#facc15;">🎁 Teste Gratuito Ativo</h3>

    <div class="info-grid">
      <div class="info">
        <strong>Email</strong>
        <p>${cliente.email}</p>
      </div>

      <div class="info">
        <strong>WhatsApp</strong>
        <p>${cliente.telefone}</p>
      </div>

      <div class="info">
        <strong>Login IPTV</strong>
        <p>${teste.login}</p>
      </div>

      <div class="info">
        <strong>Senha IPTV</strong>
        <p>${teste.senha}</p>
      </div>
    </div>

    <div style="margin-top:30px;">
      <h3 style="color:#facc15;">📺 Tipo de Acesso</h3>

      <select>
        <option>IPTV COM ADULTO</option>
        <option>IPTV SEM ADULTO</option>
        <option>P2P</option>
      </select>

      <p style="margin-top:10px; color:#aaa;">
        Escolha o tipo de conteúdo para seu acesso.
      </p>
    </div>

    <div style="margin-top:30px;">
      <h3 style="color:#facc15;">💳 Ativar Plano</h3>

      <select id="planoRenovacao">
        <option value="30">Mensal 1 Tela - R$30</option>
        <option value="50">Mensal 2 Telas - R$50</option>
        <option value="80">Trimestral 1 Tela - R$80</option>
        <option value="140">Trimestral 2 Telas - R$140</option>
      </select>

      <button onclick="gerarPixRenovacao()" style="margin-top:10px;">
        Gerar Pix
      </button>

      <div id="pixRenovacao" style="margin-top:20px;"></div>
    </div>
  `;

  return;
}