// app.js: lógica do aplicativo de gastos de viagem

// Configuração do Firebase (já preenchida com seu projeto)
const firebaseConfig = {
  apiKey: 'AIzaSyC79ayeEjnYDwejYovZsdKm8Gdxdle74Zw',
  authDomain: 'controle-de-gastos-7624f.firebaseapp.com',
  projectId: 'controle-de-gastos-7624f',
  storageBucket: 'controle-de-gastos-7624f.appspot.com',
  messagingSenderId: '1054967907917',
  appId: '1:1054967907917:web:2775e66d5a8ca7d8d47e04',
};

// Inicializa Firebase usando API compatível (namespaced)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Define a persistência de autenticação para NONE. Assim, o login é mantido
// apenas enquanto a aba estiver aberta; ao recarregar ou fechar, é necessário entrar de novo.
auth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch((error) => {
  console.error('Erro ao definir persistência de autenticação:', error);
});

// Seleciona elementos do DOM
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const expenseForm = document.getElementById('expense-form');
const valueInput = document.getElementById('value-input');
const reasonInput = document.getElementById('reason-input');
const totalSumEl = document.getElementById('total-sum');
const topExpensesList = document.getElementById('top-expenses');
const expensesListEl = document.getElementById('expenses-list');
const dateInput = document.getElementById('date-input');

// Elementos para alternar entre login e cadastro
const loginContainer = document.getElementById('login-container');
const signupContainer = document.getElementById('signup-container');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
// Adiciona listeners para alternar os formulários de login e cadastro.
if (showSignupLink) {
  showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (loginContainer) loginContainer.style.display = 'none';
    if (signupContainer) signupContainer.style.display = 'block';
  });
}
if (showLoginLink) {
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (signupContainer) signupContainer.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'block';
  });
}

let unsubscribeExpenses = null;

// Função para iniciar listeners de despesas (escuta em tempo real) para o usuário logado
function startExpenseListeners(user) {
  // Cancela listener anterior, se existir
  if (unsubscribeExpenses) {
    unsubscribeExpenses();
    unsubscribeExpenses = null;
  }
  // Escuta as despesas do usuário na subcoleção "expenses" dentro de "users/{uid}"
  const uid = user.uid;
  const userExpensesRef = db.collection('users').doc(uid).collection('expenses');
  unsubscribeExpenses = userExpensesRef.onSnapshot((snapshot) => {
    const expenses = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Converte a data do Firestore para uma string legível
      let dateString = '';
      if (data.date) {
        let dateObj;
        if (typeof data.date.toDate === 'function') {
          dateObj = data.date.toDate();
        } else if (data.date instanceof Date) {
          dateObj = data.date;
        } else {
          dateObj = new Date(data.date);
        }
        if (!isNaN(dateObj)) {
          dateString = dateObj.toLocaleDateString('pt-BR');
        }
      }
      expenses.push({ id: doc.id, ...data, dateString });
    });
    // Calcula o total de gastos
    const total = expenses.reduce((sum, exp) => sum + (Number(exp.value) || 0), 0);
    totalSumEl.textContent = `Total gasto: R$ ${total.toFixed(2)}`;
    // Ordena por valor decrescente e pega os três maiores para o ranking
    const topThree = expenses.slice().sort((a, b) => b.value - a.value).slice(0, 3);
    topExpensesList.innerHTML = '';
    topThree.forEach((exp) => {
      const li = document.createElement('li');
      li.textContent = `${exp.reason}: R$ ${Number(exp.value).toFixed(2)} - ${exp.dateString}`;
      topExpensesList.appendChild(li);
    });
    // Atualiza a lista completa de despesas com opção de deletar
    if (expensesListEl) {
      expensesListEl.innerHTML = '';
      expenses.forEach((exp) => {
        const li = document.createElement('li');
        li.textContent = `${exp.reason}: R$ ${Number(exp.value).toFixed(2)} - ${exp.dateString}`;
        // Botão de deletar
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Deletar';
        delBtn.className = 'delete-button';
        delBtn.addEventListener('click', async () => {
          if (confirm('Tem certeza que deseja excluir este gasto?')) {
            try {
              // Remove o documento na subcoleção do usuário
              await db.collection('users').doc(uid).collection('expenses').doc(exp.id).delete();
            } catch (err) {
              alert(`Erro ao deletar gasto: ${err.message}`);
            }
          }
        });
        li.appendChild(delBtn);
        expensesListEl.appendChild(li);
      });
    }
  });
}

// Cadastro de usuário
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signupForm['signup-email'].value;
  const password = signupForm['signup-password'].value;
  try {
    // Usa a API compatível para criar o usuário
    await auth.createUserWithEmailAndPassword(email, password);
    signupForm.reset();
  } catch (error) {
    alert(`Erro ao cadastrar: ${error.message}`);
  }
});

// Login de usuário
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm['login-email'].value;
  const password = loginForm['login-password'].value;
  try {
    // Usa a API compatível para fazer login
    await auth.signInWithEmailAndPassword(email, password);
    loginForm.reset();
  } catch (error) {
    alert(`Erro ao entrar: ${error.message}`);
  }
});

// Botão de logout
logoutBtn.addEventListener('click', async () => {
  try {
    // Usa a API compatível para sair
    await auth.signOut();
  } catch (error) {
    alert(`Erro ao sair: ${error.message}`);
  }
});

// Submissão do formulário de despesas
expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = parseFloat(valueInput.value);
  const reason = reasonInput.value.trim();
  if (!auth.currentUser) {
    alert('Você precisa estar logado para registrar gastos.');
    return;
  }
  if (isNaN(value) || value <= 0) {
    alert('Informe um valor válido.');
    return;
  }
  if (!reason) {
    alert('Informe um motivo para o gasto.');
    return;
  }
  try {
    // Captura a data; se não informada, usa a data atual
    const dateValue = dateInput.value;
    const dateObj = dateValue ? new Date(dateValue) : new Date();
    // Armazena o gasto na subcoleção "expenses" do documento do usuário.
    await db.collection('users').doc(auth.currentUser.uid).collection('expenses').add({
      value: value,
      reason: reason,
      date: dateObj,
      timestamp: Date.now(),
    });
    // Limpa todo o formulário depois de gravar
    expenseForm.reset();
  } catch (error) {
    alert(`Erro ao registrar gasto: ${error.message}`);
  }
});

// Observa mudanças de estado de autenticação
auth.onAuthStateChanged((user) => {
  if (user) {
    // Usuário logado: mostra seções de gastos e botões apropriados
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('expense-section').style.display = 'block';
    document.getElementById('logout-section').style.display = 'block';
    startExpenseListeners(user);
  } else {
    // Nenhum usuário logado: esconde seções de gastos
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('expense-section').style.display = 'none';
    document.getElementById('logout-section').style.display = 'none';
    // Sempre volta para a tela de login por padrão
    if (loginContainer) loginContainer.style.display = 'block';
    if (signupContainer) signupContainer.style.display = 'none';
    // Cancela listeners se existirem
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
    }
  }
});
