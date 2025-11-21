// dashboard.js (v5 - Completo com Filtros Avançados e CSV)

document.addEventListener("DOMContentLoaded", () => {

  // --- PARTE 1: DEFINIÇÕES DE ELEMENTOS ---
  const mainContent = document.getElementById("main-content");
  
  // Elementos de Autenticação e Usuário
  const token = localStorage.getItem("token");
  const usuarioStorage = localStorage.getItem("usuario");
  const userNameEl = document.getElementById("user-name");
  const logoutButton = document.getElementById("logout-button");
  let usuario;

  // Travas de salvamento
  let isSaving = false;
  let isSavingSenha = false;
  let isSavingProf = false; 
  let isSavingPaciente = false;
  let isSavingPrescricao = false;
  
  // Sidebar
  const btnVerEstoque = document.getElementById("btn-ver-estoque");
  const btnVerPacientes = document.getElementById("btn-ver-pacientes");
  
  const adminHeader = document.getElementById("admin-header");
  const btnCadastrarProf = document.getElementById("btn-cadastrar-prof");
  const btnVerProf = document.getElementById("btn-ver-prof");
  const clinicoHeader = document.getElementById("clinico-header");
  const btnTrocarSenha = document.getElementById("btn-trocar-senha");
  
  // Variáveis para a Visão de Estoque (Dinâmicas)
  let tableBody, btnAdicionar, fileCsvInput, btnImportarCsv; 
  // Elementos de Filtro
  let searchInput, filterTipo, filterLote, filterValidade, btnAplicarFiltros;
  // Cache de dados para filtragem
  let todosMedicamentos = [];

  // Elementos do Modal de Medicamento (Atualizado com novos campos)
  const modal = document.getElementById("medicamento-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalForm = document.getElementById("medicamento-form");
  const btnCancelarModal = document.getElementById("btn-cancelar-modal");
  const modalErrorMessage = document.getElementById("modal-error-message");
  
  const medIdInput = document.getElementById("medicamento-id");
  const medNomeInput = document.getElementById("medicamento-nome");
  const medQtdInput = document.getElementById("medicamento-qtd");
  const medFormatoInput = document.getElementById("medicamento-formato"); // Novo
  const medLoteInput = document.getElementById("medicamento-lote");       // Novo
  const medTipoInput = document.getElementById("medicamento-tipo");       // Novo
  const medValidadeInput = document.getElementById("medicamento-validade");
  const medVencidoInput = document.getElementById("medicamento-vencido");
  const btnSalvarModal = document.querySelector("#medicamento-form button[type='submit']");
  
  // Outros Modais (Senha, Profissional, Paciente, Prescrição)
  const senhaModal = document.getElementById("senha-modal");
  const senhaForm = document.getElementById("senha-form");
  const btnCancelarSenhaModal = document.getElementById("btn-cancelar-senha");
  const senhaErrorMessage = document.getElementById("senha-error-message");
  const senhaAntigaInput = document.getElementById("senha-antiga");
  const senhaNovaInput = document.getElementById("senha-nova");
  const btnSalvarSenhaModal = document.querySelector("#senha-form button[type='submit']");
  
  const profModal = document.getElementById("profissional-modal");
  const profForm = document.getElementById("profissional-form");
  const btnCancelarProfModal = document.getElementById("btn-cancelar-prof");
  const profErrorMessage = document.getElementById("prof-error-message");
  const profNomeInput = document.getElementById("prof-nome");
  const profCrmInput = document.getElementById("prof-crm");
  const profSenhaInput = document.getElementById("prof-senha");
  const profTipoInput = document.getElementById("prof-tipo");
  const btnSalvarProfModal = document.querySelector("#profissional-form button[type='submit']");

  const profListModal = document.getElementById("prof-list-modal");
  const profListTableBody = document.getElementById("prof-list-table-body");
  const btnFecharProfList = document.getElementById("btn-fechar-prof-list");
  
  const pacienteModal = document.getElementById("paciente-modal");
  const pacienteForm = document.getElementById("paciente-form");
  const pacienteModalTitle = document.getElementById("paciente-modal-title");
  const btnCancelarPaciente = document.getElementById("btn-cancelar-paciente");
  const pacienteErrorMessage = document.getElementById("paciente-error-message");
  const pacienteIdInput = document.getElementById("paciente-id");
  const pacienteNomeInput = document.getElementById("paciente-nome");
  const pacienteCpfInput = document.getElementById("paciente-cpf");
  const pacienteNascimentoInput = document.getElementById("paciente-nascimento");
  const btnSalvarPaciente = document.querySelector("#paciente-form button[type='submit']");

  const prescricaoModal = document.getElementById("prescricao-modal");
  const prescricaoForm = document.getElementById("prescricao-form");
  const prescricaoModalTitle = document.getElementById("prescricao-modal-title");
  const prescricaoPacienteIdInput = document.getElementById("prescricao-paciente-id");
  const prescricaoSearchInput = document.getElementById("prescricao-search");
  const prescricaoSearchResults = document.getElementById("prescricao-search-results");
  const prescricaoDosagemInput = document.getElementById("prescricao-dosagem");
  const btnAddItemPrescricao = document.getElementById("btn-add-item-prescricao");
  const prescricaoItensBody = document.getElementById("prescricao-itens-body");
  const prescricaoErrorMessage = document.getElementById("prescricao-error-message");
  const btnSalvarPrescricao = document.querySelector("#prescricao-form button[type='submit']");
  const btnCancelarPrescricao = document.getElementById("btn-cancelar-prescricao");

  let listaMedicamentosDisponiveis = [];
  let itensDaPrescricao = [];
  let medicamentoSelecionado = null;
  
  // --- PARTE 2: GUARDIÃO ---
  if (!token) {
    alert("Acesso negado. Por favor, faça o login.");
    window.location.href = "login.html";
    return;
  }

  if (usuarioStorage) {
    usuario = JSON.parse(usuarioStorage);
    userNameEl.textContent = usuario.nome;
    
    if (usuario.tipo === 'admin') {
      renderizarVisaoEstoque(); 
    } else if (usuario.tipo === 'farmaceutico') {
      adminHeader.style.display = 'none';
      btnCadastrarProf.style.display = 'none';
      btnVerProf.style.display = 'none';
      clinicoHeader.style.display = 'none';
      btnVerPacientes.style.display = 'none';
      renderizarVisaoEstoque();
    } else if (usuario.tipo === 'medico') {
      adminHeader.style.display = 'none';
      btnCadastrarProf.style.display = 'none';
      btnVerProf.style.display = 'none';
      renderizarVisaoPacientes();
    }
  }
  
  btnVerEstoque.addEventListener("click", renderizarVisaoEstoque);
  btnVerPacientes.addEventListener("click", renderizarVisaoPacientes);
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    alert("Logout realizado com sucesso.");
    window.location.href = "login.html";
  });

  // --- PARTE 4: RENDERIZAÇÃO DA VISÃO DE ESTOQUE (ATUALIZADA) ---
  function renderizarVisaoEstoque() {
    const podeEditar = (usuario.tipo === 'admin' || usuario.tipo === 'farmaceutico');
    
    mainContent.innerHTML = `
      <h2>Controle de Estoque e Lotes</h2>
      
      <div class="filters-container">
        <div class="filter-group" style="flex: 2;">
           <label>Pesquisar Nome:</label>
           <input type="text" id="search-input" placeholder="Ex: Amoxicilina...">
        </div>
        
        <div class="filter-group" style="flex: 1;">
           <label>Tipo:</label>
           <select id="filter-tipo">
              <option value="">Todos</option>
              <option value="Antibiótico">Antibiótico</option>
              <option value="Corticóide">Corticóide</option>
              <option value="Analgésico">Analgésico</option>
              <option value="Anti-inflamatório">Anti-inflamatório</option>
              <option value="Controlado">Controlado</option>
              <option value="Outros">Outros</option>
           </select>
        </div>

        <div class="filter-group" style="flex: 1;">
           <label>Lote:</label>
           <input type="text" id="filter-lote" placeholder="Ex: L-202">
        </div>

        <div class="filter-group" style="flex: 1;">
           <label>Vence até:</label>
           <input type="date" id="filter-validade">
        </div>

        <div class="filter-group">
           <button class="btn-primary" id="btn-aplicar-filtros" style="height: 36px; margin-bottom:0;">Filtrar</button>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Qtd / Unidade</th>
            <th>Lote</th>
            <th>Tipo</th>
            <th>Validade</th>
            <th id="actions-header">Ações</th>
          </tr>
        </thead>
        <tbody id="medicamentos-table-body">
        </tbody>
      </table>
      
      <div class="content-footer" style="display: flex; justify-content: space-between; margin-top: 20px;">
         <div>
            ${podeEditar ? `
            <input type="file" id="file-csv" accept=".csv" style="display:none">
            <button class="btn-secondary" id="btn-importar-csv">📂 Importar CSV</button>
            ` : ''}
         </div>
         <div>
            ${podeEditar ? `<button class="btn-primary" id="btn-adicionar">Adicionar Novo Medicamento</button>` : ''}
         </div>
      </div>
    `;
    
    // Reconecta os elementos DOM
    tableBody = document.getElementById("medicamentos-table-body");
    searchInput = document.getElementById("search-input");
    filterTipo = document.getElementById("filter-tipo");
    filterLote = document.getElementById("filter-lote");
    filterValidade = document.getElementById("filter-validade");
    btnAplicarFiltros = document.getElementById("btn-aplicar-filtros");
    btnAdicionar = document.getElementById("btn-adicionar");
    
    fileCsvInput = document.getElementById("file-csv");
    btnImportarCsv = document.getElementById("btn-importar-csv");

    // Eventos de Filtro
    btnAplicarFiltros.addEventListener("click", aplicarFiltrosLocais);
    searchInput.addEventListener("input", aplicarFiltrosLocais); // Filtro em tempo real no nome
    filterTipo.addEventListener("change", aplicarFiltrosLocais);

    // Evento Adicionar
    if (btnAdicionar) btnAdicionar.addEventListener("click", abrirModalParaAdicionar);
    
    // Eventos CSV
    if (btnImportarCsv) {
      btnImportarCsv.addEventListener("click", () => fileCsvInput.click());
      fileCsvInput.addEventListener("change", uploadCSV);
    }
    
    carregarMedicamentos(); 
  }
  
  // --- CARREGAR DADOS E FILTRAR (Lógica Local) ---
  async function carregarMedicamentos() {
    if (!tableBody) return; 
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Carregando estoque...</td></tr>`;
    
    try {
      const response = await fetch("/api/medicamentos", {
        method: "GET",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        alert("Sua sessão expirou."); window.location.href = "login.html"; return;
      }
      if (!response.ok) { throw new Error("Erro ao buscar medicamentos"); }

      // Salva na variável global para filtrar sem recarregar a página
      todosMedicamentos = await response.json();
      
      aplicarFiltrosLocais(); // Renderiza a tabela

    } catch (error) {
      console.error("Erro:", error.message);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${error.message}</td></tr>`;
    }
  }

  function aplicarFiltrosLocais() {
    if (!tableBody) return;

    const termo = searchInput.value.toLowerCase();
    const tipoSelecionado = filterTipo.value;
    const loteBusca = filterLote.value.toLowerCase();
    const dataLimite = filterValidade.value; // YYYY-MM-DD

    const filtrados = todosMedicamentos.filter(med => {
      // 1. Filtro Nome
      const matchNome = med.nome.toLowerCase().includes(termo);
      
      // 2. Filtro Tipo
      const matchTipo = tipoSelecionado === "" || med.tipo === tipoSelecionado;
      
      // 3. Filtro Lote
      const matchLote = loteBusca === "" || (med.lote && med.lote.toLowerCase().includes(loteBusca));
      
      // 4. Filtro Validade (mostra tudo que vence ANTES ou NA data selecionada)
      let matchValidade = true;
      if (dataLimite && med.validade) {
         matchValidade = med.validade <= dataLimite;
      }

      return matchNome && matchTipo && matchLote && matchValidade;
    });

    renderizarTabela(filtrados);
  }

  function renderizarTabela(lista) {
    tableBody.innerHTML = "";

    if (lista.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum medicamento encontrado com estes filtros.</td></tr>`;
      return;
    }

    lista.forEach(med => {
      const tr = document.createElement("tr");
      
      // Formata data (Visual)
      const validadeFormatada = med.validade.split('-').reverse().join('/');
      
      // Estilo para vencidos
      const estiloVencido = (med.vencido === 'Sim') ? 'color: red; font-weight: bold;' : '';

      let acoesHtml = '<td>-</td>'; 
      if (usuario.tipo === 'admin' || usuario.tipo === 'farmaceutico') {
        acoesHtml = `
          <td>
            <button class="btn-edit" data-id="${med.id}">✏️</button>
            <button class="btn-delete" data-id="${med.id}">🗑️</button>
          </td>
        `;
      }
      
      tr.innerHTML = `
        <td>${med.nome}</td>
        <td>${med.quantidade} <span style="font-size:0.8em; color:#666">(${med.formato || 'un'})</span></td>
        <td>${med.lote || '-'}</td>
        <td>${med.tipo || '-'}</td>
        <td style="${estiloVencido}">${validadeFormatada}</td>
        ${acoesHtml}
      `;
      tableBody.appendChild(tr);
    });
  }

  // --- FUNÇÃO UPLOAD CSV ---
  async function uploadCSV() {
    const file = fileCsvInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }, // Não coloque Content-Type aqui, o browser define boundary
        body: formData
      });
      
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        carregarMedicamentos(); // Recarrega a lista
      } else {
        alert("Erro no upload: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
    // Limpa o input para permitir reenvio do mesmo arquivo se necessário
    fileCsvInput.value = "";
  }

  // --- MODAL MEDICAMENTO: ADICIONAR / EDITAR ---
  function abrirModalParaAdicionar() {
    isSaving = false; 
    modal.classList.remove("hidden");
    modalTitle.textContent = "Adicionar Medicamento";
    modalForm.reset(); 
    medIdInput.value = "";
    modalErrorMessage.style.display = "none";
  }
  
  function fecharModal() { modal.classList.add("hidden"); }
  btnCancelarModal.addEventListener("click", fecharModal);

  modalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSaving) return;
    isSaving = true;
    btnSalvarModal.textContent = "Salvando...";
    
    // Captura valores novos
    const id = medIdInput.value; 
    const dados = { 
       nome: medNomeInput.value, 
       quantidade: medQtdInput.value,
       formato: medFormatoInput.value,
       lote: medLoteInput.value,
       tipo: medTipoInput.value,
       validade: medValidadeInput.value, 
       vencido: medVencidoInput.value 
    };

    const isEditing = id !== "";
    const url = isEditing ? `/api/medicamentos/${id}` : `/api/medicamentos`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(dados)
      });
      const data = await response.json();
      if (!response.ok) {
        modalErrorMessage.textContent = data.error || `Erro ao salvar`;
        modalErrorMessage.style.display = "block";
        throw new Error(data.error);
      }
      fecharModal(); 
      await carregarMedicamentos(); 
    } catch (error) {
      console.error("Erro ao salvar:", error.message);
    } finally {
      isSaving = false;
      btnSalvarModal.textContent = "Salvar";
    }
  });

  // --- AÇÕES GLOBAIS (Editar/Remover) ---
  mainContent.addEventListener("click", async (event) => {
    const target = event.target;

    // --- Remover Medicamento ---
    if (target.classList.contains("btn-delete")) {
      const id = target.dataset.id; 
      if (!confirm(`Tem certeza que deseja remover?`)) return;
      
      try {
        const response = await fetch(`/api/medicamentos/${id}`, {
          method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) { throw new Error("Erro ao remover"); }
        await carregarMedicamentos();
      } catch (error) {
        alert(error.message);
      }
    } 
    
    // --- Editar Medicamento ---
    if (target.classList.contains("btn-edit")) {
      const id = target.dataset.id;
      // Procura o objeto completo no array em memória (muito mais seguro)
      const med = todosMedicamentos.find(m => m.id == id);
      
      if (med) {
        modalTitle.textContent = "Editar Medicamento";
        medIdInput.value = med.id;
        medNomeInput.value = med.nome;
        medQtdInput.value = med.quantidade;
        medFormatoInput.value = med.formato || 'Comprimidos';
        medLoteInput.value = med.lote || '';
        medTipoInput.value = med.tipo || 'Geral';
        medValidadeInput.value = med.validade;
        medVencidoInput.value = med.vencido;
        
        modalErrorMessage.style.display = "none";
        modal.classList.remove("hidden");
      }
    }

    // --- Ações de Paciente (Mantido igual) ---
    if (target.classList.contains("btn-delete-paciente")) {
      const id = target.dataset.id;
      if(!confirm("Remover paciente?")) return;
      try {
        await fetch(`/api/pacientes/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` }});
        carregarPacientes();
      } catch(e) { console.error(e); }
    }
    if (target.classList.contains("btn-edit-paciente")) {
       // Lógica de edição de paciente simplificada (pegando da tabela visualmente)
       // (Se preferir, implemente cache 'todosPacientes' igual a medicamentos)
       const tr = target.closest("tr");
       const cols = tr.querySelectorAll("td");
       pacienteModalTitle.textContent = "Editar Paciente";
       pacienteIdInput.value = target.dataset.id;
       pacienteNomeInput.value = cols[1].textContent;
       pacienteCpfInput.value = cols[2].textContent === 'N/A' ? '' : cols[2].textContent;
       pacienteNascimentoInput.value = cols[3].textContent === 'N/A' ? '' : cols[3].textContent;
       pacienteModal.classList.remove("hidden");
    }
    if (target.classList.contains("btn-add-paciente")) abrirModalPacienteAdd();
    if (target.classList.contains("btn-prescrever")) {
       const nome = target.closest("tr").querySelectorAll("td")[1].textContent;
       abrirModalPrescricao(target.dataset.id, nome);
    }
  });

  // --- MÓDULOS MANTIDOS (Senha, Profissional, Paciente, Prescrição) ---
  // ... Lógica de Senha ...
  function abrirModalSenha() { senhaModal.classList.remove("hidden"); senhaForm.reset(); }
  btnTrocarSenha.addEventListener("click", abrirModalSenha);
  btnCancelarSenhaModal.addEventListener("click", () => senhaModal.classList.add("hidden"));
  senhaForm.addEventListener("submit", async (e) => {
     e.preventDefault();
     if (isSavingSenha) return; isSavingSenha = true;
     // ... Fetch troca de senha (igual anterior) ...
     try {
        const res = await fetch("/api/trocar-senha", { 
            method: "PUT", headers: {"Content-Type":"application/json", "Authorization":`Bearer ${token}`},
            body: JSON.stringify({ senhaAntiga: senhaAntigaInput.value, senhaNova: senhaNovaInput.value })
        });
        if(res.ok) { alert("Senha trocada!"); senhaModal.classList.add("hidden"); }
        else { throw new Error((await res.json()).error); }
     } catch(err) { senhaErrorMessage.textContent = err.message; senhaErrorMessage.style.display='block'; }
     finally { isSavingSenha = false; }
  });

  // ... Lógica de Profissional ...
  btnCadastrarProf.addEventListener("click", () => { profModal.classList.remove("hidden"); profForm.reset(); });
  btnCancelarProfModal.addEventListener("click", () => profModal.classList.add("hidden"));
  profForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if(isSavingProf) return; isSavingProf = true;
      // ... Fetch cadastro profissional ...
      try {
          const res = await fetch("/api/profissionais", {
              method: "POST", headers: {"Content-Type":"application/json"},
              body: JSON.stringify({ nome: profNomeInput.value, crm_coren: profCrmInput.value, senha: profSenhaInput.value, tipo: profTipoInput.value })
          });
          if(res.ok) { alert("Cadastrado!"); profModal.classList.add("hidden"); }
          else throw new Error((await res.json()).error);
      } catch(err) { profErrorMessage.textContent = err.message; profErrorMessage.style.display='block'; }
      finally { isSavingProf = false; }
  });

  // ... Lógica de Ver Profissionais ...
  btnVerProf.addEventListener("click", async () => {
      profListModal.classList.remove("hidden");
      const res = await fetch("/api/profissionais", { headers: {"Authorization":`Bearer ${token}`} });
      const list = await res.json();
      profListTableBody.innerHTML = list.map(p => `
         <tr><td>${p.id}</td><td>${p.nome}</td><td>${p.crm_coren}</td><td>${p.tipo}</td>
         <td><button class="btn-delete-prof btn-delete" data-id="${p.id}">X</button></td></tr>
      `).join('');
  });
  btnFecharProfList.addEventListener("click", () => profListModal.classList.add("hidden"));
  profListTableBody.addEventListener("click", async (e) => {
      if(e.target.classList.contains('btn-delete-prof')) {
          if(confirm("Remover?")) {
              await fetch(`/api/profissionais/${e.target.dataset.id}`, { method:"DELETE", headers: {"Authorization":`Bearer ${token}`} });
              btnVerProf.click(); // Recarrega
          }
      }
  });

  // ... Lógica Pacientes e Prescrição (Mantida) ...
  async function carregarPacientes() {
    // ... (código igual ao original, apenas garantindo que existe) ...
    const tableBodyPacientes = document.getElementById("pacientes-table-body");
    if(!tableBodyPacientes) return;
    const res = await fetch("/api/pacientes", { headers: {"Authorization":`Bearer ${token}`} });
    const pacs = await res.json();
    tableBodyPacientes.innerHTML = pacs.map(p => `
       <tr><td>${p.id}</td><td>${p.nome}</td><td>${p.cpf||'-'}</td><td>${p.data_nascimento||'-'}</td>
       <td><button class="btn-primary btn-prescrever" data-id="${p.id}">Prescrever</button></td>
       <td><button class="btn-edit btn-edit-paciente" data-id="${p.id}">✏️</button> <button class="btn-delete btn-delete-paciente" data-id="${p.id}">🗑️</button></td></tr>
    `).join('');
  }
  function renderizarVisaoPacientes() {
     mainContent.innerHTML = `
        <h2>Pacientes</h2>
        <div class="toolbar"><button class="btn-primary btn-add-paciente">Novo Paciente</button></div>
        <table class="data-table"><thead><tr><th>ID</th><th>Nome</th><th>CPF</th><th>Nasc.</th><th>Prescrição</th><th>Ações</th></tr></thead><tbody id="pacientes-table-body"></tbody></table>
     `;
     carregarPacientes();
  }

  // Lógica Paciente Modal
  function abrirModalPacienteAdd() { pacienteModal.classList.remove("hidden"); pacienteForm.reset(); pacienteIdInput.value=""; }
  btnCancelarPaciente.addEventListener("click", () => pacienteModal.classList.add("hidden"));
  pacienteForm.addEventListener("submit", async (e) => {
      e.preventDefault(); if(isSavingPaciente) return; isSavingPaciente = true;
      const id = pacienteIdInput.value;
      const url = id ? `/api/pacientes/${id}` : '/api/pacientes';
      const method = id ? 'PUT' : 'POST';
      try {
          await fetch(url, { method, headers: {"Content-Type":"application/json", "Authorization":`Bearer ${token}`}, body: JSON.stringify({ nome: pacienteNomeInput.value, cpf: pacienteCpfInput.value, data_nascimento: pacienteNascimentoInput.value }) });
          pacienteModal.classList.add("hidden"); carregarPacientes();
      } catch(err) { console.error(err); } finally { isSavingPaciente = false; }
  });

  // Lógica Prescrição
  async function carregarMedicamentosParaBusca() {
      const res = await fetch("/api/medicamentos", { headers: {"Authorization":`Bearer ${token}`} });
      listaMedicamentosDisponiveis = await res.json();
  }
  function abrirModalPrescricao(pid, pnome) {
      prescricaoModal.classList.remove("hidden"); prescricaoForm.reset(); prescricaoItensBody.innerHTML=""; itensDaPrescricao=[];
      prescricaoModalTitle.textContent = `Prescrição: ${pnome}`; prescricaoPacienteIdInput.value = pid;
      carregarMedicamentosParaBusca();
  }
  btnCancelarPrescricao.addEventListener("click", () => prescricaoModal.classList.add("hidden"));
  
  prescricaoSearchInput.addEventListener("input", () => {
      const termo = prescricaoSearchInput.value.toLowerCase();
      prescricaoSearchResults.innerHTML = "";
      if(termo.length < 2) { prescricaoSearchResults.classList.add("hidden"); return; }
      const res = listaMedicamentosDisponiveis.filter(m => m.nome.toLowerCase().includes(termo));
      if(res.length > 0) {
          prescricaoSearchResults.classList.remove("hidden");
          res.forEach(m => {
              const div = document.createElement("div"); div.className="search-item"; div.textContent=`${m.nome} (${m.quantidade})`; 
              div.onclick = () => { medicamentoSelecionado=m; prescricaoSearchInput.value=m.nome; prescricaoSearchResults.classList.add("hidden"); prescricaoDosagemInput.focus(); };
              prescricaoSearchResults.appendChild(div);
          });
      }
  });
  
  btnAddItemPrescricao.addEventListener("click", () => {
      if(!medicamentoSelecionado || !prescricaoDosagemInput.value) return alert("Selecione med e dosagem");
      itensDaPrescricao.push({ medicamento_id: medicamentoSelecionado.id, nome: medicamentoSelecionado.nome, dosagem: prescricaoDosagemInput.value });
      renderItensPrescricao();
      prescricaoSearchInput.value=""; prescricaoDosagemInput.value=""; medicamentoSelecionado=null;
  });
  
  function renderItensPrescricao() {
      prescricaoItensBody.innerHTML = itensDaPrescricao.map((it, idx) => `
         <tr><td>${it.nome}</td><td>${it.dosagem}</td><td><button type="button" onclick="removerItemPresc(${idx})">X</button></td></tr>
      `).join('');
  }
  // Hack para onclick no HTML string funcionar no escopo do módulo
  window.removerItemPresc = (idx) => { itensDaPrescricao.splice(idx, 1); renderItensPrescricao(); };

  prescricaoForm.addEventListener("submit", async (e) => {
      e.preventDefault(); if(itensDaPrescricao.length===0) return alert("Adicione itens");
      if(isSavingPrescricao) return; isSavingPrescricao=true;
      try {
          const res = await fetch("/api/prescricoes", {
              method: "POST", headers: {"Content-Type":"application/json", "Authorization":`Bearer ${token}`},
              body: JSON.stringify({ paciente_id: prescricaoPacienteIdInput.value, itens: itensDaPrescricao })
          });
          if(res.ok) { alert("Salvo!"); prescricaoModal.classList.add("hidden"); }
          else throw new Error((await res.json()).error);
      } catch(err) { alert(err.message); } finally { isSavingPrescricao=false; }
  });

});