import React from 'react';
import { useApplyPreferencesToDom } from '../hooks/useApplyPreferencesToDom';
import { useSyncBoardSettings } from '../hooks/useSyncBoardSettings';

const PreferencesApplicator: React.FC = () => {
  useApplyPreferencesToDom();
  useSyncBoardSettings();
  return null;
};

export default PreferencesApplicator;
