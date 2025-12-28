'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'

const GOOGLE_CLIENT_ID = "112977498602-ec7c5f4061cred2utcdajk614388igd8.apps.googleusercontent.com"

export default function RegisterPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Handle Google Login Callback from Redirect
    useEffect(() => {
        const handleCallback = async () => {
            const hash = window.location.hash
            if (!hash) return

            const params = new URLSearchParams(hash.substring(1))
            const token = params.get('access_token') || params.get('id_token')

            if (token) {
                setLoading(true)
                setError('')
                try {
                    console.log('Detected Google Token in URL for registration...')
                    const res = await authApi.googleLogin(token)
                    localStorage.setItem('token', res.data.access_token)
                    window.location.hash = ''
                    router.push('/dashboard')
                } catch (err: any) {
                    console.error('Google Callback Login Error (Register):', err)
                    const msg = err.response?.data?.detail || '구글 로그인 연동 중 오류가 발생했습니다.'
                    setError(msg)
                    alert('로그인 오류: ' + msg)
                } finally {
                    setLoading(false)
                }
            }
        }

        handleCallback()
    }, [router])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.')
            return
        }

        setLoading(true)

        try {
            await authApi.register({
                username,
                password,
                role: 'viewer' // Default role
            })
            alert('회원가입이 완료되었습니다. 로그인해주세요.')
            router.push('/login')
        } catch (err: any) {
            setError(err.response?.data?.detail || '회원가입에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const startGoogleLogin = () => {
        const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
        const options = {
            redirect_uri: window.location.origin + '/register', // Note: using /register for registration
            client_id: GOOGLE_CLIENT_ID,
            access_type: 'offline',
            response_type: 'token',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
            ].join(' '),
        }

        const qs = new URLSearchParams(options).toString()
        window.location.href = `${rootUrl}?${qs}`
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-slate-950 transition-colors duration-300">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 border border-transparent dark:border-slate-800 transition-colors">
                    <h1 className="text-3xl font-bold text-center mb-2 text-blue-600 dark:text-blue-500">
                        사이트 수집기
                    </h1>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-8">새 계정 만들기</p>

                    <form onSubmit={handleRegister}>
                        <div className="mb-4">
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                아이디
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-slate-800 transition-colors"
                                placeholder="사용할 아이디를 입력하세요"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-slate-800 transition-colors"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                비밀번호 확인
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white bg-white dark:bg-slate-800 transition-colors"
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded text-sm transition-colors">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all font-bold shadow-md"
                        >
                            {loading ? '가입 중...' : '회원가입'}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between">
                        <hr className="w-full border-gray-300 dark:border-slate-700" />
                        <span className="px-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">또는</span>
                        <hr className="w-full border-gray-300 dark:border-slate-700" />
                    </div>

                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={startGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="font-medium">{loading ? '연동 중...' : 'Google 계정으로 가입'}</span>
                        </button>
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        <p>이미 계정이 있으신가요?</p>
                        <Link href="/login" className="text-blue-500 dark:text-blue-400 hover:underline font-medium">로그인하기</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
