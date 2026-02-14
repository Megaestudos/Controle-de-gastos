// app.js: lógica do aplicativo de gastos de viagem

// Configuração do Firebase (já preenchida com seu projeto)
const firebaseConfig = {
  apiKey: 'AIzaSyC79ayeEjnYDwejYovZsdKm8Gdxdle74Zw',
  authDomain: 'controle-de-gastos-7624f.firebaseapp.com',
  projectId: 'controle-de-gastos-7624f',
  // Firebase Storage bucket associada ao projeto (substitua se necessário)
  storageBucket: 'controle-de-gastos-7624f.appspot.com',
  messagingSenderId: '1054967907917',
  appId: '1:1054967907917:web:2775e66d5a8ca7d8d47e04',
};

// Inicializa Firebase usando API compatível (namespaced)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
// Adiciona listeners para alternar os formulários
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
  if (unsubscribeExpenses) {
    unsubscribeExpenses();
    unsubscribeExpenses = null;
  }
  const userQuery = db.collection('expenses').where('userId', '==', user.uid);
  unsubscribeExpenses = userQuery.onSnapshot((snapshot) => {
    const expenses = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
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

    // Ranking: top 3 maiores gastos
    const topThree = expenses.slice().sort((a, b) => b.value - a.value).slice(0, 3);
    topExpensesList.innerHTML = '';
    topThree.forEach((exp) => {
      const li = document.createElement('li');
      li.textContent = `${exp.reason}: R$ ${Number(exp.value).toFixed(2)} - ${exp.dateString}`;
      topExpensesList.appendChild(li);
    });

    // Lista completa com botão de deletar
    if (expensesListEl) {
      expensesListEl.innerHTML = '';
      expenses.forEach((exp) => {
        const li = document.createElement('li');
        li.textContent = `${exp.reason}: R$ ${Number(exp.value).toFixed(2)} - ${exp.dateString}`;
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Deletar';
        delBtn.className = 'delete-button';
        delBtn.addEventListener('click', async () => {
          if (confirm('Tem certeza que deseja excluir este gasto?')) {
            try {
              await db.collection('expenses').doc(exp.id).delete();
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
    await auth.signInWithEmailAndPassword(email, password);
    loginForm.reset();
  } catch (error) {
    alert(`Erro ao entrar: ${error.message}`);
  }
});

// Botão de logout
logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
  } catch (error) {
    alert(`Erro ao sair: ${error.message}`);
  }
});

// Registro de despesas
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
    const dateValue = dateInput.value;
    const dateObj = dateValue ? new Date(dateValue) : new Date();
    await db.collection('expenses').add({
      userId: auth.currentUser.uid,
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
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('expense-section').style.display = 'block';
    document.getElementById('logout-section').style.display = 'block';
    startExpenseListeners(user);
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('expense-section').style.display = 'none';
    document.getElementById('logout-section').style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'block';
    if (signupContainer) signupContainer.style.display = 'none';
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
    }
  }
});
