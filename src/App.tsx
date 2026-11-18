import Dashboard from './Dashboard'
import { LoginPage } from './components/LoginPage'
import { useAuth } from './hooks/useAuth'

// Porteiro do app: sem usuário logado mostra só o login;
// com usuário logado mostra o Controle Financeiro.
export default function App() {
  const { user, login, register, updatePhoto, logout } = useAuth()

  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} />
  }

  // key={user.id}: ao trocar de usuário, a tela é recriada do zero
  // (garante que nunca sobra dado do usuário anterior).
  return <Dashboard key={user.id} user={user} onLogout={logout} onSavePhoto={updatePhoto} />
}
