'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'

const GOOGLE_CLIENT_ID = "112977498602-ec7c5f4061cred2utcdajk614388igd8.apps.googleusercontent.com"
const APP_VERSION = "20251228-2120-SERVER-V7"

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [debugInfo, setDebugInfo] = useState<string>('')

    // Handle Google Login Callback from Redirect
    useEffect(() => {
        const handleCallback = async () => {
            const hash = window.location.hash
            if (!hash) return

            console.log('Detected hash, processing token...')
            const params = new URLSearchParams(hash.substring(1))
            const accessToken = params.get('access_token')
            const idToken = params.get('id_token')
            const token = accessToken || idToken

            if (token) {
                setLoading(true)
                setError('')
                setDebugInfo(`Token detected. Sending to backend...`)
                try {
                    const res = await authApi.googleLogin(token)
                    localStorage.setItem('token', res.data.access_token)
                    window.location.hash = ''
                    router.push('/dashboard')
                } catch (err: any) {
                    console.error('Google Callback Login Error:', err)
                    const status = err.response?.status
                    const detail = err.response?.data?.detail || err.message
                    const msg = `Backend Error (${status}): ${JSON.stringify(detail)}`
                    setError(msg)
                    setDebugInfo(msg)
                    alert(`구글 로그인 연동 실패\n\n${msg}`)
                } finally {
                    setLoading(false)
                }
            }
        }

        handleCallback()
    }, [router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('username', username)
            formData.append('password', password)

            const response = await fetch(`/api/auth/login`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || '로그인에 실패했습니다.')
            }

            const data = await response.json()
            localStorage.setItem('token', data.access_token)
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || '로그인 실패')
        } finally {
            setLoading(false)
        }
    }

    const startGoogleLogin = () => {
        const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
        const options = {
            redirect_uri: window.location.origin + '/login',
            client_id: GOOGLE_CLIENT_ID,
            access_type: 'offline',
            response_type: 'token',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
            ].join(' '),
        }
        window.location.href = `${rootUrl}?${new URLSearchParams(options).toString()}`
    }

    const testBackend = async () => {
        setDebugInfo('Testing connectivity to /api/health...')
        try {
            const res = await fetch('/api/health')
            const data = await res.json()
            setDebugInfo(`Backend OK: ${JSON.stringify(data)}`)
            alert('백엔드 연결 성공!')
        } catch (err: any) {
            setDebugInfo(`Backend Connection Failed: ${err.message}`)
            alert('백엔드 연결 실패: ' + err.message)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-slate-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 border border-transparent dark:border-slate-800">
                    <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
                        사이트 수집기
                    </h1>
                    <p className="text-center text-[10px] text-blue-500 mb-6 font-mono">{APP_VERSION}</p>

                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">아이디</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded text-gray-900 dark:text-white bg-white dark:bg-slate-800" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">비밀번호</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded text-gray-900 dark:text-white bg-white dark:bg-slate-800" required />
                        </div>

                        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm break-all">{error}</div>}

                        <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded font-bold hover:bg-blue-600 disabled:opacity-50">
                            {loading ? '처리 중...' : '로그인'}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between">
                        <hr className="w-full border-gray-300 dark:border-slate-700" />
                        <span className="px-3 text-xs text-gray-500">OR</span>
                        <hr className="w-full border-gray-300 dark:border-slate-700" />
                    </div>

                    <button onClick={startGoogleLogin} disabled={loading}
                        className="mt-6 w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        </svg>
                        <span className="font-medium">Google 로그인</span>
                    </button>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-col items-center gap-4">
                        <button onClick={testBackend} className="text-[10px] text-gray-400 hover:text-blue-500 underline">서버 연결 상태 점검</button>
                        {debugInfo && <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded text-[9px] font-mono text-gray-400 w-full overflow-hidden text-ellipsis">DEBUG: {debugInfo}</div>}
                        <div className="flex gap-4 text-sm text-blue-500">
                            <Link href="/register">회원가입</Link>
                            <Link href="/">홈으로</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
