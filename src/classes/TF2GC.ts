import Bot from './Bot';
import log from '@lib/logger';

type Job = {
    type: 'smelt' | 'combine' | 'combineWeapon' | 'combineClassWeapon' | 'use' | 'delete' | 'sort';
    defindex?: number;
    sku?: string;
    skus?: string[];
    assetid?: string;
    sortType?: number;
    callback?: (err?: Error) => void;
};

type ListenForEvent =
    | [string, (...args: any[]) => void, (err: Error) => void]
    | [
          string,
          (...args: any[]) => { success: boolean; clearTimeout?: boolean },
          (...args: any[]) => void,
          (err: Error) => void
      ];

export default class TF2GC {
    private processingQueue = false;

    private startedProcessing = false;

    private jobs: Job[] = [];

    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    smeltMetal(defindex: 5001 | 5002, callback?: (err: Error | null) => void): void {
        if (![5001, 5002].includes(defindex)) {
            return;
        }

        log.debug('Enqueueing smelt job for ' + String(defindex));

        this.newJob({ type: 'smelt', defindex: defindex, callback: callback });
    }

    combineMetal(defindex: 5000 | 5001, callback?: (err: Error | null) => void): void {
        if (![5000, 5001].includes(defindex)) {
            return;
        }

        log.debug('Enqueueing combine job for ' + String(defindex));

        this.newJob({ type: 'combine', defindex: defindex, callback: callback });
    }

    combineWeapon(sku: string, callback?: (err: Error | null) => void): void {
        if (!this.bot.craftWeapons.includes(sku)) {
            return;
        }

        log.debug('Enqueueing combine weapon job for ' + sku);

        this.newJob({ type: 'combineWeapon', sku: sku, callback: callback });
    }

    combineClassWeapon(skus: string[], callback?: (err: Error | null) => void): void {
        skus.forEach(sku => {
            if (!this.bot.craftWeapons.includes(sku)) {
                return;
            }
        });

        log.debug('Enqueueing combine class weapon job for ' + skus.join(', '));

        this.newJob({ type: 'combineClassWeapon', skus: skus, callback: callback });
    }

    useItem(assetid: string, callback?: (err: Error | null) => void): void {
        log.debug('Enqueueing use job for ' + assetid);

        this.newJob({ type: 'use', assetid: assetid, callback: callback });
    }

    deleteItem(assetid: string, callback?: (err: Error | null) => void): void {
        log.debug('Enqueueing delete job for ' + assetid);

        this.newJob({ type: 'delete', assetid: assetid, callback: callback });
    }

    sortInventory(type: number, callback?: (err: Error | null) => void): void {
        log.debug('Enqueueing sort job');

        this.newJob({ type: 'sort', sortType: type, callback: callback });
    }

    private newJob(job: Job): void {
        this.jobs.push(job);
        this.handleJobQueue();
    }

