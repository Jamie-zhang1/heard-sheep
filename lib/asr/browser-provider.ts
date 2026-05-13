import type { AsrProvider, TranscribeInput, TranscribeResult } from "./provider";

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isBrowserAsrAvailable(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

/**
 * Creates a SpeechRecognition instance that streams real-time interim results.
 * Returns an object to control recognition and a promise that resolves with the final transcript.
 */
export function createSpeechRecognition(options?: {
  lang?: string;
  onInterim?: (text: string) => void;
}): {
  start: () => void;
  stop: () => Promise<string>;
  abort: () => void;
} {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) {
    throw new Error("SpeechRecognition is not available in this browser");
  }

  const recognition = new Ctor();
  recognition.lang = options?.lang || "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = "";
  let interimText = "";
  let resolvePromise: ((text: string) => void) | null = null;
  let rejectPromise: ((err: Error) => void) | null = null;
  const resultPromise = new Promise<string>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }
    const combined = finalText + interimText;
    options?.onInterim?.(combined);
  };

  recognition.onerror = (event: { error: string }) => {
    // "no-speech" and "aborted" are expected when user stops recording
    if (event.error === "no-speech" || event.error === "aborted") {
      resolvePromise?.(finalText || interimText || "");
      return;
    }
    console.warn("[ASR] SpeechRecognition error:", event.error);
    rejectPromise?.(new Error(`SpeechRecognition error: ${event.error}`));
  };

  recognition.onend = () => {
    resolvePromise?.(finalText || interimText || "");
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch {
        // Already started, ignore
      }
    },
    stop: () => {
      return new Promise<string>((resolve) => {
        const originalResolve = resolvePromise;
        resolvePromise = (text) => {
          originalResolve?.(text);
          resolve(text);
        };
        try {
          recognition.stop();
        } catch {
          resolve(finalText || interimText || "");
        }
      });
    },
    abort: () => {
      try {
        recognition.abort();
      } catch {
        // Ignore
      }
      resolvePromise?.(finalText || interimText || "");
    }
  };
}

/**
 * Browser ASR provider — uses Web Speech API for real-time transcription.
 * This is designed to run in the browser only; the server-side route still uses the server ASR provider.
 */
export const browserAsrProvider: AsrProvider = {
  name: "browser",

  async transcribe(_input: TranscribeInput): Promise<TranscribeResult> {
    // This provider is used as a fallback reference; actual browser ASR
    // is driven from the client component via createSpeechRecognition().
    throw new Error(
      "browserAsrProvider.transcribe() should not be called directly. " +
      "Use createSpeechRecognition() in client components instead."
    );
  }
};
