import React, { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../store/useCanvasStore";
import { useUIStore } from "../store/useUIStore";
import { useAuthStore } from "../store/useAuthStore";
import { useQuizDataStore } from "../store/useQuizDataStore";
import { useAutosaveStore } from "../store/useAutosaveStore";
import { useAppNavigation } from "@/src/router/useAppNavigation";
import PlanBadge from "./PlanBadge.tsx";
import { useEntitlementStore } from "../store/useEntitlementStore";
import { hasFeature } from "./Paywall.tsx";
import { useHeaderController } from "./header/useHeaderController";
import { HeaderModals } from "./header/HeaderModals";
import { HeaderSaveControls } from "./header/HeaderSaveControls";
import { HeaderUserMenu } from "./header/HeaderUserMenu";
import { HeaderFileMenu } from "./header/HeaderFileMenu";
import SupportCenterModal from "./support/SupportCenterModal";

const Header: React.FC = () => {
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const setCanvasLoading = useCanvasStore((s) => s.setCanvasLoading);
  const currentQuizName = useQuizDataStore((s) => s.currentQuizName);
  const currentQuizId = useQuizDataStore((s) => s.currentQuizId);
  const currentQuizVisibility = useQuizDataStore(
    (s) => s.currentQuizVisibility,
  );
  const saveQuiz = useQuizDataStore((s) => s.saveQuiz);
  const setCurrentQuizName = useQuizDataStore((s) => s.setCurrentQuizName);
  const isSidebarVisible = useUIStore((s) => s.isSidebarVisible);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const isSettingsPanelVisible = useUIStore((s) => s.isSettingsPanelVisible);
  const toggleSettingsPanel = useUIStore((s) => s.toggleSettingsPanel);
  const isAuthModalOpen = useUIStore((s) => s.isAuthModalOpen);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);
  const nav = useAppNavigation();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const ent = useEntitlementStore((s) => s.entitlement);
  const isPro = useEntitlementStore((s) => s.isPro());
  const importLocked = !hasFeature(ent.plan, ent.features, "unlimited_logic");
  const lastAutosave = useAutosaveStore((s) => s.lastAutosave);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [autosaveMessage, setAutosaveMessage] = useState("");
  const controller = useHeaderController({
    currentQuizId,
    currentQuizName,
    importLocked,
    saveQuiz,
    setCanvasLoading,
    setNodes,
    setEdges,
  });

  useEffect(() => {
    if (lastAutosave) {
      const timeString = lastAutosave.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setAutosaveMessage(`${timeString}`);
    }
  }, [lastAutosave]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fileMenuRef.current &&
        !fileMenuRef.current.contains(event.target as Node)
      ) {
        setIsFileMenuOpen(false);
      }
      if (
        saveMenuRef.current &&
        !saveMenuRef.current.contains(event.target as Node)
      ) {
        setIsSaveMenuOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirmClear = () => {
    clearCanvas();
    controller.setIsConfirmClearModalOpen(false);
  };

  return (
    <>
      {/* ✅ INPUT FILE ВЫНЕСЕН НАРУЖУ - ВСЕГДА В DOM */}
      <input
        type="file"
        ref={controller.fileInputRef}
        onChange={controller.handleFileChange}
        accept=".json"
        className="hidden"
      />

      <header className="h-[70px] bg-white/95 backdrop-blur-xl grid grid-cols-[auto_minmax(320px,900px)_auto] items-center gap-4 px-6 shrink-0 shadow-sm border-b border-slate-200/60 sticky top-0 z-50">
        {/* Left Section */}
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          <button
            onClick={toggleSidebar}
            className="group p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
            aria-label={
              isSidebarVisible
                ? "Скрыть панель элементов"
                : "Показать панель элементов"
            }
            title={
              isSidebarVisible
                ? "Скрыть панель элементов"
                : "Показать панель элементов"
            }
          >
            {isSidebarVisible ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl blur-md opacity-50"></div>
              <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-2 shadow-lg">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    fill="white"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  Поток
                </h1>
                {session && <PlanBadge size="sm" />}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Редактор квизов
              </p>
            </div>
          </div>
        </div>

        {/* Center Section */}
        <div className="flex min-w-0 items-center gap-3 justify-self-stretch">
          <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            <input
              type="text"
              value={currentQuizName}
              onChange={(e) => setCurrentQuizName(e.target.value)}
              placeholder="Без названия"
              className="flex-1 text-sm font-semibold text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
              title={currentQuizName}
            />
            {lastAutosave && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">{autosaveMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 justify-self-end">
          {session ? (
            <>
              <HeaderFileMenu
                isOpen={isFileMenuOpen}
                menuRef={fileMenuRef}
                importLocked={importLocked}
                onToggle={() => setIsFileMenuOpen((open) => !open)}
                onClose={() => setIsFileMenuOpen(false)}
                onOpenSettings={() =>
                  controller.setIsGlobalSettingsModalOpen(true)
                }
                onImportJson={controller.handleImportClick}
                onExportJson={controller.handleExportJson}
                onGenerateHtml={controller.handleGenerate}
                onClearCanvas={() =>
                  controller.setIsConfirmClearModalOpen(true)
                }
              />

              <HeaderSaveControls
                isSaving={controller.isSaving}
                isExistingQuiz={Boolean(currentQuizId)}
                isOpen={isSaveMenuOpen}
                menuRef={saveMenuRef}
                currentVisibility={currentQuizVisibility}
                canUsePrivateVisibility={isPro}
                onToggle={() => setIsSaveMenuOpen((open) => !open)}
                onClose={() => setIsSaveMenuOpen(false)}
                onSave={controller.handleSave}
                onSaveWithVisibility={controller.handleSaveAsConfirm}
              />

              <HeaderUserMenu
                email={session.user.email}
                isOpen={isUserMenuOpen}
                menuRef={userMenuRef}
                onToggle={() => setIsUserMenuOpen((open) => !open)}
                onClose={() => setIsUserMenuOpen(false)}
                onDashboard={() => void nav.goToDashboard()}
                onSupport={() => setIsSupportOpen(true)}
                onSignOut={() => void signOut()}
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow"
              >
                Войти
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Регистрация
              </button>
            </div>
          )}

          <div className="h-8 w-px bg-slate-200"></div>

          <button
            onClick={toggleSettingsPanel}
            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
            aria-label={
              isSettingsPanelVisible
                ? "Скрыть панель настроек"
                : "Показать панель настроек"
            }
            title={
              isSettingsPanelVisible
                ? "Скрыть панель настроек"
                : "Показать панель настроек"
            }
          >
            {isSettingsPanelVisible ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      <HeaderModals
        generatedHtml={controller.generatedHtml}
        htmlOpen={controller.isHtmlModalOpen}
        previewOpen={controller.isPreviewModalOpen}
        globalSettingsOpen={controller.isGlobalSettingsModalOpen}
        confirmClearOpen={controller.isConfirmClearModalOpen}
        authOpen={isAuthModalOpen}
        saveAsOpen={controller.isSaveAsModalOpen}
        currentVisibility={currentQuizVisibility}
        isNewQuiz={!currentQuizId}
        onCloseHtml={() => controller.setIsHtmlModalOpen(false)}
        onClosePreview={() => controller.setIsPreviewModalOpen(false)}
        onCloseGlobalSettings={() =>
          controller.setIsGlobalSettingsModalOpen(false)
        }
        onCloseConfirmClear={() => controller.setIsConfirmClearModalOpen(false)}
        onConfirmClear={handleConfirmClear}
        onCloseAuth={() => setAuthModalOpen(false)}
        onCloseSaveAs={() => controller.setIsSaveAsModalOpen(false)}
        onConfirmSaveAs={controller.handleSaveAsConfirm}
      />
      <SupportCenterModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <style>{`
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-scale-in {
                    animation: scale-in 0.2s ease-out forwards;
                }
            `}</style>
    </>
  );
};

export default Header;
