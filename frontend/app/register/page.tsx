'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { authApi } from '@/lib/api'

export default function RegisterPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const GOOGLE_CLIENT_ID = "112977498602-ec7c5f4061cred2utcdajk614388igd8.apps.googleusercontent.com"

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

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('구글 로그인에 실패했습니다.')}
                                theme="filled_blue"
                                width="100%"
                                shape="pill"
                                text="signup_with"
                            />
                        </div>

                        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            <p>이미 계정이 있으신가요?</p>
                            <Link href="/login" className="text-blue-500 dark:text-blue-400 hover:underline font-medium">로그인하기</Link>
                        </div>
                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    )
}
