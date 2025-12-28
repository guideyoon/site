import { useState, useRef, useEffect } from 'react'
import { uploadApi, aiApi, authApi } from '@/lib/api'

interface AIWriterModalProps {
    isOpen: boolean
    onClose: () => void
    mode: 'blog' | 'cafe'
    item: {
        title: string
        raw_text: string | null
        image_urls: string[] | null
    }
}

export default function AIWriterModal({ isOpen, onClose, mode, item }: AIWriterModalProps) {
    const [content, setContent] = useState('')
    const [rewrittenContent, setRewrittenContent] = useState('')
    const [activeEditor, setActiveEditor] = useState<'original' | 'rewritten'>('original')
    const [images, setImages] = useState<Array<{ url: string, file: File | null }>>([])
    const [uploading, setUploading] = useState(false)
    const [previewMode, setPreviewMode] = useState(false)
    const [isOriginalLocked, setIsOriginalLocked] = useState(true)

    // Cafe Specific State
    const [cafeSettings, setCafeSettings] = useState({
        club_id: '',
        menu_id: '',
        subject: ''
    })
    const [postingToCafe, setPostingToCafe] = useState(false)

    // AI Settings
    const [provider, setProvider] = useState('openai')
    const [style, setStyle] = useState('review') // Default style
    const [customPrompt, setCustomPrompt] = useState('') // For 'custom' style

    const [apiKeys, setApiKeys] = useState({
        openai_api_key: false,
        gemini_api_key: false,
        perplexity_api_key: false
    })

    const [rewriting, setRewriting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const rewrittenTextareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isOpen) {
            // Initial content population
            let initialContent = item.title + '\n\n'
            if (item.raw_text) initialContent += item.raw_text + '\n\n'
            setContent(initialContent)

            // Initial images (convert strings to object structure)
            if (item.image_urls) {
                setImages(item.image_urls.map(url => ({ url, file: null })))
            }

            // Initial subject
            setCafeSettings(prev => ({ ...prev, subject: item.title }))

            // Check for user settings (API Key)
            checkUserApiKeys()
        }
    }, [isOpen, item])

    const checkUserApiKeys = async () => {
        try {
            const response = await authApi.me()
            const user = response.data
            setApiKeys({
                openai_api_key: !!user.openai_api_key,
                gemini_api_key: !!user.gemini_api_key,
                perplexity_api_key: !!user.perplexity_api_key
            })
            // Pre-fill Cafe settings if saved in user preferences (TODO: Add to user model if frequent)
        } catch (e) {
            console.error('Failed to fetch user settings', e)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]
        try {
            const response = await uploadApi.image(file)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const fullUrl = `${apiUrl}${response.data.url}`

            setImages(prev => [...prev, { url: fullUrl, file }])
        } catch (error) {
            alert('이미지 업로드 실패')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const insertImage = (url: string) => {
        const textarea = activeEditor === 'original' ? textareaRef.current : rewrittenTextareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value

        // Insert as HTML <img> tag for better compatibility with Naver Blog/Cafe HTML editors
        const insertText = `\n<img src="${url}" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" />\n`

        const newText = text.substring(0, start) + insertText + text.substring(end)

        if (activeEditor === 'original') {
            if (isOriginalLocked) {
                alert('원본 내용이 잠겨 있습니다. 수정을 원하시면 잠금을 해제해 주세요.');
                return;
            }
            setContent(newText)
        } else {
            setRewrittenContent(newText)
        }

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + insertText.length, start + insertText.length)
        }, 0)
    }

    const handleRewrite = async () => {
        if (!content.trim()) return

        setRewriting(true)
        try {
            let instruction = "Rewrite this text."

            if (mode === 'cafe') {
                switch (style) {
                    case 'review': instruction = "Rewrite this as a GENUINE Cafe Review. Use informal, friendly Korean (polite 'haeyo' style or 'banmal' depending on target). Include emotions, emojis, and specific details that make it sound like a real user experience. Avoid overly marketing tone."; break;
                    case 'info': instruction = "Rewrite this as an Information Share post for a Cafe community. Be helpful, concise, and structure with bullet points. Tone should be expert yet approachable."; break;
                    case 'question': instruction = "Rewrite this as a Question/Discussion starter. Frame the content as 'I found this, what do you think?' to encourage comments."; break;
                    case 'viral': instruction = "Rewrite this for Viral Marketing. Use catchy hooks, provocative questions, and emphasize 'FOMO' (Fear Of Missing Out)."; break;
                    case 'custom':
                        instruction = customPrompt || instruction;
                        break;
                    default: instruction = "Rewrite this text for a Naver Cafe post.";
                }
            } else {
                // Blog modes
                switch (style) {
                    case 'news': instruction = "Rewrite this as a formal News Article."; break;
                    case 'review': instruction = "Rewrite this as a detailed Blog Review."; break;
                    case 'guide': instruction = "Rewrite this as a How-to Guide."; break;
                    case 'story': instruction = "Rewrite this as a Story."; break;
                    case 'interview': instruction = "Rewrite this as an Interview."; break;
                    case 'custom': instruction = customPrompt || instruction; break;
                }
            }

            const response = await aiApi.rewrite(content, undefined, provider, undefined, instruction)
            setRewrittenContent(response.data.text)
            setActiveEditor('rewritten')
        } catch (error: any) {
            alert(error.response?.data?.detail || '리라이팅 실패')
        } finally {
            setRewriting(false)
        }
    }

    const handleDeleteImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
    }

    const handleCafeUpload = async () => {
        if (!cafeSettings.club_id || !cafeSettings.menu_id) {
            alert('카페 ID와 메뉴 ID를 입력해주세요.')
            return
        }
        if (!cafeSettings.subject) {
            alert('제목을 입력해주세요.')
            return
        }
        if (!rewrittenContent) {
            alert('업로드할 본문(리라이팅)이 없습니다.')
            return
        }

        setPostingToCafe(true)
        try {
            const formData = new FormData();
            formData.append('subject', cafeSettings.subject);

            // Convert newlines to <br>
            let htmlContent = rewrittenContent.replace(/\n/g, '<br/>');

            // Convert Markdown images to HTML if any exist (in case AI generated them)
            // ![alt](url) -> <img src="url" ... />
            htmlContent = htmlContent.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" />');

            formData.append('content', htmlContent);

            // Append images
            images.forEach((img) => {
                if (img.file) {
                    formData.append('images', img.file);
                }
            });

            // Naver API integration was removed
            alert('네이버 카페 업로드 기능은 현재 비활성화되어 있습니다.')
            onClose()
        } catch (error: any) {
            console.error(error)
            alert(error.response?.data?.detail || '카페 업로드 실패')
        } finally {
            setPostingToCafe(false)
        }
    }

    const handleCopyHtml = async (text: string) => {
        try {
            // content contains raw HTML tags (<img>) and newlines
            // We need to convert newlines to <br> for the HTML mime type so formatting is preserved
            const htmlContent = text.replace(/\n/g, '<br/>');

            const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
            const textBlob = new Blob([text], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob,
                }),
            ]);
            alert('복사되었습니다. (에디터에 붙여넣기 하면 이미지가 보입니다)');
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback
            navigator.clipboard.writeText(text);
            alert('텍스트 형식으로 복사되었습니다.');
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col border border-transparent dark:border-slate-800 transition-colors overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">✍️</span>
                        {mode === 'cafe' ? '네이버 카페 자동 업로드' : '블로그 글 작성'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    <div className="flex-1 flex flex-col border-r dark:border-slate-800 overflow-hidden">

                        {/* Cafe Specific Settings Bar */}
                        {mode === 'cafe' && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/10 border-b dark:border-slate-800 flex flex-wrap gap-4 items-center text-sm transition-colors">
                                <div className="flex items-center gap-2">
                                    <label className="font-semibold text-green-800 dark:text-green-400">Cafe ID:</label>
                                    <input
                                        type="text"
                                        value={cafeSettings.club_id}
                                        onChange={(e) => setCafeSettings({ ...cafeSettings, club_id: e.target.value })}
                                        placeholder="Club ID"
                                        className="border dark:border-slate-700 p-1.5 rounded w-32 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="font-semibold text-green-800 dark:text-green-400">Menu ID:</label>
                                    <input
                                        type="text"
                                        value={cafeSettings.menu_id}
                                        onChange={(e) => setCafeSettings({ ...cafeSettings, menu_id: e.target.value })}
                                        placeholder="Menu ID"
                                        className="border dark:border-slate-700 p-1.5 rounded w-24 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                    <label className="font-semibold text-green-800 dark:text-green-400">제목:</label>
                                    <input
                                        type="text"
                                        value={cafeSettings.subject}
                                        onChange={(e) => setCafeSettings({ ...cafeSettings, subject: e.target.value })}
                                        placeholder="게시글 제목"
                                        className="border dark:border-slate-700 p-1.5 rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 flex-1 min-w-[200px] focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col gap-3 z-10 shadow-sm transition-colors">
                            {/* Top Row: Providers */}
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI 모델:</span>
                                    {[
                                        { id: 'openai', name: 'CheckGPT', key: 'openai_api_key' },
                                        { id: 'gemini', name: 'Gemini', key: 'gemini_api_key' },
                                        { id: 'perplexity', name: 'Perplexity', key: 'perplexity_api_key' }
                                    ].map((p) => (
                                        <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="ai-provider"
                                                value={p.id}
                                                checked={provider === p.id}
                                                onChange={(e) => setProvider(e.target.value)}
                                                className="accent-purple-600 w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{p.name}</span>
                                            <span
                                                className={`w-2 h-2 rounded-full ${apiKeys[p.key as keyof typeof apiKeys] ? 'bg-green-500' : 'bg-red-500'}`}
                                                title={apiKeys[p.key as keyof typeof apiKeys] ? '준비됨' : '키 필요'}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setPreviewMode(!previewMode)}
                                        className={`px-4 py-2 text-sm rounded-lg border font-medium flex items-center gap-2 transition-all ${previewMode
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 shadow-inner'
                                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm'
                                            }`}
                                    >
                                        {previewMode ? '📝 편집 모드' : '👁️ 미리보기'}
                                    </button>

                                    <button
                                        onClick={handleRewrite}
                                        disabled={rewriting || !apiKeys[`${provider}_api_key` as keyof typeof apiKeys]}
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg disabled:opacity-50 font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {rewriting && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>}
                                        {rewriting ? '작성 중...' : 'AI 다시 쓰기'}
                                    </button>
                                </div>
                            </div>

                            {/* Middle Row: Styles */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <span className="text-sm font-semibold whitespace-nowrap mr-2 text-gray-700 dark:text-gray-300">스타일:</span>
                                {mode === 'blog' ? (
                                    // Blog Styles
                                    ['news', 'review', 'guide', 'story', 'interview', 'custom'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setStyle(s)}
                                            className={`px-4 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all ${style === s
                                                ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-bold'
                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {s === 'news' && '뉴스 기사'}
                                            {s === 'review' && '리뷰'}
                                            {s === 'guide' && '가이드'}
                                            {s === 'story' && '스토리'}
                                            {s === 'interview' && '인터뷰'}
                                            {s === 'custom' && '직접 입력'}
                                        </button>
                                    ))
                                ) : (
                                    // Cafe Styles
                                    ['review', 'info', 'question', 'viral', 'custom'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setStyle(s)}
                                            className={`px-4 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all ${style === s
                                                ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 font-bold'
                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {s === 'review' && '성실 회원 후기'}
                                            {s === 'info' && '꿀팁 공유'}
                                            {s === 'question' && '질문/토론'}
                                            {s === 'viral' && '홍보/바이럴'}
                                            {s === 'custom' && '직접 입력'}
                                        </button>
                                    ))
                                )}
                            </div>

                            {style === 'custom' && (
                                <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="AI가 어떻게 글을 작성해야 할지 지침을 입력해 주세요 (예: 20대 여성을 타겟으로 친근하게 작성해줘)"
                                        className="w-full p-3 text-sm border dark:border-slate-700 rounded-lg h-24 resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-inner"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Editors */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden relative bg-white dark:bg-slate-950 transition-colors">
                            <div className="flex-1 flex gap-6 overflow-hidden">
                                <div className="flex-1 flex flex-col group/original">
                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-tight flex items-center gap-1.5">
                                            원본 내용
                                            {isOriginalLocked && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-medium">수정 잠금</span>}
                                        </label>
                                        <button
                                            onClick={() => setIsOriginalLocked(!isOriginalLocked)}
                                            className={`p-1.5 rounded-lg transition-all ${isOriginalLocked
                                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                }`}
                                            title={isOriginalLocked ? "수정 잠금 해제" : "원본 수정 잠금"}
                                        >
                                            {isOriginalLocked ? (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    {previewMode ? (
                                        <div className="relative flex-1 group/original">
                                            <div
                                                className={`h-full w-full p-5 border dark:border-slate-800 rounded-xl overflow-y-auto prose dark:prose-invert max-w-none shadow-sm transition-colors ${isOriginalLocked ? 'bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400' : 'bg-white dark:bg-slate-900'}`}
                                                dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
                                            />
                                            {isOriginalLocked && (
                                                <div className="absolute top-2 right-2 pointer-events-none opacity-20 group-hover/original:opacity-40 transition-opacity">
                                                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative flex-1">
                                            <textarea
                                                ref={textareaRef}
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                onFocus={() => setActiveEditor('original')}
                                                readOnly={isOriginalLocked}
                                                className={`w-full h-full p-5 border rounded-xl resize-none focus:outline-none transition-all ${activeEditor === 'original'
                                                    ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg shadow-blue-500/10'
                                                    : 'border-gray-200 dark:border-slate-800'
                                                    } ${isOriginalLocked ? 'bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white'}`}
                                            />
                                            {isOriginalLocked && (
                                                <div className="absolute top-2 right-2 pointer-events-none opacity-20 group-hover/original:opacity-40 transition-opacity">
                                                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100 dark:border-slate-800 text-[11px] font-bold text-gray-400 dark:text-gray-500 shadow-sm pointer-events-none">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                {content.length.toLocaleString()}자
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col justify-center">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 animate-pulse">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <label className="text-sm font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tight mb-1.5 px-1 flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                        </span>
                                        AI 리라이팅 결과
                                    </label>
                                    {previewMode ? (
                                        <div
                                            className="flex-1 w-full p-5 border dark:border-slate-800 rounded-xl overflow-y-auto bg-gray-50 dark:bg-slate-900 prose dark:prose-invert max-w-none shadow-inner border-purple-100 dark:border-purple-900/30 transition-colors"
                                            dangerouslySetInnerHTML={{ __html: rewrittenContent.replace(/\n/g, '<br/>') }}
                                        />
                                    ) : (
                                        <div className="relative flex-1">
                                            <textarea
                                                ref={rewrittenTextareaRef}
                                                value={rewrittenContent}
                                                onChange={(e) => setRewrittenContent(e.target.value)}
                                                onFocus={() => setActiveEditor('rewritten')}
                                                className={`w-full h-full p-5 border rounded-xl resize-none focus:outline-none transition-all ${activeEditor === 'rewritten'
                                                    ? 'ring-2 ring-purple-500 border-purple-500 bg-white dark:bg-slate-900 shadow-lg shadow-purple-500/10'
                                                    : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/30'
                                                    } text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600`}
                                                placeholder="AI 다시 쓰기 버튼을 누르면 인공지능이 생성한 세련된 본문이 이곳에 표시됩니다..."
                                            />
                                            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/30 text-[11px] font-bold text-purple-600 dark:text-purple-400 shadow-sm pointer-events-none">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {rewrittenContent.length.toLocaleString()}자
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image Gallery */}
                    <div className="w-full lg:w-80 h-48 lg:h-auto bg-gray-50 dark:bg-slate-900/80 p-5 border-t lg:border-t-0 lg:border-l dark:border-slate-800 overflow-y-auto transition-colors flex-shrink-0">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                이미지 보관함
                                <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{images.length}</span>
                            </h3>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                title="이미지 업로드"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>

                        <div className="space-y-4">
                            {images.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center gap-2">
                                    <svg className="w-12 h-12 text-gray-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-xs text-gray-400 dark:text-gray-600">등록된 이미지가 없습니다</p>
                                </div>
                            )}

                            {images.map((img, idx) => (
                                <div key={idx} className="group relative bg-white dark:bg-slate-800 p-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden animate-in zoom-in-95 duration-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.url} alt={`Img ${idx}`} className="w-full aspect-video object-cover rounded-lg" />

                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-2 p-2">
                                        <button
                                            onClick={() => insertImage(img.url)}
                                            className="w-full py-2 bg-white text-gray-900 text-xs font-bold rounded-lg shadow-xl hover:bg-gray-100 transform translate-y-2 group-hover:translate-y-0 transition-all active:scale-95"
                                        >
                                            본문에 삽입
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteImage(idx)
                                            }}
                                            className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300"
                                            title="이미지 삭제"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center transition-colors">
                    <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                        {uploading ? '📡 이미지 처리 중...' : '💡 AI 리라이팅 결과를 활용해 게시물을 작성해 보세요.'}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap hidden sm:block"
                        >
                            닫기
                        </button>

                        {mode === 'cafe' ? (
                            <button
                                onClick={handleCafeUpload}
                                disabled={postingToCafe || !rewrittenContent}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center gap-2 transform active:scale-95 transition-all"
                            >
                                {postingToCafe ? (
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : '🚀'}
                                {postingToCafe ? '업로드 중...' : '네이버 카페에 업로드'}
                            </button>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                <button
                                    className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-700 font-bold transition-all border border-transparent dark:border-slate-700 text-sm sm:text-base whitespace-nowrap"
                                    onClick={() => handleCopyHtml(content)}
                                >
                                    원본 복사
                                </button>
                                <button
                                    className="w-full sm:w-auto px-4 sm:px-8 py-2.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-500/20 disabled:opacity-50 font-bold transform active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                                    onClick={() => rewrittenContent && handleCopyHtml(rewrittenContent)}
                                    disabled={!rewrittenContent}
                                >
                                    ✨ 리라이팅 복사
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
