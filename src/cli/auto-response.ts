// Types for automated responses in interactive commands
export interface AutoResponse {
  // For $.confirm() - boolean responses
  confirmResponses?: boolean[];
  
  // For $.multiSelect() - array of selected indices
  multiSelectResponses?: number[][];
  
  // For prompt() - string responses  
  promptResponses?: string[];
  
  // Track current response index for each type
  _confirmIndex?: number;
  _multiSelectIndex?: number;
  _promptIndex?: number;
}

// Helper to get next confirmation response
export function getNextConfirmResponse(autoResponse: AutoResponse): boolean | undefined {
  if (!autoResponse.confirmResponses || autoResponse.confirmResponses.length === 0) {
    return undefined;
  }
  
  if (!autoResponse._confirmIndex) {
    autoResponse._confirmIndex = 0;
  }
  
  const response = autoResponse.confirmResponses[autoResponse._confirmIndex];
  autoResponse._confirmIndex++;
  
  return response;
}

// Helper to get next multiSelect response
export function getNextMultiSelectResponse(autoResponse: AutoResponse): number[] | undefined {
  if (!autoResponse.multiSelectResponses || autoResponse.multiSelectResponses.length === 0) {
    return undefined;
  }
  
  if (!autoResponse._multiSelectIndex) {
    autoResponse._multiSelectIndex = 0;
  }
  
  const response = autoResponse.multiSelectResponses[autoResponse._multiSelectIndex];
  autoResponse._multiSelectIndex++;
  
  return response;
}

// Helper to get next prompt response
export function getNextPromptResponse(autoResponse: AutoResponse): string | undefined {
  if (!autoResponse.promptResponses || autoResponse.promptResponses.length === 0) {
    return undefined;
  }
  
  if (!autoResponse._promptIndex) {
    autoResponse._promptIndex = 0;
  }
  
  const response = autoResponse.promptResponses[autoResponse._promptIndex];
  autoResponse._promptIndex++;
  
  return response;
}