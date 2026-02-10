// app.js: lógica do aplicativo de gastos de viagem
// Importa apenas as funções necessárias do Firebase. Utilizar a API modular
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';

// Configuração do Firebase (deve ser substituída pelos dados do seu projeto)
export const firebaseConfig = {
  apiKey: 'COLOQUE_SUA_API_KEY_AQUI',
  authDomain: 'COLOQUE_SEU_AUTH_DOMAIN_AQUI',
  projectId: 'COLOQUE_SEU_PROJECT_ID_AQUI',
  storageBucket: 'COLOQUE_SEU_STORAGE_BUCKET_AQUI',
  messagingSenderId: 'COLOQUE_SEU_MESSAGING_SENDER_ID_AQUI',
  appId: 'COLOQUE_SEU_APP_ID_AQUI',
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Seleciona elementos do DOM
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const expenseForm = document.getElementById('expense-form');
const valueInput = document.getElementById('value-input');
const reasonInput = document.getElementById('reason-input');
const totalSumEl = document.getElementById('total-sum');
const topExpensesList = document.getElementById('top-expenses');

let unsubscribeExpenses = null;

// Função para iniciar listeners de despesas (escuta em tempo real) para o usuário logado
function startExpenseListeners(user) {
  // Cancela listener anterior, se existir
  if (unsubscribeExpenses) {
    unsubscribeExpenses();
    unsubscribeExpenses = null;
  }
  // Cria uma consulta filtrando pelas despesas do usuário
  const expensesRef = collection(db, 'expenses');
  const userQuery = query(expensesRef, where('userId', '==', user.uid));
  unsubscribeExpenses = onSnapshot(userQuery, (snapshot) => {
    const expenses = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({ id: doc.id, ...data });
    });
    // Calcula o total de gastos
    const total = expenses.reduce((sum, exp) => sum + (Number(exp.value) || 0), 0);
    totalSumEl.textContent = `Total gasto: R$ ${total.toFixed(2)}`;
    // Ordena por valor decrescente e pega os três primeiros
    const topThree = expenses.sort((a, b) => b.value - a.value).slice(0, 3);
    topExpensesList.innerHTML = '';
    topThree.forEach((exp) => {
      const li = document.createElement('li');
      li.textContent = `${exp.reason}: R$ ${Number(exp.value).toFixed(2)}`;
      topExpensesList.appendChild(li);
    });
  });
}

// Lida com submissão do formulário de cadastro
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signupForm['signup-email'].value;
  const password = signupForm['signup-password'].value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    signupForm.reset();
  } catch (error) {
    alert(`Erro ao cadastrar: ${error.message}`);
  }
});

// Lida com submissão do formulário de login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm['login-email'].value;
  const password = loginForm['login-password'].value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    alert(`Erro ao entrar: ${error.message}`);
  }
});

// Botão de logout
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
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
    await addDoc(collection(db, 'expenses'), {
      userId: auth.currentUser.uid,
      value: value,
      reason: reason,
      timestamp: Date.now(),
    });
    valueInput.value = '';
    reasonInput.value = '';
  } catch (error) {
    alert(`Erro ao registrar gasto: ${error.message}`);
  }
});

// Observa mudanças de estado de autenticação
onAuthStateChanged(auth, (user) => {
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
    // Cancela listeners se existirem
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
    }
  }
});
