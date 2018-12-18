"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dummy = {};
function using(disposable, action) {
    try {
        return action(disposable);
    }
    finally {
        disposable.dispose();
    }
}
exports.using = using;
async function asyncUsing(disposable, action) {
    try {
        return await action(disposable);
    }
    finally {
        disposable.dispose();
    }
}
exports.asyncUsing = asyncUsing;
class Mutex {
    constructor() {
        this.queue = [];
        this.active = false;
    }
    dispose() {
        for (let triggers = this.queue.shift(); triggers; triggers = this.queue.shift()) {
            triggers.reject('cancelled');
        }
    }
    lock() {
        return new Promise((resolve, reject) => {
            // this runs syncronously...
            if (this.active || this.queue.length) {
                this.queue.push({ resolve, reject });
            }
            else {
                this.active = true;
                resolve();
            }
        });
    }
    release() {
        // this runs syncronously...
        const triggers = this.queue.shift();
        if (triggers) {
            setTimeout(() => triggers.resolve(), 0);
        }
        else {
            this.active = false;
        }
    }
}
exports.Mutex = Mutex;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXV0ZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbXV0ZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7QUFNakIsU0FBZ0IsS0FBSyxDQUEwQixVQUFhLEVBQUUsTUFBcUI7SUFDakYsSUFBSTtRQUNGLE9BQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQzNCO1lBQVM7UUFDUixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7S0FDdEI7QUFDSCxDQUFDO0FBTkQsc0JBTUM7QUFFTSxLQUFLLFVBQVUsVUFBVSxDQUEwQixVQUFhLEVBQUUsTUFBOEI7SUFDckcsSUFBSTtRQUNGLE9BQU8sTUFBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDakM7WUFBUztRQUNSLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUN0QjtBQUNILENBQUM7QUFORCxnQ0FNQztBQUVELE1BQWEsS0FBSztJQUFsQjtRQUNtQixVQUFLLEdBQW9ELEVBQUUsQ0FBQztRQUNyRSxXQUFNLEdBQUcsS0FBSyxDQUFDO0lBMEJ6QixDQUFDO0lBekJDLE9BQU87UUFDTCxLQUFLLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQy9FLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDOUI7SUFDSCxDQUFDO0lBQ0QsSUFBSTtRQUNGLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckMsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtnQkFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQzthQUN0QztpQkFBTTtnQkFDTCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDbkIsT0FBTyxFQUFFLENBQUM7YUFDWDtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUNELE9BQU87UUFDTCw0QkFBNEI7UUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQyxJQUFJLFFBQVEsRUFBRTtZQUNaLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDekM7YUFBTTtZQUNMLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQztDQUNGO0FBNUJELHNCQTRCQyJ9