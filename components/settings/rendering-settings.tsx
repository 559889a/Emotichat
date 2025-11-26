'use client';

import { useEffect } from 'react';
import { useUIPreferences } from '@/stores/uiPreferences';
import { ThinkingSettingsCard } from './thinking-settings-card';
import { SpecialFieldsCard } from './special-fields-card';
import { HtmlRenderingCard } from './html-rendering-card';

export function RenderingSettings() {
  const prefs = useUIPreferences();
  const { thinkingLLMAssist, setThinkingLLMAssist } = prefs;

  useEffect(() => {
    if (thinkingLLMAssist) {
      setThinkingLLMAssist(false);
    }
  }, [thinkingLLMAssist, setThinkingLLMAssist]);

  return (
    <div className="space-y-6">
      <ThinkingSettingsCard
        thinkingCollapsed={prefs.thinkingCollapsed}
        setThinkingCollapsed={prefs.setThinkingCollapsed}
        thinkingAutoComplete={prefs.thinkingAutoComplete}
        setThinkingAutoComplete={prefs.setThinkingAutoComplete}
        thinkingLLMAssist={prefs.thinkingLLMAssist}
        setThinkingLLMAssist={prefs.setThinkingLLMAssist}
        thinkingLLMProtocol={prefs.thinkingLLMProtocol}
        setThinkingLLMProtocol={prefs.setThinkingLLMProtocol}
        thinkingLLMEndpoint={prefs.thinkingLLMEndpoint}
        setThinkingLLMEndpoint={prefs.setThinkingLLMEndpoint}
        thinkingLLMApiKey={prefs.thinkingLLMApiKey}
        setThinkingLLMApiKey={prefs.setThinkingLLMApiKey}
        thinkingLLMModel={prefs.thinkingLLMModel}
        setThinkingLLMModel={prefs.setThinkingLLMModel}
        thinkingTags={prefs.thinkingTags}
        addThinkingTag={prefs.addThinkingTag}
        removeThinkingTag={prefs.removeThinkingTag}
        updateThinkingTag={prefs.updateThinkingTag}
      />

      <SpecialFieldsCard
        specialFieldRules={prefs.specialFieldRules}
        addSpecialFieldRule={prefs.addSpecialFieldRule}
        removeSpecialFieldRule={prefs.removeSpecialFieldRule}
        updateSpecialFieldRule={prefs.updateSpecialFieldRule}
      />

      <HtmlRenderingCard
        enableHtmlRendering={prefs.enableHtmlRendering}
        setEnableHtmlRendering={prefs.setEnableHtmlRendering}
      />
    </div>
  );
}
