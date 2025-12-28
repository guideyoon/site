'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { authApi } from '@/lib/api'

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const GOOGLE_CLIENT_ID = "112977498602-ec7c5f4061cred2utcdajk614388igd8.apps.googleusercontent.com"

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('username', username)
            formData.append('password', password)

            const apiUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:8001` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001');
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const detail = errorData.detail
                const errorMessage = typeof detail === 'string'
                    ? detail
                    : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : '로그인에 실패했습니다.')

                throw new Error(errorMessage)
            }

            const data = await response.json()
            localStorage.setItem('token', data.access_token)

            // Redirect to dashboard
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.')
        } finally {
            setLoading(false)
        }
    }


    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('')
        setLoading(true)
        try {
            const res = await authApi.googleLogin(credentialResponse.credential)
            localStorage.setItem('token', res.data.access_token)
            router.push('/dashboard')
        } catch (err: any) {
            console.error('Google Login Error:', err)
            setError(err.response?.data?.detail || '구글 로그인에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setError('')
            setLoading(true)
            try {
                const res = await authApi.googleLogin(tokenResponse.access_token)
                localStorage.setItem('token', res.data.access_token)
                router.push('/dashboard')
            } catch (err: any) {
                console.error('Google Login Error:', err)
                setError(err.response?.data?.detail || '구글 로그인에 실패했습니다.')
            } finally {
                setLoading(false)
            }
        },
        onError: () => setError('구글 로그인에 실패했습니다.'),
        flow: 'implicit',
    })

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-slate-950 transition-colors duration-300">
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 border border-transparent dark:border-slate-800 transition-colors">
                        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
                            사이트 수집기
                        </h1>

                        <form onSubmit={handleLogin}>
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
                                    required
                                />
                            </div>

                            <div className="mb-6">
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

                            {error && (
                                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded transition-colors">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all font-bold"
                            >
                                {loading ? '로그인 중...' : '로그인'}
                            </button>
                        </form>

                        <div className="mt-6 flex items-center justify-between">
                            <hr className="w-full border-gray-300 dark:border-slate-700" />
                            <span className="px-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">또는</span>
                            <hr className="w-full border-gray-300 dark:border-slate-700" />
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => googleLogin()}
                                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="font-medium">Google 계정으로 로그인</span>
                            </button>
                        </div>

                        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            <p>관리자 계정이 필요합니다. 계정이 없으신가요?</p>
                            <div className="space-x-4 mt-2">
                                <Link href="/register" className="text-blue-500 dark:text-blue-400 hover:underline font-medium">회원가입</Link>
                                <span className="text-gray-300 dark:text-gray-700">|</span>
                                <Link href="/" className="text-blue-500 dark:text-blue-400 hover:underline">홈으로 돌아가기</Link>
                            </div>
                        </div>
                    </div>

                    {/* 주요 기능 목록 추가 */}
                    <div className="mt-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg mr-2">🚀</span>
                            주요 기능
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start space-x-3">
                                <span className="text-blue-500 dark:text-blue-400 mt-1">✓</span>
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">자동 수집</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">지역 관련 정보 자동 수집</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="text-blue-500 dark:text-blue-400 mt-1">✓</span>
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">자동 분류</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">중복 제거 및 지능형 분류</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="text-blue-500 dark:text-blue-400 mt-1">✓</span>
                                <div>
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">AI 요약</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">핵심 내용 인공지능 요약</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 opacity-60">
                                <span className="text-gray-400 dark:text-gray-600 mt-1">✓</span>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">스마트 게시</h4>
                                        <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 font-medium">Coming Soon</span>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-600">리라이팅 및 원클릭 게시 (준비 중)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    )
}
