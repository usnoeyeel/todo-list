import { supabase } from './supabase-client.js'

let authMode = 'login'

export function showAuthOverlay() {
  document.getElementById('authOverlay').style.display = 'flex'
  document.getElementById('authEmail').value = ''
  document.getElementById('authPassword').value = ''
  document.getElementById('authError').textContent = ''
  window.switchAuthTab('login')
}

export function hideAuthOverlay() {
  document.getElementById('authOverlay').style.display = 'none'
}

function setError(msg, isSuccess = false) {
  const el = document.getElementById('authError')
  el.textContent = msg
  el.style.color = isSuccess ? '#16a34a' : '#e53e3e'
}

window.switchAuthTab = function (mode) {
  authMode = mode
  document.getElementById('loginTab').classList.toggle('active', mode === 'login')
  document.getElementById('signupTab').classList.toggle('active', mode === 'signup')
  document.getElementById('authSubmitBtn').textContent = mode === 'login' ? '로그인' : '회원가입'
  setError('')
}

window.submitAuth = async function () {
  const email = document.getElementById('authEmail').value.trim()
  const password = document.getElementById('authPassword').value
  if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }

  const btn = document.getElementById('authSubmitBtn')
  btn.disabled = true
  btn.textContent = '처리 중...'

  let error, data
  if (authMode === 'login') {
    ;({ data, error } = await supabase.auth.signInWithPassword({ email, password }))
  } else {
    ;({ data, error } = await supabase.auth.signUp({ email, password }))
  }

  btn.disabled = false
  btn.textContent = authMode === 'login' ? '로그인' : '회원가입'

  if (error) { setError(error.message); return }

  if (authMode === 'signup' && !data.session) {
    setError('가입 완료! 이메일 인증 후 로그인해주세요.', true)
  }
  // 로그인 성공 또는 이메일 인증 불필요 시 → onAuthStateChange가 처리
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('authPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.submitAuth()
  })
})
