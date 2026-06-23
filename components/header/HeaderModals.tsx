import type { QuizVisibility } from '../../types';
import AuthModal from '../modals/AuthModal';
import ConfirmClearModal from '../modals/ConfirmClearModal';
import GeneratedHtmlModal from '../modals/GeneratedHtmlModal';
import GlobalSettingsModal from '../modals/GlobalSettingsModal';
import PreviewModal from '../modals/PreviewModal';
import SaveAsModal from '../modals/SaveAsModal';

interface HeaderModalsProps {
  generatedHtml: string;
  htmlOpen: boolean;
  previewOpen: boolean;
  globalSettingsOpen: boolean;
  confirmClearOpen: boolean;
  authOpen: boolean;
  saveAsOpen: boolean;
  currentVisibility: QuizVisibility | null;
  isNewQuiz: boolean;
  onCloseHtml: () => void;
  onClosePreview: () => void;
  onCloseGlobalSettings: () => void;
  onCloseConfirmClear: () => void;
  onConfirmClear: () => void;
  onCloseAuth: () => void;
  onCloseSaveAs: () => void;
  onConfirmSaveAs: (visibility: QuizVisibility) => void | Promise<void>;
}

export function HeaderModals(props: HeaderModalsProps) {
  return (
    <>
      <GeneratedHtmlModal
        isOpen={props.htmlOpen}
        onClose={props.onCloseHtml}
        htmlContent={props.generatedHtml}
      />
      <PreviewModal
        isOpen={props.previewOpen}
        onClose={props.onClosePreview}
        htmlContent={props.generatedHtml}
      />
      <GlobalSettingsModal
        isOpen={props.globalSettingsOpen}
        onClose={props.onCloseGlobalSettings}
      />
      <ConfirmClearModal
        isOpen={props.confirmClearOpen}
        onClose={props.onCloseConfirmClear}
        onConfirm={props.onConfirmClear}
      />
      <AuthModal
        id="auth-modal"
        isOpen={props.authOpen}
        onClose={props.onCloseAuth}
      />
      <SaveAsModal
        isOpen={props.saveAsOpen}
        onClose={props.onCloseSaveAs}
        currentVisibility={props.currentVisibility}
        isNew={props.isNewQuiz}
        onConfirm={props.onConfirmSaveAs}
      />
    </>
  );
}
