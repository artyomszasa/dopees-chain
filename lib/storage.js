"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MemoryStorage {
    constructor() {
        this.data = {};
    }
    get(key) {
        return Promise.resolve(this.data[key]);
    }
    getObject(key) {
        return Promise.resolve(this.data[key]);
    }
    set(key, value) {
        this.data[key] = value;
        return Promise.resolve();
    }
    setObject(key, value) {
        this.data[key] = value;
        return Promise.resolve();
    }
    clear(key) {
        delete this.data[key];
        return Promise.resolve();
    }
}
exports.MemoryStorage = MemoryStorage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBWUEsTUFBYSxhQUFhO0lBQTFCO1FBQ21CLFNBQUksR0FBZSxFQUFFLENBQUE7SUFtQnhDLENBQUM7SUFsQkMsR0FBRyxDQUFDLEdBQVc7UUFDYixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRCxTQUFTLENBQUMsR0FBVztRQUNuQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRCxHQUFHLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDdkIsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUNELFNBQVMsQ0FBQyxHQUFXLEVBQUUsS0FBVTtRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUN2QixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQVc7UUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEIsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0IsQ0FBQztDQUNGO0FBcEJELHNDQW9CQyJ9