/**
 * Pipeline Orchestrator - Coordinates the AI processing pipeline
 */
import type { ExtensionSettings } from '@shared/types/pipeline';
import type { ActionPayload } from '@shared/types/messages';
import type { SessionWrapper } from '../sessionManager';
export interface PipelineResult {
    success: boolean;
    message: string;
    actions?: ActionPayload[];
    requiresClarification?: boolean;
    clarificationQuestion?: string;
    clarificationOptions?: string[];
}
/**
 * Main pipeline processing function
 */
export declare function processPipeline(command: string, tabId: number, settings: ExtensionSettings, session: SessionWrapper): Promise<PipelineResult>;
//# sourceMappingURL=index.d.ts.map