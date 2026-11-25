import Dashboard from './Dashboard'
import { ConfigMissingScreen } from './components/ConfigMissingScreen'
import { LoginPage } from './components/LoginPage'
import { NewPasswordPage } from './components/NewPasswordPage'
import { useAuth } from './hooks/useAuth'
import { supabaseConfigured } from './supabase'

// Porteiro do app: sem usuário logado mostra só o login;
// com usuário logado mostra o Controle Financeiro;
// vindo do link de recuperação de senha, mostra "Criar nova senha".
export default function App() {
  const {
    user,
    loading,
    recovering,
    linkError,
    clearLinkError,
    login,
    register,
    requestReset,
    setNewPassword,
    finishRecovery,
    cancelRecovery,
    requestAnotherLink,
    updatePhoto,
    logout,
  } = useAuth()

  if (!supabaseConfigured) return <ConfigMissingScreen />

  // A tela de nova senha vem ANTES do Dashboard: o link do e-mail abre uma
  // sessão, mas a pessoa ainda precisa escolher a senha.
  if (recovering) {
    return (
      <NewPasswordPage
        onSubmit={setNewPassword}
        onDone={finishRecovery}
        onCancel={cancelRecovery}
        onRequestAnotherLink={requestAnotherLink}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        <p role="status">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={login}
        onRegister={register}
        onRequestReset={requestReset}
        linkError={linkError}
        onClearLinkError={clearLinkError}
      />
    )
  }

  // key={user.id}: ao trocar de usuário, a tela é recriada do zero
  // (garante que nunca sobra dado do usuário anterior).
  return <Dashboard key={user.id} user={user} onLogout={logout} onSavePhoto={updatePhoto} />
}
