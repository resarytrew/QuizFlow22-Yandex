
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/apiClient';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import toast from 'react-hot-toast';

interface Asset {
    name: string;
    key: string;
    url: string;
    type: 'image' | 'audio';
    created_at: string;
    folder: string;
}

interface Folder {
    name: string;
    path: string;
    type: 'images' | 'audio' | 'quiz';
    subfolders?: Folder[];
}

// Helper for transliteration (Cyrillic to Latin)
const transliterate = (text: string) => {
    const ru: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
        'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
        'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
        'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
        'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    return text.split('').map(char => ru[char] || char).join('');
};

const AssetManagerModal: React.FC = () => {
    const isAssetManagerOpen = useUIStore(s => s.isAssetManagerOpen);
    const closeAssetManager = useUIStore(s => s.closeAssetManager);
    const onAssetSelect = useUIStore(s => s.onAssetSelect);
    const session = useAuthStore(s => s.session);
    const userQuizzes = useQuizDataStore(s => s.userQuizzes);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isReturning, setIsReturning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Переключение режима выбора
    const toggleAssetSelection = (name: string) => {
        const newSet = new Set(selectedAssets);
        if (newSet.has(name)) {
            newSet.delete(name);
        } else {
            newSet.add(name);
        }
        setSelectedAssets(newSet);
    };

    const handleBulkMove = async (targetFolder: string) => {
        if (selectedAssets.size === 0 || !session) return;
        
        const assetsToMove = assets.filter(a => selectedAssets.has(a.name));
        
        for (const asset of assetsToMove) {
            try {
                await api.moveAsset(asset.key, targetFolder);
            } catch (err) {
                console.error('Move error:', err);
            }
        }

        toast.success(`Перемещено ${assetsToMove.length} файлов`);
        setSelectedAssets(new Set());
        setIsSelectionMode(false);
        fetchAssets(currentPath);
    };

    const handleReturnAllToRoot = async () => {
        if (!session) return;
        if (!window.confirm('Вернуть все файлы из папок в корень?')) return;
        
        setIsReturning(true);
        
        try {
            const { assets: allFiles } = await api.listAssets('');
            const filesInFolders = allFiles.filter(item => item.folder);

            if (filesInFolders.length === 0) {
                toast.success('Нет файлов в папках');
                setIsReturning(false);
                return;
            }

            let moved = 0;
            for (const file of filesInFolders) {
                await api.moveAsset(file.key, '');
                moved++;
            }

            toast.success(`Перемещено ${moved} файлов в корень`);
            fetchAssets(currentPath);
        } catch (err) {
            console.error('Return error:', err);
            toast.error('Ошибка возврата файлов');
        }
        
        setIsReturning(false);
    };

    // Структура папок
    const folderStructure = useMemo(() => {
        const result: Folder[] = [
            { name: 'Изображения', path: 'images', type: 'images' },
            { name: 'Аудио', path: 'audio', type: 'audio' },
        ];
        
        // Добавляем папки для каждого квиза
        if (userQuizzes) {
            userQuizzes.forEach(quiz => {
                const folderName = transliterate(quiz.name).replace(/[^a-zA-Z0-9-_]/g, '_');
                result.push({
                    name: quiz.name,
                    path: folderName,
                    type: 'quiz',
                    subfolders: [
                        { name: 'Изображения', path: `${folderName}/images`, type: 'images' },
                        { name: 'Аудио', path: `${folderName}/audio`, type: 'audio' },
                    ]
                });
            });
        }
        
        return result;
    }, [userQuizzes]);

    useEffect(() => {
        if (isAssetManagerOpen && session) {
            fetchAssets();
            setSearchQuery('');
            setCurrentPath('');
        }
    }, [isAssetManagerOpen, session]);

    const fetchAssets = async (path: string = '') => {
        if (!session) return;
        setIsLoading(true);
        try {
            const { assets: assetList } = await api.listAssets(path);
            setAssets(assetList);
        } catch (error) {
            console.error('Error fetching assets:', error);
            toast.error('Ошибка загрузки списка файлов');
        }
        setIsLoading(false);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !session) return;

        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.ogg');

        if (!isImage && !isAudio) {
            toast.error('Можно загружать только изображения или аудио');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Максимальный размер файла 10MB');
            return;
        }

        setIsUploading(true);
        
        const lastDotIndex = file.name.lastIndexOf('.');
        const originalName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
        const fileExt = lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1) : '';
        
        const transliteratedName = transliterate(originalName);
        const cleanName = transliteratedName.replace(/[^a-zA-Z0-9-_]/g, "_");
        const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
        
        // Определяем путь для загрузки
        const uploadPath = currentPath || (isImage ? 'images' : 'audio');
        const fullName = `${uploadPath}/${fileName}`;
        try {
            const { uploadUrl } = await api.getUploadUrl(fullName, file.type || 'application/octet-stream');
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file,
            });
            if (!uploadResponse.ok) throw new Error(`HTTP ${uploadResponse.status}`);
            toast.success('Файл загружен!');
            fetchAssets(currentPath);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Ошибка загрузки');
        }
        setIsUploading(false);
        event.target.value = '';
    };

    const handleDelete = async (asset: Asset, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!session || !window.confirm('Удалить этот файл?')) return;

        try {
            await api.deleteAsset(asset.key);
            toast.success('Файл удален');
            setAssets(prev => prev.filter(a => a.key !== asset.key));
        } catch {
            toast.error('Ошибка удаления');
        }
    };

    const handleMove = async (asset: Asset, newFolder: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!session) return;

        try {
            await api.moveAsset(asset.key, newFolder);
            toast.success('Файл перемещён');
            fetchAssets(currentPath);
        } catch (err) {
            console.error('Move error:', err);
            toast.error('Ошибка перемещения');
        }
    };

    const handleSelect = (url: string) => {
        if (onAssetSelect) {
            onAssetSelect(url);
            closeAssetManager();
        } else {
            navigator.clipboard.writeText(url);
            toast.success('Ссылка скопирована');
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        
        const cleanName = transliterate(newFolderName.trim()).replace(/[^a-zA-Z0-9-_]/g, '_');
        
        if (!session) return;
        await api.createAssetFolder(cleanName).catch(() => undefined);
        
        setShowNewFolderInput(false);
        setNewFolderName('');
        fetchAssets(currentPath);
    };

    const navigateToFolder = (path: string) => {
        setCurrentPath(path);
        fetchAssets(path);
    };

    const goBack = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        const newPath = parts.join('/');
        setCurrentPath(newPath);
        fetchAssets(newPath);
    };

    const getCurrentFolderName = () => {
        if (!currentPath) return 'Корень';
        
        // Ищем в структуре
        for (const folder of folderStructure) {
            if (folder.path === currentPath) return folder.name;
            if (folder.subfolders) {
                for (const sub of folder.subfolders) {
                    if (sub.path === currentPath) return sub.name;
                }
            }
        }
        return currentPath;
    };

    const filteredAssets = assets.filter(asset => 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAssetManagerOpen) return null;

    const content = (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" onClick={closeAssetManager}>
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>
            
            <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-in" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        {isSelectionMode ? (
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => { setSelectedAssets(new Set()); setIsSelectionMode(false); }}
                                    className="text-slate-500 hover:text-slate-700"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <span className="font-bold text-slate-800">Выбрано: {selectedAssets.size}</span>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-slate-800">Медиатека</h2>
                                <p className="text-sm text-slate-500">Управляйте файлами для ваших квизов</p>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleReturnAllToRoot}
                            disabled={isReturning}
                            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isReturning ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            )}
                            Вернуть в корень
                        </button>
                        {isSelectionMode && selectedAssets.size > 0 && (
                            <div className="relative group">
                                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                                    Переместить ({selectedAssets.size})
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-20 hidden group-hover:block">
                                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">Выберите папку:</div>
                                    <button onClick={() => handleBulkMove('images')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Изображения
                                    </button>
                                    <button onClick={() => handleBulkMove('audio')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                        Аудио
                                    </button>
                                    {userQuizzes?.map(quiz => {
                                        const folderName = transliterate(quiz.name).replace(/[^a-zA-Z0-9-_]/g, '_');
                                        return (
                                            <button key={folderName} onClick={() => handleBulkMove(folderName)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                                {quiz.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {!isSelectionMode && (
                            <button 
                                onClick={() => setIsSelectionMode(true)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                Выбрать
                            </button>
                        )}
                        <button onClick={closeAssetManager} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    
                    {/* Sidebar / Upload Area */}
                    <div className="w-full md:w-72 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
                         {/* Загрузка файла */}
                         <div 
                            className={`border-2 border-dashed border-indigo-300 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:bg-indigo-50 hover:border-indigo-500 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                         >
                             <input type="file" className="hidden" ref={fileInputRef} onChange={handleUpload} accept="image/*,audio/*" />
                             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                                 {isUploading ? (
                                     <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                 ) : (
                                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                 )}
                             </div>
                             <p className="text-xs font-semibold text-indigo-900">{isUploading ? 'Загрузка...' : 'Загрузить'}</p>
                             <p className="text-[10px] text-indigo-600 mt-1">до 10MB</p>
                         </div>
                         
                         {/* Поиск */}
                         <div className="relative">
                             <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Поиск..."
                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             />
                             <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                         </div>
                         
                         {/* Папки */}
                         <div className="space-y-1">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Папки</h3>
                            
                            {/* Кнопка возврата назад */}
                            {currentPath && (
                                <button 
                                    onClick={goBack}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Назад
                                </button>
                            )}
                            
                            {/* Главные папки */}
                            {folderStructure.map(folder => (
                                <div key={folder.path}>
                                    {folder.type === 'quiz' ? (
                                        <div>
                                            <button 
                                                onClick={() => navigateToFolder(folder.path)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                                    currentPath === folder.path 
                                                        ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                                                        : 'text-slate-600 hover:bg-white'
                                                }`}
                                            >
                                                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                </svg>
                                                <span className="truncate">{folder.name}</span>
                                            </button>
                                            
                                            {/* Подпапки */}
                                            {folder.subfolders && currentPath === folder.path && (
                                                <div className="ml-4 space-y-1 mt-1">
                                                    {folder.subfolders.map(sub => (
                                                        <button 
                                                            key={sub.path}
                                                            onClick={() => navigateToFolder(sub.path)}
                                                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                                                currentPath === sub.path 
                                                                    ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                                                                    : 'text-slate-500 hover:bg-white'
                                                            }`}
                                                        >
                                                            {sub.type === 'images' ? (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                                            )}
                                                            <span>{sub.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => navigateToFolder(folder.path)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                                currentPath === folder.path 
                                                    ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                                                    : 'text-slate-600 hover:bg-white'
                                            }`}
                                        >
                                            {folder.type === 'images' ? (
                                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                                </svg>
                                            )}
                                            <span>{folder.name}</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                         </div>

                         {/* Хлебные крошки */}
                         <div className="text-xs text-slate-500 py-2 border-t border-slate-200">
                             Текущая папка: <span className="font-semibold text-slate-700">{getCurrentFolderName()}</span>
                         </div>
                    </div>

                    {/* Gallery Grid */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                        ) : filteredAssets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-center">{searchQuery ? 'Ничего не найдено' : 'Нет файлов'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredAssets.map((asset) => (
                                    <div 
                                        key={asset.name} 
                                        className={`group relative flex flex-col bg-white rounded-xl border-2 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden h-[180px] ${
                                            isSelectionMode 
                                                ? (selectedAssets.has(asset.name) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200')
                                                : 'border-slate-200'
                                        }`}
                                        onClick={() => isSelectionMode ? toggleAssetSelection(asset.name) : handleSelect(asset.url)}
                                        title={asset.name}
                                    >
                                        {/* Чекбокс в режиме выбора */}
                                        {isSelectionMode && (
                                            <div className="absolute top-2 left-2 z-10">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                    selectedAssets.has(asset.name) 
                                                        ? 'bg-indigo-500 border-indigo-500' 
                                                        : 'border-slate-400 bg-white'
                                                }`}>
                                                    {selectedAssets.has(asset.name) && (
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="relative flex-grow overflow-hidden bg-gray-100 flex items-center justify-center">
                                            {asset.type === 'audio' ? (
                                                <div className="flex flex-col items-center justify-center text-gray-500 w-full p-2">
                                                    <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                                    <audio src={asset.url} controls className="w-full h-8" onClick={e => e.stopPropagation()} />
                                                </div>
                                            ) : (
                                                <img src={asset.url} alt="asset" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            )}
                                            
                                            {/* Hover Overlay */}
                                            {!isSelectionMode && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                    <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-bold text-slate-800 shadow-sm">Выбрать</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 border-t border-slate-100 bg-white flex justify-between items-center gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-medium text-slate-700 truncate block w-full">{asset.name}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(asset.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={(e) => handleDelete(asset, e)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Удалить"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
             <style>{`
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );

    return createPortal(content, document.body);
};

export default AssetManagerModal;