    private handleJobQueue(): void {
        if (this.processingQueue) {
            log.debug('Already handling queue');
            return;
        }

        if (this.jobs.length === 0) {
            log.debug('Queue is empty');

            if (this.startedProcessing) {
                log.debug('Done processing queue');

                this.startedProcessing = false;

                this.bot.handler.onTF2QueueCompleted();
            }
            return;
        }

        this.processingQueue = true;

        const job = this.jobs[0];

        if (!this.canProcessJobWeapon(job) || !this.canProcessJob(job)) {
            log.debug("Can't handle job", { job });
        }

        this.startedProcessing = true;

        log.debug('Ensuring TF2 GC connection...');

        void this.connectToGC().asCallback(err => {
            if (err) {
                return this.finishedProcessingJob(err);
            }

            let func;

            if (job.type === 'combineWeapon') {
                func = this.handleCraftJobWeapon.bind(this, job);
            } else if (job.type === 'combineClassWeapon') {
                func = this.handleCraftJobClassWeapon.bind(this, job);
            } else if (['smelt', 'combine'].includes(job.type)) {
                func = this.handleCraftJob.bind(this, job);
            } else if (['use', 'delete'].includes(job.type)) {
                func = this.handleUseOrDeleteJob.bind(this, job);
            } else if (job.type === 'sort') {
                func = this.handleSortJob.bind(this, job);
            }

            if (func) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                func();
            } else {
                this.finishedProcessingJob(new Error('Unknown job type'));
            }
        });
    }

    private handleCraftJob(job: Job): void {
        if (!this.canProcessJob(job)) {
            return this.finishedProcessingJob(new Error("Can't process job"));
        }

        const assetids = this.bot.inventoryManager.getInventory
            .findBySKU(String(job.defindex) + ';6', true)
            .filter(assetid => !this.bot.trades.isInTrade(assetid));

        const ids = assetids.splice(0, job.type === 'smelt' ? 1 : 3);
        log.debug('Sending craft request');
        this.bot.tf2.craft(ids);

        const gainDefindex = job.defindex + (job.type === 'smelt' ? -1 : 1);
        const gainSKU = String(gainDefindex) + ';6';
        this.listenForEvent(
            'craftingComplete',
            (recipe: number, itemsGained: string[]) => {
                // Remove items used for recipe
                ids.forEach(assetid => this.bot.inventoryManager.getInventory.removeItem(assetid));

                // Add items gained
                itemsGained.forEach(assetid => this.bot.inventoryManager.getInventory.addItem(gainSKU, assetid));

                this.finishedProcessingJob();
            },
            err => {
                this.finishedProcessingJob(err);
            }
        );
    }

    private handleCraftJobWeapon(job: Job): void {
        if (!this.canProcessJobWeapon(job)) {
            return this.finishedProcessingJob(new Error("Can't process weapon crafting job"));
        }

        const assetids = this.bot.inventoryManager.getInventory
            .findBySKU(job.sku, true)
            .filter(assetid => !this.bot.trades.isInTrade(assetid));

        const ids = assetids.splice(0, 2);
        log.debug('Sending weapon craft request');
        this.bot.tf2.craft(ids);

        const gainSKU = '5000;6';
        this.listenForEvent(
            'craftingComplete',
            (recipe: number, itemsGained: string[]) => {
                // Remove items used for recipe
                ids.forEach(assetid => this.bot.inventoryManager.getInventory.removeItem(assetid));

                // Add items gained
                itemsGained.forEach(assetid => this.bot.inventoryManager.getInventory.addItem(gainSKU, assetid));

                this.finishedProcessingJob();
            },
            err => {
                this.finishedProcessingJob(err);
            }
        );
    }

    private handleCraftJobClassWeapon(job: Job): void {
        if (!this.canProcessJobWeapon(job)) {
            return this.finishedProcessingJob(new Error("Can't process class weapon crafting job"));
        }

        const inventory = this.bot.inventoryManager.getInventory;
        const assetids1 = inventory.findBySKU(job.skus[0], true).filter(assetid => !this.bot.trades.isInTrade(assetid));
        const assetids2 = inventory.findBySKU(job.skus[1], true).filter(assetid => !this.bot.trades.isInTrade(assetid));

        const id1 = assetids1[0];
        const id2 = assetids2[0];
        log.debug('Sending weapon craft request');
        this.bot.tf2.craft([id1, id2]);

        const gainSKU = '5000;6';
        this.listenForEvent(
            'craftingComplete',
            (recipe: number, itemsGained: string[]) => {
                // Remove items used for recipe
                this.bot.inventoryManager.getInventory.removeItem(id1);
                this.bot.inventoryManager.getInventory.removeItem(id2);

                // Add items gained
                itemsGained.forEach(assetid => this.bot.inventoryManager.getInventory.addItem(gainSKU, assetid));

                this.finishedProcessingJob();
            },
            err => {
                this.finishedProcessingJob(err);
            }
        );
    }

    private handleUseOrDeleteJob(job: Job): void {
        log.debug('Sending ' + job.type + ' request');

        if (job.type === 'use') {
            this.bot.tf2.useItem(job.assetid);
        } else if (job.type === 'delete') {
            this.bot.tf2.deleteItem(job.assetid);
        }

        this.listenForEvent(
            'itemRemoved',
            (item: TF2GCItem) => {
                log.debug('itemRemoved - item', item);
                return { success: item.id.includes(job.assetid) };
            },
            () => {
                this.bot.inventoryManager.getInventory.removeItem(job.assetid);

                this.finishedProcessingJob();
            },
            err => {
                this.finishedProcessingJob(err);
            }
        );

        if (job.type === 'use') {
            let timeout: NodeJS.Timeout;

            const cancel = this.listenForEvent(
                'itemAcquired',
                (item: TF2GCItem) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        // 1 second after the last item acquired, we will mark the job as finished
                        cancel();
                        this.finishedProcessingJob();
                    }, 1000);

                    log.debug('itemAcquired', {
                        sku: `${item.def_index};${item.quality}`,
                        assetid: item.id
                    });

                    const isNotTradable = item.attribute.some(attr => attr.def_index === 153);

                    this.bot.inventoryManager.getInventory[isNotTradable ? 'addNonTradableItem' : 'addItem'](
                        `${item.def_index};${item.quality}`,
                        item.id
                    );

                    // Clear fail timeout
                    return { success: false, clearTimeout: true };
                },
                () => {
                    this.finishedProcessingJob();
                },
                err => {
                    if (err.message === 'Canceled') {
                        // Was canceled because of timeout
                        this.finishedProcessingJob();
                    } else {
                        // Job failed
                        this.finishedProcessingJob(err);
                    }
                }
            );
        }
    }

    private handleSortJob(job: Job): void {
        log.debug('Sending sort request');

        this.bot.tf2.sortBackpack(job.sortType);
        let timeout: NodeJS.Timeout;

        const cancel = this.listenForEvent(
            'itemChanged',
            () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    // 1 second after the last item has changed we will mark the job as finished
                    cancel();
                    this.finishedProcessingJob();
                }, 1000);

                // Clear fail timeout
                return { success: false, clearTimeout: true };
            },
            () => {
                this.finishedProcessingJob();
            },
            err => {
                if (err.message === 'Canceled') {
                    // Was canceled because of timeout
                    this.finishedProcessingJob();
                } else {
                    // Job failed
                    this.finishedProcessingJob(err);
                }
            }
        );
    }

    /**
     * Listens for GC event
     *
     * @remarks Calls onSuccess function when event has been emitted.
     *
     * @param event - Event to listen for
     * @param onSuccess - Function to call when the event is emitted
     * @param onFail - Function to call when canceled, timed out, or disconnected from GC
     *
     * @returns Call this function to cancel
     */
    private listenForEvent(
        event: string,
        onSuccess: (...args: any[]) => void,
        onFail: (err: Error) => void
    ): () => void;

    /**
     * Listens for GC event
     *
     * @remarks Calls iterator every time event is emittet, if iterator returns success=true
     * then onSuccess is called with the values from the event.
     *
     * @param event - Event to listen for
     * @param iterator - Function to call when event is emitted
     * @param onSuccess - Function to call on success
     * @param onFail - Function to call when canceled, timed out, or disconnected from GC
     *
     * @returns Call this function to cancel
     */
    private listenForEvent(
        event: string,
        iterator: (...args: any[]) => { success: boolean; clearTimeout?: boolean },
        onSuccess: (...args: any[]) => void,
        onFail: (err: Error) => void
    ): () => void;

    private listenForEvent(...args: ListenForEvent): () => void {
        const event = args[0];
        const iterator =
            args.length === 4
                ? args[1]
                : function (): {
                      success: boolean;
                      clearTimeout?: boolean;
                  } {
                      return { success: true };
                  };
        const successCallback = args.length === 4 ? args[2] : args[1];
        const failCallback = args.length === 4 ? args[3] : args[2];

        function onEvent(...args: any[]): void {
            const response = iterator(...args);

            if (response.success) {
                removeListeners();
                successCallback(...args);
            } else if (response.clearTimeout === true) {
                clearTimeout(timeout);
            }
        }

        function onDisconnected(): void {
            removeListeners();

            failCallback(new Error('Disconnected from TF2 GC'));
        }

        function onTimeout(): void {
            removeListeners();

            failCallback(new Error('Timed out'));
        }

        function onCancel(): void {
            removeListeners();

            failCallback(new Error('Canceled'));
        }

        const removeListeners = (): void => {
            clearTimeout(timeout);
            this.bot.tf2.removeListener(event, onEvent);
            this.bot.tf2.removeListener('disconnectedFromGC', onDisconnected);
        };

        const timeout = setTimeout(onTimeout, 10000);
        this.bot.tf2.on(event, onEvent);

        return onCancel;
    }

    private finishedProcessingJob(err: Error | null = null): void {
        const job = this.jobs.splice(0, 1)[0];

        if (job !== undefined && job.callback) {
            job.callback(err);
        }

        this.processingQueue = false;

        this.handleJobQueue();
    }

    private canProcessJob(job: Job): boolean {
        if (['smelt', 'combine'].includes(job.type)) {
            const assetids = this.bot.inventoryManager.getInventory
                .findBySKU(String(job.defindex) + ';6', true)
                .filter(assetid => !this.bot.trades.isInTrade(assetid));

            const assetidsCount = assetids.length;

            return (job.type === 'smelt' && assetidsCount > 0) || (job.type === 'combine' && assetidsCount >= 3);
        } else if (['use', 'delete'].includes(job.type)) {
            return this.bot.inventoryManager.getInventory.findByAssetid(job.assetid) !== null;
        }

        return true;
    }

    private canProcessJobWeapon(job: Job): boolean {
        if (job.type === 'combineWeapon') {
            const assetids = this.bot.inventoryManager.getInventory
                .findBySKU(job.sku, true)
                .filter(assetid => !this.bot.trades.isInTrade(assetid));

            return job.type === 'combineWeapon' && assetids.length >= 2;
        } else if (job.type === 'combineClassWeapon') {
            const assetids1 = this.bot.inventoryManager.getInventory
                .findBySKU(job.skus[0], true)
                .filter(assetid => !this.bot.trades.isInTrade(assetid));
            const assetids2 = this.bot.inventoryManager.getInventory
                .findBySKU(job.skus[1], true)
                .filter(assetid => !this.bot.trades.isInTrade(assetid));

            return job.type === 'combineClassWeapon' && assetids1.length >= 1 && assetids2.length >= 1;
        }
        return true;
    }

    private connectToGC(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isConnectedToGC) {
                log.debug('Not playing TF2');
                this.bot.client.gamesPlayed(440);
            }

            if (this.bot.tf2.haveGCSession) {
                log.debug('Already connected to TF2 GC');
                return resolve();
            }

            const bot = this.bot;

            this.listenForEvent(
                'connectedToGC',
                () => {
                    log.debug('running connectToGC iterator...');
                    return { success: true };
                },
                () => {
                    log.debug('onSuccess connectToGC.');
                    resolve();
                },
                () => {
                    log.debug('onFail connectToGC.');
                    bot.client.gamesPlayed([]);
                    reject(new Error('Could not connect to TF2 GC, restarting TF2..'));
                }
            );
        });
    }

    private get isConnectedToGC(): boolean {
        return this.bot.client._playingAppIds.some(game => game == 440);
    }
}

interface TF2GCItem {
    attribute: Attribute[];
    equipped_state: any[];
    id: string;
    account_id: number;
    inventory: number;
    def_index: number;
    quantity: number;
    level: number;
    quality: number;
    flags: number;
    origin: number;
    custom_name: string | null;
    custom_desc: string | null;
    interior_item: any | null;
    in_use: boolean;
    style: number;
    original_id: string | null;
    contains_equipped_state: boolean | null;
    contains_equipped_state_v2: boolean | null;
    position: number;
}

interface Attribute {
    def_index: number;
    value: any;
    value_bytes: {
        type: string;
        data: number[];
    };
}
