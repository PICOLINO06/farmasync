// login.js

// Espera o HTML ser totalmente carregado para rodar o script
document.addEventListener("DOMContentLoaded", () => {

  // 1. "Pegar" os elementos do HTML com os quais vamos trabalhar
  const loginForm = document.getElementById("login-form");
  const crmInput = document.getElementById("crm_coren");
  const senhaInput = document.getElementById("senha");
  const errorMessage = document.getElementById("error-message");

  // 2. Adicionar um "escutador" para o evento de 'submit' (envio) do formulário
  loginForm.addEventListener("submit", async (event) => {

    // Impede que o formulário recarregue a página (comportamento padrão)
    event.preventDefault(); 

    // 3. Pegar os valores digitados pelo usuário
    const crm_coren = crmInput.value;
    const senha = senhaInput.value;

    // Limpa mensagens de erro antigas
    errorMessage.textContent = "";
    errorMessage.style.display = "none";

    try {
      // 4. A MÁGICA: Chamar nossa API Backend (o fetch)
      //    'await' faz o código esperar a resposta do servidor
      
      // --- CORREÇÃO APLICADA AQUI ---
      // Removido "http://localhost:3000"
      const response = await fetch("/api/login", {
        method: "POST", // Estamos enviando dados
        headers: {
          "Content-Type": "application/json", // Avisa que estamos enviando JSON
        },
        body: JSON.stringify({ crm_coren, senha }), // Converte nosso JS em texto JSON
      });

      // 5. Ler a resposta do servidor como JSON
      const data = await response.json();

      // 6. Lidar com a resposta
      if (response.ok) {
        // SUCESSO! (Status 200-299)
        // 'response.ok' é true se o login deu certo

        // Salva o "ticket" (token) e os dados do usuário no navegador
        localStorage.setItem("token", data.token);
        localStorage.setItem("usuario", JSON.stringify(data.usuario));

        // Mostra um alerta de sucesso e redireciona para a página principal
        alert("Login bem-sucedido! Redirecionando...");
        window.location.href = "dashboard.html"; // Redireciona para o dashboard

      } else {
        // FALHA! (Status 4xx, 5xx)
        // 'data.error' é a mensagem que definimos no backend (ex: "Senha incorreta")
        throw new Error(data.error || "Erro ao fazer login");
      }

    } catch (error) {
      // 7. Lidar com erros (seja do backend ou da rede)
      console.error("Erro no login:", error.message);
      errorMessage.textContent = error.message; // Mostra o erro na tela
      errorMessage.style.display = "block"; // Torna a mensagem de erro visível
    }
  });
});