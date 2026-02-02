const GPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";

type GoogletagSlot = {
  addService: (service: GoogletagPubAdsService) => void;
};

type RewardedSlotReadyEvent = {
  slot: GoogletagSlot;
  makeRewardedVisible: () => void;
};

type RewardedSlotGrantedEvent = {
  slot: GoogletagSlot;
};

type RewardedSlotClosedEvent = {
  slot: GoogletagSlot;
};

type SlotRenderEndedEvent = {
  slot: GoogletagSlot;
  isEmpty: boolean;
};

type GoogletagPubAdsService = {
  addEventListener: (eventType: string, listener: (event: unknown) => void) => void;
  removeEventListener: (eventType: string, listener: (event: unknown) => void) => void;
};

type Googletag = {
  cmd: Array<() => void>;
  apiReady?: boolean;
  enums: { OutOfPageFormat: { REWARDED: unknown } };
  defineOutOfPageSlot: (adUnitPath: string, format: unknown) => GoogletagSlot | null;
  display: (slot: GoogletagSlot | string) => void;
  pubads: () => GoogletagPubAdsService;
  enableServices: () => void;
  destroySlots: (slots?: GoogletagSlot[]) => void;
};

declare global {
  interface Window {
    googletag?: Googletag;
  }
}

let gptPromise: Promise<void> | null = null;

function loadGptScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GPT is only available in the browser."));
  }

  if (window.googletag?.apiReady) {
    return Promise.resolve();
  }

  window.googletag = window.googletag ?? ({ cmd: [] } as unknown as Googletag);

  if (!gptPromise) {
    gptPromise = new Promise((resolve, reject) => {
      const script = window.document.createElement("script");
      script.async = true;
      script.src = GPT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        gptPromise = null;
        script.remove();
        reject(new Error("Failed to load GPT script."));
      };
      window.document.head.appendChild(script);
    });
  }

  return gptPromise.catch((error) => {
    gptPromise = null;
    throw error;
  });
}

export type RewardedAdCallbacks = {
  onReady?: (show: () => void) => void;
  onGranted?: () => void;
  onClosed?: () => void;
  onRenderEnded?: (isEmpty: boolean) => void;
  onError?: (message: string) => void;
};

export type RewardedAdHandle = {
  show: () => void;
  destroy: () => void;
};

type RewardedAdOptions = {
  adUnitPath: string;
  callbacks?: RewardedAdCallbacks;
};

export async function loadRewardedAd({ adUnitPath, callbacks }: RewardedAdOptions) {
  if (!adUnitPath) {
    callbacks?.onError?.("Rewarded ad unit path is missing.");
    throw new Error("Rewarded ad unit path is missing.");
  }

  await loadGptScript();

  return new Promise<RewardedAdHandle>((resolve, reject) => {
    const googletag = window.googletag;
    if (!googletag) {
      callbacks?.onError?.("GPT is not available.");
      reject(new Error("GPT is not available."));
      return;
    }

    googletag.cmd.push(() => {
      const pubads = googletag.pubads();
      const slot = googletag.defineOutOfPageSlot(
        adUnitPath,
        googletag.enums.OutOfPageFormat.REWARDED,
      );

      if (!slot) {
        callbacks?.onError?.("Rewarded slot could not be created.");
        reject(new Error("Rewarded slot could not be created."));
        return;
      }

      slot.addService(pubads);

      let showRewarded: (() => void) | null = null;

      const handleReady = (event: unknown) => {
        const readyEvent = event as RewardedSlotReadyEvent;
        if (readyEvent.slot !== slot) {
          return;
        }
        showRewarded = () => readyEvent.makeRewardedVisible();
        callbacks?.onReady?.(showRewarded);
      };

      const handleGranted = (event: unknown) => {
        const grantedEvent = event as RewardedSlotGrantedEvent;
        if (grantedEvent.slot !== slot) {
          return;
        }
        callbacks?.onGranted?.();
      };

      const handleClosed = (event: unknown) => {
        const closedEvent = event as RewardedSlotClosedEvent;
        if (closedEvent.slot !== slot) {
          return;
        }
        callbacks?.onClosed?.();
      };

      const handleRenderEnded = (event: unknown) => {
        const renderEvent = event as SlotRenderEndedEvent;
        if (renderEvent.slot !== slot) {
          return;
        }
        callbacks?.onRenderEnded?.(renderEvent.isEmpty);
      };

      pubads.addEventListener("rewardedSlotReady", handleReady);
      pubads.addEventListener("rewardedSlotGranted", handleGranted);
      pubads.addEventListener("rewardedSlotClosed", handleClosed);
      pubads.addEventListener("slotRenderEnded", handleRenderEnded);

      googletag.enableServices();
      googletag.display(slot);

      const destroy = () => {
        pubads.removeEventListener("rewardedSlotReady", handleReady);
        pubads.removeEventListener("rewardedSlotGranted", handleGranted);
        pubads.removeEventListener("rewardedSlotClosed", handleClosed);
        pubads.removeEventListener("slotRenderEnded", handleRenderEnded);
        googletag.destroySlots([slot]);
      };

      const show = () => {
        if (!showRewarded) {
          callbacks?.onError?.("Rewarded slot is not ready yet.");
          return;
        }
        showRewarded();
      };

      resolve({ show, destroy });
    });
  });
}
